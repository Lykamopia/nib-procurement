
'use server';

import { NextResponse } from 'next/server';
import { auditLogs, quotations, requisitions } from '@/lib/data-store';
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

    const requisition = requisitions.find(r => r.id === requisitionId);
    if (!requisition) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    if (requisition.status !== 'RFQ In Progress') {
        return NextResponse.json({ error: 'This action is only available for requisitions with an active RFQ.' }, { status: 400 });
    }

    let auditDetails = '';

    switch (action) {
      case 'update':
        if (!newDeadline) {
          return NextResponse.json({ error: 'A new deadline is required for an update.' }, { status: 400 });
        }
        const oldDeadline = requisition.deadline ? new Date(requisition.deadline).toISOString() : 'N/A';
        requisition.deadline = new Date(newDeadline);
        auditDetails = `Updated RFQ deadline to ${newDeadline}. Reason: ${reason}`;
        break;

      case 'cancel':
        requisition.status = 'Approved';
        requisition.deadline = undefined;
        // Also reject any quotes that may have been submitted.
        quotations.forEach(q => {
            if (q.requisitionId === requisitionId) {
                q.status = 'Rejected';
            }
        });
        auditDetails = `Cancelled RFQ. Reason: ${reason}. Requisition status reverted to Approved.`;
        break;

      default:
        return NextResponse.json({ error: 'Invalid action specified.' }, { status: 400 });
    }
    
    requisition.updatedAt = new Date();

    const auditLogEntry = {
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        user: user.name,
        role: user.role,
        action: 'MANAGE_RFQ' as const,
        entity: 'Requisition',
        entityId: requisitionId,
        details: auditDetails,
    };
    auditLogs.unshift(auditLogEntry);

    return NextResponse.json({ message: 'RFQ successfully modified.', requisition });
  } catch (error) {
    console.error('Failed to manage RFQ:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
