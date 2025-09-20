
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { users } from '@/lib/auth-store';

type RFQAction = 'update' | 'cancel';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const requisitionId = params.id;
    const body = await request.json();
    const { userId, action, reason, newDeadline } = body as {
      userId: string;
      action: RFQAction;
      reason: string;
      newDeadline?: string;
    };

    const user = users.find(u => u.id === userId);
    if (!user || user.role !== 'Procurement Officer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const requisition = await prisma.purchaseRequisition.findUnique({ where: { id: requisitionId }});
    if (!requisition) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    if (requisition.status !== 'RFQ In Progress') {
        return NextResponse.json({ error: 'This action is only available for requisitions with an active RFQ.' }, { status: 400 });
    }

    let updatedRequisition;

    switch (action) {
      case 'update':
        if (!newDeadline) {
          return NextResponse.json({ error: 'A new deadline is required for an update.' }, { status: 400 });
        }
        updatedRequisition = await prisma.purchaseRequisition.update({
            where: { id: requisitionId },
            data: { deadline: new Date(newDeadline) }
        });
        break;
      case 'cancel':
        await prisma.quotation.updateMany({ where: { requisitionId }, data: { status: 'Rejected' }});
        updatedRequisition = await prisma.purchaseRequisition.update({
            where: { id: requisitionId },
            data: { status: 'Approved', deadline: null }
        });
        break;
      default:
        return NextResponse.json({ error: 'Invalid action specified.' }, { status: 400 });
    }

    // auditLogs.unshift({ ... });

    return NextResponse.json({ message: 'RFQ successfully modified.', requisition: updatedRequisition });
  } catch (error) {
    console.error('Failed to manage RFQ:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
