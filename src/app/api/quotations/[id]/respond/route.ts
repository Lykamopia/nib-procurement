

'use server';

import { NextResponse } from 'next/server';
import { auditLogs, quotations, requisitions, users, vendors, purchaseOrders } from '@/lib/data-store';
import { PurchaseOrder } from '@/lib/types';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const quoteId = params.id;
  console.log(`POST /api/quotations/${quoteId}/respond`);
  try {
    const body = await request.json();
    const { userId, action } = body as { userId: string; action: 'accept' | 'reject' };

    const user = users.find(u => u.id === userId);
    if (!user || user.role !== 'Vendor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const quote = quotations.find(q => q.id === quoteId);
    if (!quote || quote.vendorId !== user.vendorId) {
      return NextResponse.json({ error: 'Quotation not found or not owned by this vendor' }, { status: 404 });
    }
    
    if (quote.status !== 'Awarded') {
        return NextResponse.json({ error: 'This quote is not currently in an awarded state.' }, { status: 400 });
    }
    
    const requisition = requisitions.find(r => r.id === quote.requisitionId);
    if (!requisition) {
       return NextResponse.json({ error: 'Associated requisition not found' }, { status: 404 });
    }

    if (action === 'accept') {
      quote.status = 'Accepted';
      
      const vendor = vendors.find(v => v.id === quote.vendorId);
       if (!vendor) {
        return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
      }

      // Automatically create Purchase Order
       const newPO: PurchaseOrder = {
            id: `PO-${Date.now()}`,
            requisitionId: requisition.id,
            requisitionTitle: requisition.title,
            vendor,
            items: quote.items.map(item => ({
                id: item.requisitionItemId,
                name: item.name,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.quantity * item.unitPrice,
                receivedQuantity: 0,
            })),
            totalAmount: quote.totalPrice,
            status: 'Issued',
            createdAt: new Date(),
            contract: requisition.contract,
            notes: requisition.negotiationNotes,
        };
        purchaseOrders.unshift(newPO);
        requisition.purchaseOrderId = newPO.id;
        requisition.status = 'PO Created';
        requisition.updatedAt = new Date();

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

      return NextResponse.json({ message: 'Award accepted. PO has been generated.' });

    } else if (action === 'reject') {
      quote.status = 'Declined';
      
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

      // Find next standby quote
      const nextRank = (quote.rank || 0) + 1;
      const nextQuote = quotations.find(q => q.requisitionId === quote.requisitionId && q.rank === nextRank);

      if (nextQuote) {
          nextQuote.status = 'Awarded';
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
          return NextResponse.json({ message: `Award declined. Next vendor (${nextQuote.vendorName}) has been notified.` });
      } else {
        // No more standby vendors
        requisition.status = 'Approved'; // Reset to re-trigger RFQ
        quotations.forEach(q => {
            if (q.requisitionId === requisition.id) {
                q.status = 'Submitted';
                q.rank = undefined;
            }
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
