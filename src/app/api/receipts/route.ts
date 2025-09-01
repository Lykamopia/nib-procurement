
import { NextResponse } from 'next/server';
import { purchaseOrders, goodsReceipts, auditLogs } from '@/lib/data-store';
import { users } from '@/lib/auth-store';
import { GoodsReceiptNote, PurchaseOrderStatus } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { purchaseOrderId, userId, items } = body;

    const user = users.find(u => u.id === userId);
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const po = purchaseOrders.find(p => p.id === purchaseOrderId);
    if (!po) {
      return NextResponse.json({ error: 'Purchase Order not found' }, { status: 404 });
    }

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

    // Update PO item quantities
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

    // Update PO status
    po.status = allItemsDelivered ? 'Delivered' : 'Partially Delivered';

    auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date(),
        user: user.name,
        role: user.role,
        action: 'RECEIVE_GOODS',
        entity: 'PurchaseOrder',
        entityId: po.id,
        details: `Created Goods Receipt Note ${newReceipt.id}. PO status: ${po.status}.`,
    });

    return NextResponse.json(newReceipt, { status: 201 });
  } catch (error) {
    console.error('Failed to create goods receipt:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
