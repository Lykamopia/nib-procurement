
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { users } from '@/lib/data-store';
import { sendEmail } from '@/services/email-service';
import { Vendor } from '@/lib/types';

async function tallyAndAwardScores(requisitionId: string, awardResponseDeadline?: Date) {
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

    const winner = relevantQuotes[0] ? relevantQuotes[0].vendor : null;
    
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
    
    const requisition = await prisma.purchaseRequisition.findUnique({
        where: { id: requisitionId }
    });
    if (!requisition) {
        return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    const result = await tallyAndAwardScores(requisitionId, awardResponseDeadline ? new Date(awardResponseDeadline) : undefined);

    if (!result.success) {
        throw new Error(result.message);
    }
    
    if (result.winner) {
        const winner = result.winner as Vendor;
        const emailHtml = `
            <h1>Congratulations, ${winner.name}!</h1>
            <p>You have been awarded the contract for requisition <strong>${requisition.title}</strong>.</p>
            <p>Please log in to the vendor portal to accept or decline this award.</p>
            <a href="http://localhost:9002/vendor/dashboard">Go to Vendor Portal</a>
            <p>Thank you,</p>
            <p>Nib InternationalBank Procurement</p>
        `;

        await sendEmail({
            to: winner.email,
            subject: `Contract Awarded: ${requisition.title}`,
            html: emailHtml
        });
    }
    
    await prisma.auditLog.create({
        data: {
            timestamp: new Date(),
            user: { connect: { id: user.id } },
            action: 'FINALIZE_SCORES',
            entity: 'Requisition',
            entityId: requisitionId,
            details: `Finalized scores and awarded contract to ${result.winner?.name || 'N/A'}.`,
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
