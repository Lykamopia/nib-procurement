
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { users } from '@/lib/data-store';

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
        scoringDeadline,
        rfqSettings 
    } = body;

    const requisition = await prisma.purchaseRequisition.findUnique({ where: { id } });
    if (!requisition) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    const user = users.find(u => u.id === userId);
    if (!user || (user.role !== 'Procurement Officer' && user.role !== 'Committee')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const updatedRequisition = await prisma.purchaseRequisition.update({
      where: { id },
      data: {
        committeeName,
        committeePurpose,
        scoringDeadline: scoringDeadline ? new Date(scoringDeadline) : undefined,
        rfqSettings: rfqSettings || {},
        financialCommitteeMembers: {
          set: financialCommitteeMemberIds.map((id: string) => ({ id }))
        },
        technicalCommitteeMembers: {
          set: technicalCommitteeMemberIds.map((id: string) => ({ id }))
        }
      }
    });

    const allMemberIds = [...(financialCommitteeMemberIds || []), ...(technicalCommitteeMemberIds || [])];
    const uniqueMemberIds = [...new Set(allMemberIds)];

    // Clear old assignments for this requisition
    await prisma.committeeAssignment.deleteMany({
      where: { requisitionId: id },
    });

    // Create new assignments
    if (uniqueMemberIds.length > 0) {
        await prisma.committeeAssignment.createMany({
            data: uniqueMemberIds.map(memberId => ({
                userId: memberId,
                requisitionId: id,
                scoresSubmitted: false,
            })),
            skipDuplicates: true, // In case of any race conditions
        });
    }

    await prisma.auditLog.create({
        data: {
            timestamp: new Date(),
            user: { connect: { id: user.id } },
            action: 'ASSIGN_COMMITTEE',
            entity: 'Requisition',
            entityId: id,
            details: `Assigned/updated committee for requisition ${id}. Name: ${committeeName}.`,
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

    