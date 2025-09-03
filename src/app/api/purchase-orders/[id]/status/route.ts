
'use server';

import { NextResponse } from 'next/server';
import { auditLogs, purchaseOrders } from '@/lib/data-store';
import { users } from '@/lib/auth-store';
import { PurchaseOrderStatus } from '@/lib/types';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const poId = params.id;
    const body = await request.json();
    const { status, userId } = body;

    const validStatuses: PurchaseOrderStatus[] = ['On Hold', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid or unsupported status for manual update.' }, { status: 400 });
    }
    
    const user = users.find(u => u.id === userId);
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const poToUpdate = purchaseOrders.find(po => po.id === poId);
    if (!poToUpdate) {
        return NextResponse.json({ error: 'Purchase Order not found' }, { status: 404 });
    }

    const oldStatus = poToUpdate.status;
    poToUpdate.status = status as PurchaseOrderStatus;
    
    const auditLogEntry = {
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        user: user.name,
        role: user.role,
        action: 'UPDATE_PO_STATUS',
        entity: 'PurchaseOrder',
        entityId: poId,
        details: `Updated PO status from "${oldStatus}" to "${status}".`,
    };
    auditLogs.unshift(auditLogEntry);

    return NextResponse.json(poToUpdate);
  } catch (error) {
    console.error('Failed to update PO status:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
