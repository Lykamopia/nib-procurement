

import { NextResponse } from 'next/server';
import { purchaseOrders, goodsReceipts, auditLogs } from '@/lib/data-store';
import { users } from '@/lib/auth-store';
import { GoodsReceiptNote, PurchaseOrderStatus } from '@/lib/types';

export async function POST(request: Request) {
  console.log('POST /api/receipts - Creating new goods receipt.');
  try {
    const body = await request.json();
    console.log('Request body:', body);
    const { purchaseOrderId, userId, items } = body;

    const user = users.find(u => u.id === userId);
    if (!user) {
        console.error('User not found for ID:', userId);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const po = purchaseOrders.find(p => p.id === purchaseOrderId);
    if (!po) {
      console.error('Purchase Order not found for ID:', purchaseOrderId);
      return NextResponse.json({ error: 'Purchase Order not found' }, { status: 404 });
    }
    console.log('Found PO to receive against:', po);

    const newReceipt: GoodsReceiptNote = {
      id: `GRN-${Date.now()}`,
      purchaseOrderId,
      receivedById: userId,
      receivedBy: user.name,
      receivedDate: new Date(),
      items: items,
    };
    
    goodsReceipts.unshift(newReceipt);
    if (!po.receipts) {
        po.receipts = [];
    }
    po.receipts.push(newReceipt);
    console.log('Created new GRN:', newReceipt);

    let allItemsDelivered = true;
    po.items.forEach(poItem => {
        const receivedItem = items.find((i: { poItemId: string; }) => i.poItemId === poItem.id);
        if (receivedItem) {
            poItem.receivedQuantity = (poItem.receivedQuantity || 0) + receivedItem.quantityReceived;
        }
        if (poItem.receivedQuantity < poItem.quantity) {
            allItemsDelivered = false;
        }
    });

    po.status = allItemsDelivered ? 'Delivered' : 'Partially Delivered';
    console.log(`Updated PO ${po.id} status to ${po.status}`);

    const auditLogEntry = {
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        user: user.name,
        role: user.role,
        action: 'RECEIVE_GOODS',
        entity: 'PurchaseOrder',
        entityId: po.id,
        details: `Created Goods Receipt Note ${newReceipt.id}. PO status: ${po.status}.`,
    };
    auditLogs.unshift(auditLogEntry);
    console.log('Added audit log:', auditLogEntry);

    return NextResponse.json(newReceipt, { status: 201 });
  } catch (error) {
    console.error('Failed to create goods receipt:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
