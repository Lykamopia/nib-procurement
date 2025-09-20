
'use server';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { 
        userId, 
        financialCommitteeMemberIds, 
        technicalCommitteeMemberIds,
        committeeName, 
        committeePurpose, 
        scoringDeadline 
    } = body;

    const requisition = await prisma.purchaseRequisition.findUnique({ where: { id } });
    if (!requisition) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || (user.role !== 'Procurement_Officer' && user.role !== 'Admin')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const updatedRequisition = await prisma.purchaseRequisition.update({
        where: { id },
        data: {
            financialCommitteeMembers: { set: financialCommitteeMemberIds.map((id: string) => ({ id })) },
            technicalCommitteeMembers: { set: technicalCommitteeMemberIds.map((id: string) => ({ id })) },
            committeeName,
            committeePurpose,
            scoringDeadline: scoringDeadline ? new Date(scoringDeadline) : undefined,
            updatedAt: new Date()
        }
    });

    const allMemberIds = [...new Set([...(financialCommitteeMemberIds || []), ...(technicalCommitteeMemberIds || [])])];
    
    // First, clear existing non-submitted assignments for this requisition
    await prisma.committeeAssignment.deleteMany({
      where: {
        requisitionId: id,
        scoresSubmitted: false
      }
    });

    // Then, create new assignments for the selected members if they don't already have a submitted score
    for (const memberId of allMemberIds) {
      const existingAssignment = await prisma.committeeAssignment.findUnique({
        where: {
          userId_requisitionId: {
            userId: memberId,
            requisitionId: id,
          },
        },
      });

      if (!existingAssignment) {
        await prisma.committeeAssignment.create({
          data: {
            userId: memberId,
            requisitionId: id,
            scoresSubmitted: false,
          },
        });
      }
    }

    const committeeMembers = await prisma.user.findMany({
        where: { id: { in: allMemberIds } },
        select: { name: true }
    });
    const committeeNames = committeeMembers.map(u => u.name);

    await prisma.auditLog.create({
        data: {
            userId: user.id,
            role: user.role,
            action: 'ASSIGN_COMMITTEE',
            entity: 'Requisition',
            entityId: id,
            details: `Assigned committee "${committeeName}" with members: ${committeeNames.join(', ')}.`,
        }
    });

    return NextResponse.json(updatedRequisition);

  } catch (error) {
    console.error('Failed to assign committee:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
