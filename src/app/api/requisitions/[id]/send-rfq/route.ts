
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { users } from '@/lib/auth-store';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { userId, vendorIds, scoringDeadline, deadline, cpoAmount } = body;

    const requisition = await prisma.purchaseRequisition.findUnique({ where: { id }});
    if (!requisition) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    const user = users.find(u => u.id === userId);
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (requisition.status !== 'Approved') {
        return NextResponse.json({ error: 'Requisition must be approved before sending RFQ.' }, { status: 400 });
    }

    const updatedRequisition = await prisma.purchaseRequisition.update({
        where: { id },
        data: {
            status: 'RFQ In Progress',
            allowedVendorIds: vendorIds, // Note: This field may need to be adjusted based on the prisma schema
            scoringDeadline: scoringDeadline ? new Date(scoringDeadline) : undefined,
            deadline: deadline ? new Date(deadline) : undefined,
            cpoAmount: cpoAmount,
        }
    });

    // auditLogs.unshift({ ... });

    return NextResponse.json(updatedRequisition);

  } catch (error) {
    console.error('Failed to send RFQ:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
