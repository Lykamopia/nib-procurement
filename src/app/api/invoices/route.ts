

import { NextResponse } from 'next/server';
import { purchaseOrders, invoices as invoiceStore, auditLogs } from '@/lib/data-store';
import { Invoice } from '@/lib/types';
import { users } from '@/lib/auth-store';

export async function GET() {
  return NextResponse.json(invoiceStore);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { purchaseOrderId, vendorId, invoiceDate, items, totalAmount, documentUrl, userId } = body;

    const user = users.find(u => u.id === userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const po = purchaseOrders.find(p => p.id === purchaseOrderId);
    if (!po) {
      return NextResponse.json({ error: 'Purchase Order not found' }, { status: 404 });
    }

    const newInvoice: Invoice = {
      id: `INV-${Date.now()}`,
      purchaseOrderId,
      vendorId,
      invoiceDate: new Date(invoiceDate),
      items: items.map((item: any) => ({
        ...item,
        id: `INV-ITEM-${Date.now()}-${item.name}`
      })),
      totalAmount,
      status: 'Pending',
      documentUrl,
    };

    invoiceStore.unshift(newInvoice);
    if (!po.invoices) {
      po.invoices = [];
    }
    po.invoices.push(newInvoice);

    auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date(),
        user: user.name,
        role: user.role,
        action: 'CREATE_INVOICE',
        entity: 'Invoice',
        entityId: newInvoice.id,
        details: `Created Invoice for PO ${purchaseOrderId}.`,
    });

    return NextResponse.json(newInvoice, { status: 201 });
  } catch (error) {
    console.error('Failed to create invoice:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
