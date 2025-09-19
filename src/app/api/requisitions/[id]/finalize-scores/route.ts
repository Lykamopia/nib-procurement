
'use server';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { tallyAndAwardScores } from '@/services/scoring-service';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const requisitionId = params.id;
  try {
    const body = await request.json();
    const { userId, awardResponseDeadline, awardResponseDurationMinutes } = body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'Procurement_Officer' && user.role !== 'Committee') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const result = await tallyAndAwardScores(requisitionId, awardResponseDeadline ? new Date(awardResponseDeadline) : undefined, awardResponseDurationMinutes);

    if (!result.success) {
        throw new Error(result.message);
    }
    
    await prisma.auditLog.create({
        data: {
            userId: user.id,
            role: user.role,
            action: 'FINALIZE_SCORES',
            entity: 'Requisition',
            entityId: requisitionId,
            details: `Finalized scores and awarded quotes. Winner: ${result.winner}.`,
        }
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
