
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { RequisitionStatus } from '@prisma/client';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { userId, vendorIds, scoringDeadline, deadline, cpoAmount } = body;

    const requisition = await prisma.purchaseRequisition.findUnique({ where: { id } });
    if (!requisition) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (requisition.status !== 'Approved') {
        return NextResponse.json({ error: 'Requisition must be approved before sending RFQ.' }, { status: 400 });
    }

    const updatedRequisition = await prisma.purchaseRequisition.update({
        where: { id },
        data: {
            status: 'RFQ_In_Progress',
            allowedVendorIds: vendorIds,
            scoringDeadline: scoringDeadline ? new Date(scoringDeadline) : undefined,
            deadline: deadline ? new Date(deadline) : undefined,
            cpoAmount: cpoAmount,
            updatedAt: new Date(),
        }
    });

    let auditDetails = vendorIds === 'all' 
        ? `Sent RFQ to all vendors.`
        : `Sent RFQ to selected vendors: ${vendorIds.join(', ')}.`;
    
    if (cpoAmount) {
        auditDetails += ` CPO of ${cpoAmount} ETB required.`;
    }

    await prisma.auditLog.create({
        data: {
            userId: user.id,
            role: user.role,
            action: 'SEND_RFQ',
            entity: 'Requisition',
            entityId: id,
            details: auditDetails,
        }
    });

    return NextResponse.json(updatedRequisition);

  } catch (error) {
    console.error('Failed to send RFQ:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
