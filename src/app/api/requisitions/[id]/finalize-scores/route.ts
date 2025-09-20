
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { users, auditLogs } from '@/lib/data-store';

async function tallyAndAwardScores(requisitionId: string, awardResponseDeadline?: Date) {
    const relevantQuotes = await prisma.quotation.findMany({
        where: { requisitionId },
    });

    if (relevantQuotes.length === 0) {
        return { success: true, message: "No quotes to score.", winner: 'N/A' };
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

    const winnerName = relevantQuotes[0]?.vendorName || 'N/A';
    
    return { success: true, message: "Scores tallied and awards processed.", winner: winnerName };
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
    
    auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date(),
        user: user.name,
        role: user.role,
        action: 'FINALIZE_SCORES',
        entity: 'Requisition',
        entityId: requisitionId,
        details: `Finalized scores and awarded contract to ${result.winner}.`,
    });

    return NextResponse.json({ message: 'Scores finalized and awards have been made.' });
  } catch (error) {
    console.error('Failed to finalize scores:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
