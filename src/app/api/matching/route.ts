
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { performThreeWayMatch } from '@/services/matching-service';
import { PurchaseOrder } from '@/lib/types';


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const invoiceId = searchParams.get('invoiceId');
  
  if (!invoiceId) {
    return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
  }

  const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId }
  });

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  const po = await prisma.purchaseOrder.findUnique({
      where: { id: invoice.purchaseOrderId },
      include: {
          items: true,
          receipts: {
              include: {
                  items: true
              }
          },
          invoices: {
              include: {
                  items: true
              }
          }
      }
  });

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

  const result = performThreeWayMatch(po as any); // Cast needed due to complex includes
  return NextResponse.json(result);
}

export async function POST(request: Request) {
    console.log('POST /api/matching - Manually resolving mismatch.');
    try {
        const body = await request.json();
        console.log('Request body:', body);
        const { poId, userId } = body;

        const po = await prisma.purchaseOrder.findUnique({ where: { id: poId }, include: { items: true, receipts: { include: { items: true }}, invoices: { include: { items: true }} } });
        if (!po) {
            console.error('Purchase Order not found for ID:', poId);
            return NextResponse.json({ error: 'Purchase Order not found' }, { status: 404 });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            console.error('User not found for ID:', userId);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        await prisma.purchaseOrder.update({
            where: { id: poId },
            data: { status: 'Matched' }
        });
        console.log(`PO ${poId} status updated to Matched.`);
        
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                role: user.role,
                action: 'MANUAL_MATCH',
                entity: 'PurchaseOrder',
                entityId: po.id,
                details: `Manually resolved and marked PO as Matched.`,
            }
        });

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
