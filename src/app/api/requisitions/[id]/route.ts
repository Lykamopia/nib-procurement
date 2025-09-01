
import { NextResponse } from 'next/server';
import { requisitions, auditLogs } from '@/lib/data-store';
import type { RequisitionStatus } from '@/lib/types';
import { users } from '@/lib/auth-store';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status, userId } = body;

    const requisitionIndex = requisitions.findIndex((r) => r.id === id);
    if (requisitionIndex === -1) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    const user = users.find(u => u.id === userId);
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const oldStatus = requisitions[requisitionIndex].status;
    requisitions[requisitionIndex].status = status as RequisitionStatus;
    requisitions[requisitionIndex].updatedAt = new Date();

    // Add to audit log
    auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date(),
        user: user.name,
        role: user.role,
        action: 'UPDATE_STATUS',
        entity: 'Requisition',
        entityId: id,
        details: `Changed status from "${oldStatus}" to "${status}"`,
    });

    return NextResponse.json(requisitions[requisitionIndex]);
  } catch (error) {
    console.error('Failed to update requisition:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
