

'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { users } from '@/lib/data-store';
import { sendEmail } from '@/services/email-service';
import { Vendor } from '@/lib/types';


async function tallyAndAwardScores(requisitionId: string, awardStrategy: 'all' | 'item', awards: any, awardResponseDeadline?: Date) {
    
    // Set all quotes to rejected initially, this will be overridden for winners/standby
    await prisma.quotation.updateMany({
        where: { requisitionId: requisitionId },
        data: { status: 'Rejected', rank: null }
    });
    
    const awardedVendorIds = new Set<string>();

    if (awardStrategy === 'all') { // Award all items to one vendor
        const winnerVendorId = Object.keys(awards)[0];
        if(winnerVendorId) {
            awardedVendorIds.add(winnerVendorId);
            const winnerQuote = await prisma.quotation.findFirst({
                where: { requisitionId, vendorId: winnerVendorId }
            });
            
            if (winnerQuote) {
                await prisma.quotation.update({
                    where: { id: winnerQuote.id },
                    data: { status: 'Awarded', rank: 1 }
                });
            }
        }
    } else { // Award items individually
        const vendorIds = Object.keys(awards);
        for (const vendorId of vendorIds) {
            awardedVendorIds.add(vendorId);
            const quote = await prisma.quotation.findFirst({
                where: { requisitionId, vendorId }
            });
            if (quote) {
                await prisma.quotation.update({
                    where: { id: quote.id },
                    data: { status: 'Partially_Awarded' }
                });
            }
        }
    }
    
    // Set other high-ranking quotes to Standby
    const allQuotes = await prisma.quotation.findMany({
        where: { 
            requisitionId: requisitionId,
            vendorId: { notIn: Array.from(awardedVendorIds) }
        },
        orderBy: { finalAverageScore: 'desc' },
        select: { id: true, status: true }
    });

    for (let i = 0; i < Math.min(2, allQuotes.length); i++) {
        await prisma.quotation.update({
            where: { id: allQuotes[i].id },
            data: { status: 'Standby', rank: (i + 2) as 2 | 3 }
        });
    }

    await prisma.purchaseRequisition.update({
      where: { id: requisitionId },
      data: {
        status: 'RFQ_In_Progress',
        awardResponseDeadline: awardResponseDeadline,
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

    const user = users.find(u => u.id === userId);
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'Procurement Officer') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    const requisition = await prisma.purchaseRequisition.findUnique({
        where: { id: requisitionId }
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
         const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }});
         if (vendor) {
              const emailHtml = `
                <h1>Congratulations, ${vendor.name}!</h1>
                <p>You have been awarded one or more items for requisition <strong>${requisition.title}</strong>.</p>
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

