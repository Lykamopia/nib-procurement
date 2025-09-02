
import { NextResponse } from 'next/server';
import { auditLogs, quotations, requisitions } from '@/lib/data-store';
import { users } from '@/lib/auth-store';

type StatusUpdate = 'Awarded' | 'Rejected' | 'ChangeAward';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const quoteId = params.id;
    const body = await request.json();
    const { status, userId, requisitionId } = body as { status: StatusUpdate, userId: string, requisitionId: string };

    if (!['Awarded', 'Rejected', 'ChangeAward'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status provided.' }, { status: 400 });
    }
    
    const user = users.find(u => u.id === userId);
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    let updatedQuote = null;
    let auditDetails = '';

    if (status === 'ChangeAward') {
        auditDetails = `changed the award decision for requisition ${requisitionId}, reverting all quotes to Submitted.`;
        quotations.forEach(q => {
            if (q.requisitionId === requisitionId) {
                q.status = 'Submitted';
            }
        });
        const requisition = requisitions.find(r => r.id === requisitionId);
        if (requisition) {
            requisition.status = 'Approved';
            requisition.updatedAt = new Date();
        }
    } else {
        const quoteToUpdate = quotations.find(q => q.id === quoteId);
        if (!quoteToUpdate) {
            return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
        }
        updatedQuote = quoteToUpdate;
        updatedQuote.status = status;
        auditDetails = `marked quotation ${quoteId} as "${status}".`;

        // If a quote is awarded, reject all others for the same requisition.
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
            
            // Update the main requisition status
            const requisition = requisitions.find(r => r.id === requisitionId);
            if (requisition) {
                requisition.status = 'RFQ In Progress'; 
                requisition.updatedAt = new Date();
            }
        }
    }
    
    // Add to audit log
    auditLogs.unshift({
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        user: user.name,
        role: user.role,
        action: 'UPDATE_STATUS',
        entity: 'Quotation',
        entityId: quoteId || requisitionId,
        details: auditDetails,
    });


    return NextResponse.json(updatedQuote);
  } catch (error) {
    console.error('Failed to update quotation status:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
