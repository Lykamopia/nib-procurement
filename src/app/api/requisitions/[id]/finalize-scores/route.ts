
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { users } from '@/lib/data-store';
import { sendEmailFlow } from '@/ai/flows/send-email-flow';

async function tallyAndAwardScores(requisitionId: string, awardResponseDeadline?: Date) {
    const requisition = await prisma.purchaseRequisition.findUnique({
        where: { id: requisitionId },
    });

    if (!requisition) {
        throw new Error("Requisition not found during score finalization.");
    }
    
    const relevantQuotes = await prisma.quotation.findMany({
        where: { requisitionId },
        include: { vendor: true }
    });

    if (relevantQuotes.length === 0) {
        return { success: true, message: "No quotes to score.", winner: null };
    }
    
    // Sort quotes by final average score, descending
    relevantQuotes.sort((a, b) => (b.finalAverageScore || 0) - (a.finalAverageScore || 0));

    // Award, Standby, Reject
    for (let i = 0; i < relevantQuotes.length; i++) {
        const quote = relevantQuotes[i];
        let status: 'Awarded' | 'Standby' | 'Rejected' = 'Rejected';
        let rank: 1 | 2 | 3 | undefined = undefined;

        if (i === 0) {
            status = 'Awarded';
            rank = 1;
        } else if (i === 1) {
            status = 'Standby';
            rank = 2;
        } else if (i === 2) {
            status = 'Standby';
            rank = 3;
        }

        await prisma.quotation.update({
            where: { id: quote.id },
            data: { status, rank }
        });
    }
    
    await prisma.purchaseRequisition.update({
      where: { id: requisitionId },
      data: {
        status: 'RFQ_In_Progress',
        awardResponseDeadline: awardResponseDeadline,
      }
    });

    const winner = relevantQuotes[0] || null;
    
    return { success: true, message: "Scores tallied and awards processed.", winner };
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const requisitionId = params.id;
  try {
    const body = await request.json();
    const { userId, awardResponseDeadline } = body;

    const user = users.find(u => u.id === userId);
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'Procurement Officer' && user.role !== 'Committee') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    const result = await tallyAndAwardScores(requisitionId, awardResponseDeadline ? new Date(awardResponseDeadline) : undefined);

    if (!result.success) {
        throw new Error(result.message);
    }

    const winnerName = result.winner?.vendorName || 'N/A';
    
    await prisma.auditLog.create({
        data: {
            timestamp: new Date(),
            user: { connect: { id: user.id } },
            action: 'FINALIZE_SCORES',
            entity: 'Requisition',
            entityId: requisitionId,
            details: `Finalized scores and awarded contract to ${winnerName}.`,
        }
    });

    // Send email notification to the winner
    if (result.winner) {
        const requisition = await prisma.purchaseRequisition.findUnique({ where: { id: requisitionId }});
        const vendor = result.winner.vendor;
        if (vendor && vendor.email && requisition) {
            const emailHtml = `
                <h1>Congratulations, ${vendor.name}!</h1>
                <p>You have been awarded the contract for the requisition: <strong>${requisition.title}</strong>.</p>
                <p>Please log in to your vendor portal to review the award and take the next steps.</p>
                <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002'}/vendor/requisitions/${requisitionId}">Click here to view the award</a>
                <p>Thank you for your submission.</p>
                <p>Sincerely,<br/>The Nib Procurement Team</p>
            `;
            
            await sendEmailFlow({
                to: vendor.email,
                subject: `You've Been Awarded a Contract for: ${requisition.title}`,
                html: emailHtml,
            });

             await prisma.auditLog.create({
                data: {
                    timestamp: new Date(),
                    action: 'AWARD_NOTIFICATION_SENT',
                    entity: 'Vendor',
                    entityId: vendor.id,
                    details: `Sent award notification email to ${vendor.name} at ${vendor.email}.`,
                }
            });
        }
    }


    return NextResponse.json({ message: 'Scores finalized and awards have been made.' });
  } catch (error) {
    console.error('Failed to finalize scores:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
