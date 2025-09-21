

'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auditLogs } from '@/lib/data-store';
import { users } from '@/lib/auth-store';

export async function GET() {
  console.log('GET /api/invoices - Fetching all invoices from DB.');
  try {
    const invoices = await prisma.invoice.findMany({
      orderBy: { invoiceDate: 'desc' },
    });
    return NextResponse.json(invoices);
  } catch (error) {
    console.error('Failed to fetch invoices:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  console.log('POST /api/invoices - Creating new invoice in DB.');
  try {
    const body = await request.json();
    console.log('Request body:', body);
    const { purchaseOrderId, vendorId, invoiceDate, items, totalAmount, documentUrl, userId } = body;

    const user = users.find(u => u.id === userId);
    if (!user) {
      console.error('User not found for ID:', userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const po = await prisma.purchaseOrder.findUnique({ where: { id: purchaseOrderId } });
    if (!po) {
      console.error('Purchase Order not found for ID:', purchaseOrderId);
      return NextResponse.json({ error: 'Purchase Order not found' }, { status: 404 });
    }

    const newInvoice = await prisma.invoice.create({
      data: {
        purchaseOrder: { connect: { id: purchaseOrderId } },
        vendor: { connect: { id: vendorId } },
        invoiceDate: new Date(invoiceDate),
        totalAmount,
        status: 'Pending',
        documentUrl,
        items: {
          create: items.map((item: any) => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })),
        },
      },
    });

    console.log('Created new invoice in DB and linked to PO:', newInvoice);
    
    await prisma.quotation.updateMany({
        where: {
            requisitionId: po.requisitionId,
            vendorId: vendorId,
            status: 'Accepted'
        },
        data: {
            status: 'Invoice_Submitted'
        }
    });
    console.log(`Updated status to "Invoice Submitted" for quotes related to vendor ${vendorId} on requisition ${po.requisitionId}`);

    auditLogs.unshift({
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        user: user.name,
        role: user.role,
        action: 'CREATE_INVOICE',
        entity: 'Invoice',
        entityId: newInvoice.id,
        details: `Created Invoice for PO ${purchaseOrderId}.`,
    });
    console.log('Added audit log:');

    return NextResponse.json(newInvoice, { status: 201 });
  } catch (error) {
    console.error('Failed to create invoice:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
