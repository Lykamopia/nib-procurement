
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { PurchaseOrderStatus } from '@prisma/client';

export async function POST(request: Request) {
  console.log('POST /api/receipts - Creating new goods receipt.');
  try {
    const body = await request.json();
    console.log('Request body:', body);
    const { purchaseOrderId, userId, items } = body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        console.error('User not found for ID:', userId);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const po = await prisma.purchaseOrder.findUnique({ 
      where: { id: purchaseOrderId },
      include: { items: true }
    });
    if (!po) {
      console.error('Purchase Order not found for ID:', purchaseOrderId);
      return NextResponse.json({ error: 'Purchase Order not found' }, { status: 404 });
    }
    console.log('Found PO to receive against:', po);

    const newReceipt = await prisma.goodsReceiptNote.create({
      data: {
        purchaseOrder: { connect: { id: purchaseOrderId } },
        receivedBy: { connect: { id: userId } },
        items: {
          create: items.map((item: any) => ({
            poItemId: item.poItemId,
            name: item.name,
            quantityOrdered: item.quantityOrdered,
            quantityReceived: item.quantityReceived,
            condition: item.condition.replace(/ /g, '_'),
            notes: item.notes,
          }))
        },
      }
    });
    console.log('Created new GRN:', newReceipt);

    let allItemsDelivered = true;
    for (const poItem of po.items) {
        const receivedItem = items.find((i: { poItemId: string; }) => i.poItemId === poItem.id);
        if (receivedItem) {
            await prisma.pOItem.update({
                where: { id: poItem.id },
                data: {
                    receivedQuantity: { increment: receivedItem.quantityReceived }
                }
            });
        }
        const updatedPoItem = await prisma.pOItem.findUnique({ where: { id: poItem.id } });
        if (updatedPoItem && updatedPoItem.receivedQuantity < updatedPoItem.quantity) {
            allItemsDelivered = false;
        }
    }
    

    const newStatus: PurchaseOrderStatus = allItemsDelivered ? 'Delivered' : 'Partially_Delivered';
    await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: { status: newStatus }
    });
    console.log(`Updated PO ${po.id} status to ${newStatus}`);

    if (newStatus === 'Delivered') {
        const standbyQuotes = await prisma.quotation.findMany({
            where: {
                requisitionId: po.requisitionId,
                status: 'Standby'
            }
        });
        for (const q of standbyQuotes) {
            await prisma.quotation.update({
                where: { id: q.id },
                data: { status: 'Rejected' }
            });
            await prisma.auditLog.create({
                data: {
                    userId: 'SYSTEM',
                    role: 'Admin',
                    action: 'AUTO_REJECT_STANDBY',
                    entity: 'Quotation',
                    entityId: q.id,
                    details: `Automatically rejected standby quote from ${q.vendorName} as primary PO ${po.id} was fulfilled.`,
                }
            });
        }
    }

    await prisma.auditLog.create({
        data: {
            userId: user.id,
            role: user.role,
            action: 'RECEIVE_GOODS',
            entity: 'PurchaseOrder',
            entityId: po.id,
            details: `Created Goods Receipt Note ${newReceipt.id}. PO status: ${newStatus}.`,
        }
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
