
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { User } from '@/lib/types';


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

    const user: User | null = await prisma.user.findUnique({where: {id: userId}});
    if (!user) {
        return NextResponse.json({ error: 'User performing action not found.' }, { status: 404 });
    }
    
    // Authorization is now handled on the client-side based on settings.
    // The server just performs the action if the request is received.
    
    // Start a transaction to ensure atomicity
    const transactionResult = await prisma.$transaction(async (tx) => {

        const updatedRequisition = await tx.purchaseRequisition.update({
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

        const newAllMemberIds = new Set([...(financialCommitteeMemberIds || []), ...(technicalCommitteeMemberIds || [])]);
        const existingAssignments = await tx.committeeAssignment.findMany({
            where: { requisitionId: id },
        });

        const existingMemberIds = new Set(existingAssignments.map(a => a.userId));
        
        // Members to be removed
        const membersToRemove = existingAssignments.filter(a => !newAllMemberIds.has(a.userId));
        if (membersToRemove.length > 0) {
            await tx.committeeAssignment.deleteMany({
                where: {
                    requisitionId: id,
                    userId: { in: membersToRemove.map(m => m.userId) }
                }
            });
        }
        
        // Members to be added
        const membersToAdd = Array.from(newAllMemberIds).filter(memberId => !existingMemberIds.has(memberId));
        if (membersToAdd.length > 0) {
            await tx.committeeAssignment.createMany({
                data: membersToAdd.map(memberId => ({
                    userId: memberId,
                    requisitionId: id,
                    scoresSubmitted: false,
                })),
            });
        }
        
        // Unchanged members' status is preserved automatically by not touching them.

        await tx.auditLog.create({
            data: {
                transactionId: updatedRequisition.transactionId,
                timestamp: new Date(),
                user: { connect: { id: user.id } },
                action: 'ASSIGN_COMMITTEE',
                entity: 'Requisition',
                entityId: id,
                details: `Assigned/updated committee for requisition ${id}. Name: ${committeeName}.`,
            }
        });

        return updatedRequisition;
    });


    return NextResponse.json(transactionResult);

  } catch (error) {
    console.error('Failed to assign committee:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
