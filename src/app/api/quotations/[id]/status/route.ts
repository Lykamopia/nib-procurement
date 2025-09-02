

import { NextResponse } from 'next/server';
import { auditLogs, quotations, requisitions } from '@/lib/data-store';
import { users } from '@/lib/auth-store';

type StatusUpdate = 'Awarded' | 'Rejected';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log(`PATCH /api/quotations/${params.id}/status`);
  try {
    const quoteId = params.id;
    const body = await request.json();
    console.log('Request body:', body);
    const { status, userId, requisitionId } = body as { status: StatusUpdate, userId: string, requisitionId: string };

    if (!['Awarded', 'Rejected'].includes(status)) {
      console.error('Invalid status provided:', status);
      return NextResponse.json({ error: 'Invalid status provided.' }, { status: 400 });
    }
    
    const user = users.find(u => u.id === userId);
    if (!user) {
        console.error('User not found for ID:', userId);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const quoteToUpdate = quotations.find(q => q.id === quoteId);
    if (!quoteToUpdate) {
        console.error('Quotation not found for ID:', quoteId);
        return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }
    console.log('Found quote to update:', quoteToUpdate);
    
    quoteToUpdate.status = status;
    let auditDetails = `marked quotation ${quoteId} as "${status}".`;

    if (status === 'Awarded') {
        const rejectedQuotes: string[] = [];
        quotations.forEach(q => {
            if (q.requisitionId === requisitionId && q.id !== quoteId) {
                if (q.status !== 'Rejected') {
                    q.status = 'Rejected';
                    rejectedQuotes.push(q.id);
                }
            }
        });
        auditDetails = `awarded quotation ${quoteId}.`
        if (rejectedQuotes.length > 0) {
            auditDetails += ` Automatically rejected other quotes: ${rejectedQuotes.join(', ')}.`;
        }
        
        const requisition = requisitions.find(r => r.id === requisitionId);
        if (requisition) {
            requisition.status = 'RFQ In Progress'; 
            requisition.updatedAt = new Date();
            console.log(`Updated requisition ${requisitionId} status to "RFQ In Progress".`);
        }
    }
    
    const auditLogEntry = {
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        user: user.name,
        role: user.role,
        action: 'UPDATE_STATUS',
        entity: 'Quotation',
        entityId: quoteId,
        details: auditDetails,
    };
    auditLogs.unshift(auditLogEntry);
    console.log('Added audit log:', auditLogEntry);

    return NextResponse.json(quoteToUpdate);
  } catch (error) {
    console.error('Failed to update quotation status:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
