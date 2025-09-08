

import { NextResponse } from 'next/server';
import { purchaseOrders, requisitions, vendors, auditLogs } from '@/lib/data-store';
import { PurchaseOrder } from '@/lib/types';
import { users } from '@/lib/auth-store';

export async function POST(request: Request) {
  // This endpoint is now deprecated in favor of the vendor-response flow.
  // Kept for potential future use or direct PO creation scenarios.
  try {
    const body = await request.json();
    const { requisitionId, userId } = body;

    const user = users.find(u => u.id === userId);
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const requisition = requisitions.find(r => r.id === requisitionId);
    if (!requisition) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    // This logic now assumes the quote has been accepted by the vendor.
    const acceptedQuote = requisition.quotations?.find(q => q.status === 'Accepted');
    if (!acceptedQuote) {
      return NextResponse.json({ error: 'No accepted quote found for this requisition' }, { status: 400 });
    }

    const vendor = vendors.find(v => v.id === acceptedQuote.vendorId);
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const newPO: PurchaseOrder = {
      id: `PO-${Date.now()}`,
      requisitionId,
      requisitionTitle: requisition.title,
      vendor,
      items: acceptedQuote.items.map(item => ({
          id: item.requisitionItemId,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
          receivedQuantity: 0,
      })),
      totalAmount: acceptedQuote.totalPrice,
      status: 'Issued',
      createdAt: new Date(),
      contract: requisition.contract,
      notes: requisition.negotiationNotes,
    };

    purchaseOrders.unshift(newPO);
    
    // Update requisition with PO ID
    requisition.purchaseOrderId = newPO.id;
    requisition.status = 'PO Created';
    requisition.updatedAt = new Date();


    auditLogs.unshift({
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        user: user.name,
        role: user.role,
        action: 'CREATE_PO',
        entity: 'PurchaseOrder',
        entityId: newPO.id,
        details: `Created Purchase Order for requisition ${requisitionId} after vendor acceptance.`,
    });


    return NextResponse.json(newPO, { status: 201 });
  } catch (error) {
    console.error('Failed to create purchase order:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(purchaseOrders);
}
