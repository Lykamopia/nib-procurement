

import { NextResponse } from 'next/server';
import { auditLogs } from '@/lib/data-store';
import { performThreeWayMatch } from '@/services/matching-service';
import { users } from '@/lib/auth-store';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const invoiceId = searchParams.get('invoiceId');
  
  if (!invoiceId) {
    return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
  }

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: invoice.purchaseOrderId },
      include: {
        items: true,
        receipts: { include: { items: true } },
        invoices: { include: { items: true } },
      }
    });

    if (!po) {
      const pendingResult = {
          poId: invoice.purchaseOrderId,
          status: 'Pending' as const,
          quantityMatch: false,
          priceMatch: false,
          details: { /* empty details */ }
      };
      return NextResponse.json(pendingResult);
    }
    
    // The type from prisma include should be compatible with what performThreeWayMatch expects.
    // A type assertion might be necessary if the inferred type isn't precise enough.
    const result = performThreeWayMatch(po as any);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Failed to perform matching:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}

export async function POST(request: Request) {
    console.log('POST /api/matching - Manually resolving mismatch.');
    try {
        const body = await request.json();
        console.log('Request body:', body);
        const { poId, userId } = body;

        const user = users.find(u => u.id === userId);
        if (!user) {
            console.error('User not found for ID:', userId);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const po = await prisma.purchaseOrder.update({
            where: { id: poId },
            data: { status: 'Matched' },
            include: {
                items: true,
                receipts: { include: { items: true } },
                invoices: { include: { items: true } },
            }
        });

        if (!po) {
            console.error('Purchase Order not found for ID:', poId);
            return NextResponse.json({ error: 'Purchase Order not found' }, { status: 404 });
        }

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

        const result = performThreeWayMatch(po as any);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Failed to resolve mismatch:', error);
        if (error instanceof Error) {
            return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
        }
        return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
    }
}
