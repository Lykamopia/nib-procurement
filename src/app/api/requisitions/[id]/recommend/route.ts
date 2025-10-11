
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
    const { userId, recommendation, comment } = body;

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

    // Save the recommendation
    await prisma.committeeRecommendation.create({
        data: {
            requisition: { connect: { id: requisitionId } },
            user: { connect: { id: userId } },
            committeeRole: user.role,
            recommendation,
            comment,
        }
    });
    
    let nextStatus: any = 'Pending_Final_Approval';
    let nextApproverId: string | null | undefined = requisition.requester?.manager?.id;
    let auditDetails = `Submitted recommendation for requisition ${requisitionId}. Recommendation: ${recommendation}.`;
    
    if (recommendation === 'Recommend for Approval') {
        const poOfficer = await prisma.user.findFirst({where: {role: 'Procurement_Officer'}});
        nextApproverId = poOfficer?.managerId || poOfficer?.id; // Fallback to PO if no manager
        auditDetails += ` Requisition now pending final approval from management.`
    } else {
        // 'Request Changes' - send back to Procurement Officer
        const poOfficer = await prisma.user.findFirst({where: {role: 'Procurement_Officer'}});
        nextStatus = 'Approved'; // Reset to a state where PO can re-evaluate
        nextApproverId = poOfficer?.id;
        auditDetails += ` Changes requested. Requisition returned to Procurement Officer.`
    }


    const updatedRequisition = await prisma.purchaseRequisition.update({
      where: { id: requisitionId },
      data: {
        status: nextStatus,
        currentApproverId: nextApproverId,
      },
    });

    await prisma.auditLog.create({
        data: {
            timestamp: new Date(),
            user: { connect: { id: user.id } },
            action: 'SUBMIT_RECOMMENDATION',
            entity: 'Requisition',
            entityId: requisitionId,
            details: auditDetails,
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
