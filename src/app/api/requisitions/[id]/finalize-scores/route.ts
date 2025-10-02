

'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/services/email-service';
import { User, Vendor, Quotation, QuoteItem } from '@/lib/types';


async function tallyAndAwardScores(requisitionId: string, awardStrategy: 'all' | 'item', awards: any, awardResponseDeadline?: Date) {
    
    const allQuotesForReq = await prisma.quotation.findMany({
        where: { requisitionId },
        include: { 
            scores: { 
                include: { 
                    itemScores: true 
                } 
            },
            items: true,
        }
    });

    if (awardStrategy === 'all') {
        allQuotesForReq.forEach(quote => {
            let totalScore = 0;
            let scoredItemsCount = 0;
            quote.scores.forEach(scoreSet => {
                scoreSet.itemScores.forEach(itemScore => {
                    totalScore += itemScore.finalScore;
                    scoredItemsCount++;
                })
            })
             quote.finalAverageScore = scoredItemsCount > 0 ? totalScore / scoredItemsCount : 0;
        });

        allQuotesForReq.sort((a, b) => (b.finalAverageScore || 0) - (a.finalAverageScore || 0));
        
        allQuotesForReq.forEach((quote, index) => {
            if (index === 0) {
                awards[quote.vendorId] = {
                    vendorName: quote.vendorName,
                    items: quote.items.map(i => ({
                        requisitionItemId: i.requisitionItemId,
                        quoteItemId: i.id
                    }))
                };
            }
        });

    }
    
    const awardedQuoteItemIds = Object.values(awards).flatMap((award: any) => award.items.map((item: any) => item.quoteItemId));

    // Set all quotes to rejected initially, this will be overridden for winners/standby
    await prisma.quotation.updateMany({
        where: { requisitionId: requisitionId },
        data: { status: 'Rejected', rank: null }
    });
    
    const awardedVendorIds = new Set<string>(Object.keys(awards));

    for (const vendorId of awardedVendorIds) {
        const quote = allQuotesForReq.find(q => q.vendorId === vendorId);
        if (quote) {
             await prisma.quotation.update({
                where: { id: quote.id },
                data: { 
                    status: Object.keys(awards).length > 1 ? 'Partially_Awarded' : 'Awarded',
                    rank: 1 // All awarded get rank 1
                }
            });
        }
    }
    
    const standbyCandidates = allQuotesForReq
        .filter(q => !awardedVendorIds.has(q.vendorId))
        .sort((a,b) => (b.finalAverageScore || 0) - (a.finalAverageScore || 0));


    for (let i = 0; i < Math.min(2, standbyCandidates.length); i++) {
        await prisma.quotation.update({
            where: { id: standbyCandidates[i].id },
            data: { status: 'Standby', rank: (i + 2) as 2 | 3 }
        });
    }

    await prisma.purchaseRequisition.update({
      where: { id: requisitionId },
      data: {
        status: 'RFQ_In_Progress',
        awardResponseDeadline: awardResponseDeadline,
        awardedQuoteItemIds: awardedQuoteItemIds,
      }
    });

    return { success: true, message: "Scores tallied and awards processed." };
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const requisitionId = params.id;
  try {
    const body = await request.json();
    const { userId, awardResponseDeadline, awardStrategy, awards } = body;

    const user = await prisma.user.findUnique({where: {id: userId}});
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'Procurement_Officer') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    const requisition = await prisma.purchaseRequisition.findUnique({
        where: { id: requisitionId },
        include: { items: true },
    });
    if (!requisition) {
        return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    const result = await tallyAndAwardScores(requisitionId, awardStrategy, awards, awardResponseDeadline ? new Date(awardResponseDeadline) : undefined);

    if (!result.success) {
        throw new Error(result.message);
    }
    
    // Send emails to all awarded vendors
    const awardedVendorIds = Object.keys(awards);
    for (const vendorId of awardedVendorIds) {
         const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, include: { quotations: { include: { items: true }}}});
         if (vendor) {
              const awardDetails = awards[vendorId];
              const awardedQuoteItems = vendor.quotations
                .flatMap(q => q.items)
                .filter(item => awardDetails.items.some((i: any) => i.quoteItemId === item.id));

              
              const isPartialAward = awardedVendorIds.length > 1 || awardedQuoteItems.length < requisition.items.length;

              const itemsHtml = `<ul>${awardedQuoteItems.map(item => `<li>${item.name} (Qty: ${item.quantity})</li>`).join('')}</ul>`;

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
    
    await prisma.auditLog.create({
        data: {
            timestamp: new Date(),
            user: { connect: { id: user.id } },
            action: 'FINALIZE_SCORES',
            entity: 'Requisition',
            entityId: requisitionId,
            details: `Finalized scores and distributed awards for requisition ${requisitionId}.`,
        }
    });

    return NextResponse.json({ message: 'Scores finalized and awards have been made.' });
  } catch (error) {
    console.error('Failed to finalize scores:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
