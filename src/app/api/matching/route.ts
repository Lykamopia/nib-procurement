

import { NextResponse } from 'next/server';
import { purchaseOrders, auditLogs, invoices } from '@/lib/data-store';
import { performThreeWayMatch } from '@/services/matching-service';
import { users } from '@/lib/auth-store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const invoiceId = searchParams.get('invoiceId');
  
  if (!invoiceId) {
    return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
  }

  const invoice = invoices.find(inv => inv.id === invoiceId);
  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  const po = purchaseOrders.find(p => p.id === invoice.purchaseOrderId);
  if (!po) {
    // This case might happen if an invoice is added without a PO.
    // Return a pending state.
    const pendingResult = {
        poId: invoice.purchaseOrderId,
        status: 'Pending' as const,
        quantityMatch: false,
        priceMatch: false,
        details: { /* empty details */ }
    }
     return NextResponse.json(pendingResult);
  }

  const result = performThreeWayMatch(po);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
    console.log('POST /api/matching - Manually resolving mismatch.');
    try {
        const body = await request.json();
        console.log('Request body:', body);
        const { poId, userId } = body;

        const po = purchaseOrders.find(p => p.id === poId);
        if (!po) {
            console.error('Purchase Order not found for ID:', poId);
            return NextResponse.json({ error: 'Purchase Order not found' }, { status: 404 });
        }

        const user = users.find(u => u.id === userId);
        if (!user) {
            console.error('User not found for ID:', userId);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        po.status = 'Matched';
        console.log(`PO ${poId} status updated to Matched.`);
        
        const auditLogEntry = {
            id: `log-${Date.now()}-${Math.random()}`,
            timestamp: new Date(),
            user: user.name,
            role: user.role,
            action: 'MANUAL_MATCH',
            entity: 'PurchaseOrder',
            entityId: po.id,
            details: `Manually resolved and marked PO as Matched.`,
        };
        auditLogs.unshift(auditLogEntry);
        console.log('Added audit log:', auditLogEntry);

        const result = performThreeWayMatch(po);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Failed to resolve mismatch:', error);
        if (error instanceof Error) {
            return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
        }
        return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
    }
}
