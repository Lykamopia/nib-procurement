
'use server';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const quoteId = params.id;
  console.log(`POST /api/quotations/${quoteId}/respond`);
  try {
    const body = await request.json();
    const { userId, action } = body as { userId: string; action: 'accept' | 'reject' };

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'Vendor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const quote = await prisma.quotation.findFirst({
        where: { id: quoteId, vendorId: user.vendorId || '' }
    });
    if (!quote) {
      return NextResponse.json({ error: 'Quotation not found or not owned by this vendor' }, { status: 404 });
    }
    
    if (quote.status !== 'Awarded') {
        return NextResponse.json({ error: 'This quote is not currently in an awarded state.' }, { status: 400 });
    }
    
    const requisition = await prisma.purchaseRequisition.findUnique({ where: { id: quote.requisitionId } });
    if (!requisition) {
       return NextResponse.json({ error: 'Associated requisition not found' }, { status: 404 });
    }

    if (action === 'accept') {
      await prisma.quotation.update({ where: { id: quoteId }, data: { status: 'Accepted' } });
      
      const vendor = await prisma.vendor.findUnique({ where: { id: quote.vendorId } });
       if (!vendor) {
        return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
      }

      const quoteWithItems = await prisma.quotation.findUnique({ where: { id: quote.id }, include: { items: true } });
      if (!quoteWithItems) return NextResponse.json({ error: 'Could not retrieve quote items' }, { status: 500 });
      
      // Automatically create Purchase Order
       const newPO = await prisma.purchaseOrder.create({
           data: {
                id: `PO-${Date.now()}`,
                requisitionId: requisition.id,
                requisitionTitle: requisition.title,
                vendorId: vendor.id,
                items: {
                    create: quoteWithItems.items.map(item => ({
                        id: item.requisitionItemId,
                        name: item.name,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalPrice: item.quantity * item.unitPrice,
                        receivedQuantity: 0,
                    }))
                },
                totalAmount: quote.totalPrice,
                status: 'Issued',
                createdAt: new Date(),
                contract: requisition.contract as any,
                notes: requisition.negotiationNotes,
           }
       });

        await prisma.purchaseRequisition.update({
            where: { id: requisition.id },
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
                action: 'ACCEPT_AWARD',
                entity: 'Quotation',
                entityId: quoteId,
                details: `Vendor accepted award. PO ${newPO.id} auto-generated.`,
            }
        });

      return NextResponse.json({ message: 'Award accepted. PO has been generated.' });

    } else if (action === 'reject') {
      await prisma.quotation.update({ where: { id: quoteId }, data: { status: 'Declined' } });
      
       await prisma.auditLog.create({
            data: {
                userId: user.id,
                role: user.role,
                action: 'REJECT_AWARD',
                entity: 'Quotation',
                entityId: quoteId,
                details: `Vendor declined award.`,
            }
       });

      // Find next standby quote
      const nextRank = (quote.rank || 0) + 1;
      const nextQuote = await prisma.quotation.findFirst({
           where: { requisitionId: quote.requisitionId, rank: nextRank }
      });

      if (nextQuote) {
          await prisma.quotation.update({ where: { id: nextQuote.id }, data: { status: 'Awarded' } });
           await prisma.auditLog.create({
                data: {
                    userId: 'SYSTEM',
                    role: 'Admin',
                    action: 'PROMOTE_STANDBY',
                    entity: 'Quotation',
                    entityId: nextQuote.id,
                    details: `Promoted standby vendor ${nextQuote.vendorName} to Awarded.`,
                }
            });
          return NextResponse.json({ message: `Award declined. Next vendor (${nextQuote.vendorName}) has been notified.` });
      } else {
        // No more standby vendors
        await prisma.purchaseRequisition.update({ where: { id: requisition.id }, data: { status: 'Approved' } });
        
        await prisma.quotation.updateMany({
            where: { requisitionId: requisition.id },
            data: { status: 'Submitted', rank: null }
        });

         await prisma.auditLog.create({
            data: {
                userId: 'SYSTEM',
                role: 'Admin',
                action: 'RESTART_RFQ',
                entity: 'Requisition',
                entityId: requisition.id,
                details: `All vendors declined award. RFQ process has been reset.`,
            }
        });
        return NextResponse.json({ message: 'Award declined. No more standby vendors. Requisition has been reset for new RFQ process.' });
      }
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });

  } catch (error) {
    console.error('Failed to respond to award:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
