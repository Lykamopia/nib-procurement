
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { PurchaseOrder } from '@/lib/types';


export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { requisitionId, userId } = body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const requisition = await prisma.purchaseRequisition.findUnique({
        where: { id: requisitionId },
        include: { quotations: { include: { items: true } } }
    });
    if (!requisition) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    const acceptedQuote = requisition.quotations?.find(q => q.status === 'Accepted');
    if (!acceptedQuote) {
      return NextResponse.json({ error: 'No accepted quote found for this requisition' }, { status: 400 });
    }

    const vendor = await prisma.vendor.findUnique({ where: { id: acceptedQuote.vendorId }});
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const newPO = await prisma.purchaseOrder.create({
      data: {
        id: `PO-${Date.now()}`,
        requisitionId: requisition.id,
        requisitionTitle: requisition.title,
        vendorId: vendor.id,
        items: {
          create: acceptedQuote.items.map(item => ({
              id: item.requisitionItemId,
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice,
              receivedQuantity: 0,
          }))
        },
        totalAmount: acceptedQuote.totalPrice,
        status: 'Issued',
        createdAt: new Date(),
        contract: requisition.contract as any,
        notes: requisition.negotiationNotes,
      }
    });

    await prisma.purchaseRequisition.update({
      where: { id: requisitionId },
      data: { 
        purchaseOrderId: newPO.id,
        status: 'PO_Created',
        updatedAt: new Date()
      }
    });

    await prisma.auditLog.create({
        data: {
            userId: user.id,
            role: user.role,
            action: 'CREATE_PO',
            entity: 'PurchaseOrder',
            entityId: newPO.id,
            details: `Created Purchase Order for requisition ${requisitionId} after vendor acceptance.`,
        }
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
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    include: {
      vendor: true,
      items: true,
      receipts: { include: { items: true } },
      invoices: { include: { items: true } },
    },
    orderBy: {
      createdAt: 'desc',
    }
  });
  return NextResponse.json(purchaseOrders);
}
