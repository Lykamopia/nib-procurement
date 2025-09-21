
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { users, auditLogs, quotations } from '@/lib/data-store'; // auditLogs and quotations are still in-memory for now

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
              purchaseOrder: { connect: { id: purchaseOrderId } },
              receivedBy: user.name, // Corrected field
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
        
        // This part remains in-memory as quotations are not yet fully migrated
        if (newPOStatus === 'Delivered') {
            quotations.forEach(q => {
                if (q.requisitionId === po.requisitionId && q.status === 'Standby') {
                    q.status = 'Rejected';
                    const auditLogEntry = {
                        id: `log-${Date.now()}-${Math.random()}`,
                        timestamp: new Date(),
                        user: 'System',
                        role: 'Admin' as const,
                        action: 'AUTO_REJECT_STANDBY',
                        entity: 'Quotation',
                        entityId: q.id,
                        details: `Automatically rejected standby quote from ${q.vendorName} as primary PO ${po.id} was fulfilled.`,
                    };
                    auditLogs.unshift(auditLogEntry);
                }
            });
            console.log(`PO ${po.id} fulfilled. Standby quotes for requisition ${po.requisitionId} have been rejected.`);
        }

        const auditLogEntry = {
            id: `log-${Date.now()}-${Math.random()}`,
            timestamp: new Date(),
            user: user.name,
            role: user.role,
            action: 'RECEIVE_GOODS',
            entity: 'PurchaseOrder',
            entityId: po.id,
            details: `Created Goods Receipt Note ${newReceipt.id}. PO status: ${newPOStatus.replace(/_/g, ' ')}.`,
        };
        auditLogs.unshift(auditLogEntry);
        console.log('Added audit log:', auditLogEntry);

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
