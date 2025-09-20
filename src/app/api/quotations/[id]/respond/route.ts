
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { users } from '@/lib/auth-store';
import { PurchaseOrder } from '@/lib/types';
import { auditLogs } from '@/lib/data-store'; // Still using in-memory for audit

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const quoteId = params.id;
  try {
    const body = await request.json();
    const { userId, action } = body as { userId: string; action: 'accept' | 'reject' };

    const user = users.find(u => u.id === userId);
    if (!user || user.role !== 'Vendor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    const transactionResult = await prisma.$transaction(async (tx) => {
        const quote = await tx.quotation.findUnique({ 
            where: { id: quoteId },
            include: { items: true, requisition: true }
        });

        if (!quote || quote.vendorId !== user.vendorId) {
          throw new Error('Quotation not found or not owned by this vendor');
        }
        
        if (quote.status !== 'Awarded') {
            throw new Error('This quote is not currently in an awarded state.');
        }
        
        const requisition = quote.requisition;
        if (!requisition) {
           throw new Error('Associated requisition not found');
        }

        if (action === 'accept') {
            await tx.quotation.update({
                where: { id: quoteId },
                data: { status: 'Accepted' }
            });

            const vendor = await tx.vendor.findUnique({ where: { id: quote.vendorId } });
            if (!vendor) {
                throw new Error('Vendor not found');
            }

            const newPO = await tx.purchaseOrder.create({
                data: {
                    requisition: { connect: { id: requisition.id } },
                    requisitionTitle: requisition.title,
                    vendor: { connect: { id: vendor.id } },
                    items: {
                        create: quote.items.map(item => ({
                            name: item.name,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            totalPrice: item.quantity * item.unitPrice,
                            receivedQuantity: 0,
                        }))
                    },
                    totalAmount: quote.totalPrice,
                    status: 'Issued',
                    // These are nullable in the schema, so they are not required here
                    // contract: requisition.contract ? { ...requisition.contract } : undefined,
                    // notes: requisition.negotiationNotes
                }
            });

            await tx.purchaseRequisition.update({
                where: { id: requisition.id },
                data: {
                    status: 'PO_Created',
                    purchaseOrderId: newPO.id,
                }
            });
            
            auditLogs.unshift({
                id: `log-${Date.now()}`,
                timestamp: new Date(),
                user: user.name,
                role: user.role,
                action: 'ACCEPT_AWARD',
                entity: 'Quotation',
                entityId: quoteId,
                details: `Vendor accepted award. PO ${newPO.id} auto-generated.`,
            });
            
            return { message: 'Award accepted. PO has been generated.' };

        } else if (action === 'reject') {
            await tx.quotation.update({ where: { id: quoteId }, data: { status: 'Declined' }});

            auditLogs.unshift({
                id: `log-${Date.now()}`,
                timestamp: new Date(),
                user: user.name,
                role: user.role,
                action: 'REJECT_AWARD',
                entity: 'Quotation',
                entityId: quoteId,
                details: `Vendor declined award.`,
            });

            const nextRank = (quote.rank || 0) + 1;
            const nextQuote = await tx.quotation.findFirst({
                where: { requisitionId: quote.requisitionId, rank: nextRank }
            });

            if (nextQuote) {
                await tx.quotation.update({ where: { id: nextQuote.id }, data: { status: 'Awarded' } });
                
                auditLogs.unshift({
                    id: `log-${Date.now()}`,
                    timestamp: new Date(),
                    user: 'System',
                    role: 'Admin',
                    action: 'PROMOTE_STANDBY',
                    entity: 'Quotation',
                    entityId: nextQuote.id,
                    details: `Promoted standby vendor ${nextQuote.vendorName} to Awarded.`,
                });
                return { message: `Award declined. Next vendor (${nextQuote.vendorName}) has been notified.` };
            } else {
                 await tx.purchaseRequisition.update({
                    where: { id: requisition.id },
                    data: { status: 'Approved', deadline: null }
                });
                 await tx.quotation.updateMany({
                    where: { requisitionId: requisition.id },
                    data: { status: 'Submitted', rank: null }
                });
                auditLogs.unshift({
                    id: `log-${Date.now()}`,
                    timestamp: new Date(),
                    user: 'System',
                    role: 'Admin',
                    action: 'RESTART_RFQ',
                    entity: 'Requisition',
                    entityId: requisition.id,
                    details: `All vendors declined award. RFQ process has been reset.`,
                });
                return { message: 'Award declined. No more standby vendors. Requisition has been reset for new RFQ process.' };
            }
        }
        throw new Error('Invalid action.');
    });
    
    return NextResponse.json(transactionResult);

  } catch (error) {
    console.error('Failed to respond to award:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
