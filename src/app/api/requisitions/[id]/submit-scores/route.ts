
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const requisitionId = params.id;
  try {
    const body = await request.json();
    const { userId } = body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true }
    });
    
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const authorizedRoles = ['Committee Member', 'Committee_Member'];
    if (!user.role || !authorizedRoles.includes(user.role.name)) {
        return NextResponse.json({ error: 'Unauthorized to submit final scores.' }, { status: 403 });
    }
    
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

    const requisition = await prisma.purchaseRequisition.findUnique({ where: { id: requisitionId }});

    await prisma.auditLog.create({
        data: {
            transactionId: requisition?.transactionId,
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
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
