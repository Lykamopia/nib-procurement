
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { users } from '@/lib/data-store';

export async function POST(request: Request) {
  console.log('POST /api/receipts - Creating new goods receipt in DB.');
  try {
    const body = await request.json();
    console.log('Request body:', body);
    const { purchaseOrderId, userId, items } = body;

    const user = users.find(u => u.id === userId);
    if (!user) {
        console.error('User not found for ID:', userId);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const txResult = await prisma.$transaction(async (tx) => {
        const po = await tx.purchaseOrder.findUnique({ 
            where: { id: purchaseOrderId },
            include: { items: true }
        });

        if (!po) {
          throw new Error('Purchase Order not found');
        }
        console.log('Found PO to receive against:', po);

        const newReceipt = await tx.goodsReceiptNote.create({
          data: {
              transactionId: po.transactionId,
              purchaseOrder: { connect: { id: purchaseOrderId } },
              receivedBy: { connect: { id: user.id } },
              items: {
                  create: items.map((item: any) => ({
                      poItemId: item.poItemId,
                      quantityReceived: item.quantityReceived,
                      condition: item.condition.replace(/ /g, '_'),
                      notes: item.notes,
                  }))
              }
          }
        });
        console.log('Created new GRN in DB:', newReceipt);

        let allItemsDelivered = true;
        for (const poItem of po.items) {
            const receivedItem = items.find((i: { poItemId: string; }) => i.poItemId === poItem.id);
            let newReceivedQuantity = poItem.receivedQuantity;
            if (receivedItem) {
                newReceivedQuantity += receivedItem.quantityReceived;
            }

            await tx.pOItem.update({
                where: { id: poItem.id },
                data: { receivedQuantity: newReceivedQuantity }
            });

            if (newReceivedQuantity < poItem.quantity) {
                allItemsDelivered = false;
            }
        }

        const newPOStatus = allItemsDelivered ? 'Delivered' : 'Partially_Delivered';
        await tx.purchaseOrder.update({
            where: { id: purchaseOrderId },
            data: { status: newPOStatus }
        });
        console.log(`Updated PO ${po.id} status to ${newPOStatus}`);
        
        if (newPOStatus === 'Delivered') {
            await tx.quotation.updateMany({
                where: {
                    requisitionId: po.requisitionId,
                    status: 'Standby'
                },
                data: { status: 'Rejected' }
            });
            console.log(`PO ${po.id} fulfilled. Standby quotes for requisition ${po.requisitionId} have been rejected.`);
        }

        await prisma.auditLog.create({
            data: {
                transactionId: po.transactionId,
                user: { connect: { id: user.id } },
                action: 'RECEIVE_GOODS',
                entity: 'PurchaseOrder',
                entityId: po.id,
                details: `Created Goods Receipt Note ${newReceipt.id}. PO status: ${newPOStatus.replace(/_/g, ' ')}.`,
            }
        });
        console.log('Added audit log:');

        return newReceipt;
    });


    return NextResponse.json(txResult, { status: 201 });
  } catch (error) {
    console.error('Failed to create goods receipt:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
