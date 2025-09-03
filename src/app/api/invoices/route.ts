

import { NextResponse } from 'next/server';
import { purchaseOrders, invoices as invoiceStore, auditLogs, quotations } from '@/lib/data-store';
import { Invoice } from '@/lib/types';
import { users } from '@/lib/auth-store';

export async function GET() {
  console.log('GET /api/invoices - Fetching all invoices.');
  return NextResponse.json(invoiceStore);
}

export async function POST(request: Request) {
  console.log('POST /api/invoices - Creating new invoice.');
  try {
    const body = await request.json();
    console.log('Request body:', body);
    const { purchaseOrderId, vendorId, invoiceDate, items, totalAmount, documentUrl, userId } = body;

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

    const newInvoice: Invoice = {
      id: `INV-${Date.now()}`,
      purchaseOrderId,
      vendorId,
      invoiceDate: new Date(invoiceDate),
      items: items.map((item: any) => ({
        ...item,
        id: `INV-ITEM-${Date.now()}-${Math.random()}`
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
    console.log('Created new invoice and linked to PO:', newInvoice);
    
    // Find the specific quote that was awarded to this vendor for this PO's requisition
    const awardedQuote = quotations.find(q => 
        q.requisitionId === po.requisitionId && 
        q.vendorId === vendorId &&
        q.status === 'Awarded'
    );

    if (awardedQuote) {
        awardedQuote.status = 'Invoice Submitted';
        console.log(`Updated status to "Invoice Submitted" for quote ${awardedQuote.id}`);
    } else {
        console.warn(`Could not find matching awarded quote for vendor ${vendorId} on requisition ${po.requisitionId} to update status.`);
    }


    const auditLogEntry = {
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        user: user.name,
        role: user.role,
        action: 'CREATE_INVOICE',
        entity: 'Invoice',
        entityId: newInvoice.id,
        details: `Created Invoice for PO ${purchaseOrderId}.`,
    };
    auditLogs.unshift(auditLogEntry);
    console.log('Added audit log:', auditLogEntry);

    return NextResponse.json(newInvoice, { status: 201 });
  } catch (error) {
    console.error('Failed to create invoice:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
