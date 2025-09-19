
'use server';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';


export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const requisitionId = params.id;
  try {
    const body = await request.json();
    const { userId } = body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'Committee_Member') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    const existingAssignment = await prisma.committeeAssignment.findUnique({
        where: {
            userId_requisitionId: {
                userId,
                requisitionId
            }
        }
    });

    if (existingAssignment) {
        await prisma.committeeAssignment.update({
            where: { id: existingAssignment.id },
            data: { scoresSubmitted: true }
        });
    } else {
        await prisma.committeeAssignment.create({
            data: {
                user: { connect: { id: userId } },
                requisition: { connect: { id: requisitionId } },
                scoresSubmitted: true,
            }
        });
    }

    await prisma.auditLog.create({
        data: {
            userId: user.id,
            role: user.role,
            action: 'SUBMIT_ALL_SCORES',
            entity: 'Requisition',
            entityId: requisitionId,
            details: `Finalized and submitted all scores for the requisition.`,
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
