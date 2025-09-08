
import { NextResponse } from 'next/server';
import { requisitions, auditLogs } from '@/lib/data-store';
import { users } from '@/lib/auth-store';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { userId, vendorIds, scoringDeadline, deadline } = body;

    const requisition = requisitions.find((r) => r.id === id);
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

    requisition.status = 'RFQ In Progress';
    requisition.allowedVendorIds = vendorIds;
    requisition.scoringDeadline = scoringDeadline ? new Date(scoringDeadline) : undefined;
    requisition.deadline = deadline ? new Date(deadline) : undefined;
    requisition.updatedAt = new Date();

    const auditDetails = vendorIds === 'all' 
        ? `Sent RFQ to all vendors.`
        : `Sent RFQ to selected vendors: ${vendorIds.join(', ')}.`;

    const auditLogEntry = {
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        user: user.name,
        role: user.role,
        action: 'SEND_RFQ',
        entity: 'Requisition',
        entityId: id,
        details: auditDetails,
    };
    auditLogs.unshift(auditLogEntry);

    return NextResponse.json(requisition);

  } catch (error) {
    console.error('Failed to send RFQ:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
