
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { User } from '@/lib/types';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const requisitionId = params.id;
  try {
    const body = await request.json();
    const { userId, recommendation } = body;

    const user: User | null = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || (user.role !== 'Committee_A_Member' && user.role !== 'Committee_B_Member')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const requisition = await prisma.purchaseRequisition.findUnique({
        where: { id: requisitionId },
        include: { requester: { include: { manager: true } } }
    });
    if (!requisition) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }
    
    // Check if the winning quote exists
    const winningQuote = await prisma.quotation.findFirst({
        where: { requisitionId: requisitionId, rank: 1 }
    });
    if (!winningQuote) {
        return NextResponse.json({ error: 'Winning quote not found.' }, { status: 400 });
    }

    // Save the recommendation
    await prisma.committeeRecommendation.create({
        data: {
            requisition: { connect: { id: requisitionId } },
            user: { connect: { id: userId } },
            committeeRole: user.role,
            recommendation,
        }
    });

    // All committee reviews are done, now escalate for final financial approval
    // In a real system, the starting point of this hierarchy would be more complex
    // For now, let's assume it goes to the Procurement Officer's manager if one exists
    const poOfficer = await prisma.user.findFirst({where: {role: 'Procurement_Officer'}});
    let finalApproverId = poOfficer?.managerId || poOfficer?.id; // Fallback to PO if no manager

    const updatedRequisition = await prisma.purchaseRequisition.update({
      where: { id: requisitionId },
      data: {
        status: 'Pending_Final_Approval',
        currentApproverId: finalApproverId,
      },
    });

    await prisma.auditLog.create({
        data: {
            timestamp: new Date(),
            user: { connect: { id: user.id } },
            action: 'SUBMIT_RECOMMENDATION',
            entity: 'Requisition',
            entityId: requisitionId,
            details: `Submitted recommendation from ${user.role}. Requisition now pending final approval.`,
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


    