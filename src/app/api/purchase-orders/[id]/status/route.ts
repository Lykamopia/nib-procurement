
'use server';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { PurchaseOrderStatus } from '@prisma/client';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const poId = params.id;
    const body = await request.json();
    const { status, userId } = body;

    const validStatuses: PurchaseOrderStatus[] = ['On_Hold', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid or unsupported status for manual update.' }, { status: 400 });
    }
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const poToUpdate = await prisma.purchaseOrder.findUnique({ where: { id: poId } });
    if (!poToUpdate) {
        return NextResponse.json({ error: 'Purchase Order not found' }, { status: 404 });
    }

    const oldStatus = poToUpdate.status;
    const updatedPo = await prisma.purchaseOrder.update({
        where: { id: poId },
        data: { status: status as PurchaseOrderStatus }
    });
    
    await prisma.auditLog.create({
        data: {
            userId: user.id,
            role: user.role,
            action: 'UPDATE_PO_STATUS',
            entity: 'PurchaseOrder',
            entityId: poId,
            details: `Updated PO status from "${oldStatus}" to "${status}".`,
        }
    });

    return NextResponse.json(updatedPo);
  } catch (error) {
    console.error('Failed to update PO status:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
