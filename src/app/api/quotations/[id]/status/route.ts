
import { NextResponse } from 'next/server';
import { auditLogs, quotations, requisitions } from '@/lib/data-store';
import { users } from '@/lib/auth-store';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const quoteId = params.id;
    const body = await request.json();
    const { status, userId, requisitionId } = body;

    if (!['Awarded', 'Rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status provided.' }, { status: 400 });
    }
    
    const user = users.find(u => u.id === userId);
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const quoteToUpdate = quotations.find(q => q.id === quoteId);
    if (!quoteToUpdate) {
        return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    quoteToUpdate.status = status;
    let auditDetails = `marked quotation ${quoteId} as "${status}".`;

    // If a quote is awarded, reject all others for the same requisition.
    if (status === 'Awarded') {
      quotations.forEach(q => {
        if (q.requisitionId === requisitionId && q.id !== quoteId) {
          q.status = 'Rejected';
        }
      });
      auditDetails = `awarded quotation ${quoteId}. All other quotes for requisition ${requisitionId} were rejected.`
      
      // Update the main requisition status
      const requisition = requisitions.find(r => r.id === requisitionId);
      if (requisition) {
        // The status should now move to a state where a PO can be created.
        // Let's use 'Approved' as the status that signals readiness for PO creation.
        // In a more complex workflow, this might be 'RFQ Complete' or similar.
        requisition.status = 'Approved'; 
        requisition.updatedAt = new Date();
      }
    }
    
    // Add to audit log
    auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date(),
        user: user.name,
        role: user.role,
        action: 'UPDATE_STATUS',
        entity: 'Quotation',
        entityId: quoteId,
        details: auditDetails,
    });


    return NextResponse.json(quoteToUpdate);
  } catch (error) {
    console.error('Failed to update quotation status:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
