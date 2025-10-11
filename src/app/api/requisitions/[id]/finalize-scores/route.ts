

'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/services/email-service';
import { Vendor, Quotation, QuoteItem, User } from '@/lib/types';
import { differenceInMinutes } from 'date-fns';


export async function tallyAndAwardScores(
    requisitionId: string, 
    awardResponseDeadline?: Date,
    actor?: User | null
) {
    
    const allQuotesForReq = await prisma.quotation.findMany({
        where: { requisitionId },
        include: { 
            scores: { 
                include: { 
                    itemScores: {
                         include: {
                            financialScores: true,
                            technicalScores: true
                        }
                    }
                } 
            },
            items: true,
        }
    });

    if (allQuotesForReq.length === 0) {
        throw new Error("No quotes found for this requisition to score or award.");
    }

    let awards: any = {};
    
    // Calculate final average score for each quote
    allQuotesForReq.forEach(quote => {
        if (!quote.scores || quote.scores.length === 0) {
            quote.finalAverageScore = 0;
            return;
        }
        const totalScorers = quote.scores.length;
        const aggregateScore = quote.scores.reduce((sum, scoreSet) => sum + scoreSet.finalScore, 0);
        quote.finalAverageScore = aggregateScore / totalScorers;
    });

    // Award all to single winner
    const sortedByScore = allQuotesForReq.sort((a, b) => (b.finalAverageScore || 0) - (a.finalAverageScore || 0));
    if (sortedByScore.length > 0) {
        const winner = sortedByScore[0];
        awards[winner.vendorId] = {
            vendorName: winner.vendorName,
            items: winner.items.map(i => ({
                requisitionItemId: i.requisitionItemId,
                quoteItemId: i.id
            }))
        };
    }
    
    const awardedVendorIds = Object.keys(awards);
    if (awardedVendorIds.length === 0) {
        throw new Error("No vendor was awarded. Cannot proceed.");
    }
    
    let totalAwardValue = 0;
    awardedVendorIds.forEach(vendorId => {
        const quote = allQuotesForReq.find(q => q.vendorId === vendorId);
        const awardedItems = (awards[vendorId] as any).items.map((i: any) => i.quoteItemId);
        if (quote) {
            quote.items.forEach(item => {
                if (awardedItems.includes(item.id)) {
                    totalAwardValue += item.quantity * item.unitPrice;
                }
            });
        }
    });
    
    const committeeConfig = { A: { min: 200001, max: Infinity }, B: { min: 10000, max: 200000 } };
    let nextStatus: any = 'Approved'; // Default for < 10k
    
    if (totalAwardValue >= committeeConfig.B.min && totalAwardValue <= committeeConfig.B.max) {
        nextStatus = 'Pending_Committee_B_Review';
    } else if (totalAwardValue >= committeeConfig.A.min) {
        nextStatus = 'Pending_Committee_A_Recommendation';
    }

    if (nextStatus !== 'Approved') {
         await prisma.purchaseRequisition.update({
            where: { id: requisitionId },
            data: { status: nextStatus, totalPrice: totalAwardValue }
        });
        return { success: true, message: `Scores tallied. Requisition sent for ${nextStatus.replace(/_/g, ' ')}.`, escalated: true };
    }

    // --- PROCEED WITH DIRECT AWARD FOR LOW-VALUE ITEMS ---

    const awardedQuoteItemIds = Object.values(awards).flatMap((award: any) => award.items.map((item: any) => item.quoteItemId));

    // Set all quotes to rejected initially, this will be overridden for winners/standby
    await prisma.quotation.updateMany({
        where: { requisitionId: requisitionId },
        data: { status: 'Rejected', rank: null }
    });
    

    for (const vendorId of awardedVendorIds) {
        const quote = allQuotesForReq.find(q => q.vendorId === vendorId);
        if (quote) {
             const awardedItemsForThisVendor = quote.items.filter(i => 
                (awards[vendorId] as any).items.some((awarded: any) => awarded.quoteItemId === i.id)
             );
             const requisition = await prisma.purchaseRequisition.findUnique({where: {id: requisitionId}, include: {items: true}});
             const isPartial = awardedVendorIds.length > 1 || awardedItemsForThisVendor.length < (requisition?.items.length ?? 0);

             await prisma.quotation.update({
                where: { id: quote.id },
                data: { 
                    status: isPartial ? 'Partially_Awarded' : 'Awarded',
                    rank: 1 // All awarded get rank 1
                }
            });
        }
    }
    
    const standbyCandidates = allQuotesForReq
        .filter(q => !awardedVendorIds.includes(q.vendorId))
        .sort((a,b) => (b.finalAverageScore || 0) - (a.finalAverageScore || 0));


    for (let i = 0; i < Math.min(2, standbyCandidates.length); i++) {
        await prisma.quotation.update({
            where: { id: standbyCandidates[i].id },
            data: { status: 'Standby', rank: (i + 2) as 2 | 3 }
        });
    }

    const awardResponseDurationMinutes = awardResponseDeadline
        ? differenceInMinutes(awardResponseDeadline, new Date())
        : undefined;

    await prisma.purchaseRequisition.update({
      where: { id: requisitionId },
      data: {
        status: 'RFQ_In_Progress', // This implies vendors are being notified
        awardResponseDeadline: awardResponseDeadline,
        awardResponseDurationMinutes,
        awardedQuoteItemIds: awardedQuoteItemIds,
        currentApproverId: null, // Clear the approver once awarded
      }
    });
    
     // Send emails to all awarded vendors
    const requisition = await prisma.purchaseRequisition.findUnique({where: { id: requisitionId }, include: {items: true}});
    for (const vendorId of awardedVendorIds) {
         const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, include: { quotations: { include: { items: true }}}});
         if (vendor && requisition) {
              const awardDetails = awards[vendorId];
              const awardedQuoteItems = vendor.quotations
                .flatMap(q => q.items)
                .filter(item => awardDetails.items.some((i: any) => i.quoteItemId === item.id));

              
              const isPartialAward = awardedVendorIds.length > 1 || awardedQuoteItems.length < requisition.items.length;

              const itemsHtml = `
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #f2f2f2;">
                            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Item Name</th>
                            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Brand/Model</th>
                            <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Quantity</th>
                            <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Unit Price</th>
                            <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Total Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${awardedQuoteItems.map(item => `
                            <tr>
                                <td style="padding: 8px; border: 1px solid #ddd;">${item.name}</td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${item.brandDetails || 'N/A'}</td>
                                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.quantity}</td>
                                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.unitPrice.toFixed(2)} ETB</td>
                                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${(item.quantity * item.unitPrice).toFixed(2)} ETB</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
              `;

              const emailHtml = `
                <h1>Congratulations, ${vendor.name}!</h1>
                <p>You have been ${isPartialAward ? 'partially awarded' : 'awarded'} the contract for requisition <strong>${requisition.title}</strong>.</p>
                <p>The following item(s) have been awarded to you:</p>
                ${itemsHtml}
                <p>Please log in to the vendor portal to review the award and respond.</p>
                <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002'}/vendor/dashboard">Go to Vendor Portal</a>
                <p>Thank you,</p>
                <p>Nib InternationalBank Procurement</p>
            `;

            await sendEmail({
                to: vendor.email,
                subject: `Contract Awarded: ${requisition.title}`,
                html: emailHtml
            });
         }
    }

    return { success: true, message: "Scores tallied and awards processed for low-value item.", escalated: false };
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const requisitionId = params.id;
  try {
    const body = await request.json();
    const { userId, awardResponseDeadline } = body;

    const user: User | null = await prisma.user.findUnique({where: {id: userId}});
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'Procurement_Officer' && user.role !== 'Admin' && user.role !== 'Committee') {
        return NextResponse.json({ error: 'Unauthorized to finalize awards.' }, { status: 403 });
    }
    
    const result = await tallyAndAwardScores(
        requisitionId, 
        awardResponseDeadline ? new Date(awardResponseDeadline) : undefined,
        user
    );

    if (!result.success) {
        throw new Error(result.message);
    }
    
    await prisma.auditLog.create({
        data: {
            timestamp: new Date(),
            user: { connect: { id: user.id } },
            action: 'FINALIZE_SCORES',
            entity: 'Requisition',
            entityId: requisitionId,
            details: `Finalized scores for requisition ${requisitionId}. Result: ${result.message}`,
        }
    });

    return NextResponse.json({ message: result.message });
  } catch (error) {
    console.error('Failed to finalize scores:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}

    