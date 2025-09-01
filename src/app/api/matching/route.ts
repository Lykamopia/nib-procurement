
import { NextResponse } from 'next/server';
import { purchaseOrders, auditLogs } from '@/lib/data-store';
import { performThreeWayMatch } from '@/services/matching-service';
import { users } from '@/lib/auth-store';

export async function GET() {
  const results = purchaseOrders.map(performThreeWayMatch);
  return NextResponse.json(results);
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { poId, userId } = body;

        const po = purchaseOrders.find(p => p.id === poId);
        if (!po) {
            return NextResponse.json({ error: 'Purchase Order not found' }, { status: 404 });
        }

        const user = users.find(u => u.id === userId);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        po.status = 'Matched'; 
        
        auditLogs.unshift({
            id: `log-${Date.now()}`,
            timestamp: new Date(),
            user: user.name,
            role: user.role,
            action: 'MANUAL_MATCH',
            entity: 'PurchaseOrder',
            entityId: po.id,
            details: `Manually resolved and marked PO as Matched.`,
        });

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
