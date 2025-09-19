
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  console.log('GET /api/invoices - Fetching all invoices.');
  const invoices = await prisma.invoice.findMany({
    orderBy: { invoiceDate: 'desc' },
    include: {
      purchaseOrder: {
        select: {
          requisitionTitle: true
        }
      }
    }
  });
  return NextResponse.json(invoices);
}

export async function POST(request: Request) {
  console.log('POST /api/invoices - Creating new invoice.');
  try {
    const body = await request.json();
    console.log('Request body:', body);
    const { purchaseOrderId, vendorId, invoiceDate, items, totalAmount, documentUrl, userId } = body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
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
        vendorId,
        invoiceDate: new Date(invoiceDate),
        items: {
          create: items.map((item: any) => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          }))
        },
        totalAmount,
        status: 'Pending',
        documentUrl,
      }
    });

    console.log('Created new invoice and linked to PO:', newInvoice);
    
    // Find the specific quote that was awarded to this vendor for this PO's requisition
    const awardedQuote = await prisma.quotation.findFirst({
        where: {
            requisitionId: po.requisitionId,
            vendorId: vendorId,
            status: { in: ['Awarded', 'Invoice_Submitted', 'Accepted'] }
        }
    });

    if (awardedQuote) {
        await prisma.quotation.update({
            where: { id: awardedQuote.id },
            data: { status: 'Invoice_Submitted' }
        });
        console.log(`Updated status to "Invoice Submitted" for quote ${awardedQuote.id}`);
    } else {
        console.warn(`Could not find matching awarded quote for vendor ${vendorId} on requisition ${po.requisitionId} to update status.`);
    }

    await prisma.auditLog.create({
        data: {
            userId: user.id,
            role: user.role,
            action: 'CREATE_INVOICE',
            entity: 'Invoice',
            entityId: newInvoice.id,
            details: `Created Invoice for PO ${purchaseOrderId}.`,
        }
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
