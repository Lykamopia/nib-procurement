
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { tallyAndAwardScores } from '../finalize-scores/route';

async function findInitialApprover(totalValue: number) {
    // In a real app, this might be more dynamic
    const rolesAndLimits = [
        { role: 'President', limit: Infinity },
        { role: 'V/P Resources and Facilities', limit: 1000000 },
        { role: 'Director, Supply Chain', limit: 200000 },
        { role: 'Manager, Procurement Division', limit: 10000 },
    ];

    // Find the lowest role that can approve this amount
    let approverRole = 'Manager, Procurement Division';
    for (const { role, limit } of rolesAndLimits) {
        if (totalValue <= limit) {
            approverRole = role;
        } else {
            break; // Stop at the first role that can't approve
        }
    }
    
    // Find a user with that role. Simplified: finds the first one.
    const approver = await prisma.user.findFirst({
        where: { role: approverRole.replace(/ /g, '_') as any }
    });

    return approver;
}


export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const requisitionId = params.id;
  try {
    const body = await request.json();
    const { userId, recommendation, status } = body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const requisition = await prisma.purchaseRequisition.findUnique({ where: { id: requisitionId }});
    if (!requisition) {
        return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    const firstApprover = await findInitialApprover(requisition.totalPrice);
    if (!firstApprover) {
        return NextResponse.json({ error: 'Could not find a suitable final approver for this amount.' }, { status: 500 });
    }

    const updatedRequisition = await prisma.purchaseRequisition.update({
        where: { id: requisitionId },
        data: {
            status: 'Pending_Final_Approval',
            committeeRecommendation: recommendation,
            currentApproverId: firstApprover.id,
        }
    });

    await prisma.auditLog.create({
        data: {
            timestamp: new Date(),
            user: { connect: { id: user.id } },
            action: `SUBMIT_${status.replace('Pending_', '').replace('_', '_')}`,
            entity: 'Requisition',
            entityId: requisitionId,
            details: `Submitted recommendation: "${recommendation}". Routed to ${firstApprover.name} for final approval.`,
        }
    });

    return NextResponse.json(updatedRequisition);
  } catch (error) {
    console.error('Failed to submit recommendation:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}

    