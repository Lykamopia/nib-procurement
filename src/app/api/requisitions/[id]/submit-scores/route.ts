
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { users } from '@/lib/data-store';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const requisitionId = params.id;
  try {
    const body = await request.json();
    const { userId } = body;

    const user = users.find(u => u.id === userId);
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'Committee Member') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Using upsert to handle cases where the assignment might not exist yet, though it should.
    await prisma.committeeAssignment.upsert({
      where: {
        userId_requisitionId: {
          userId: userId,
          requisitionId: requisitionId,
        }
      },
      update: { scoresSubmitted: true },
      create: {
        userId: userId,
        requisitionId: requisitionId,
        scoresSubmitted: true,
      },
    });

    await prisma.auditLog.create({
        data: {
            timestamp: new Date(),
            user: { connect: { id: user.id } },
            action: 'SUBMIT_SCORES',
            entity: 'Requisition',
            entityId: requisitionId,
            details: `Finalized and submitted all scores for requisition.`,
        }
    });

    return NextResponse.json({ message: 'All scores have been successfully submitted.' });
  } catch (error) {
    console.error('Failed to submit final scores:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
