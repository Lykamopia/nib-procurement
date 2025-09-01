
'use server';

import { NextResponse } from 'next/server';
import { auditLogs, invoices } from '@/lib/data-store';
import { users } from '@/lib/auth-store';
import { InvoiceStatus } from '@/lib/types';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = params.id;
    const body = await request.json();
    const { status, userId } = body;

    if (!['Paid', 'Disputed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status provided.' }, { status: 400 });
    }
    
    const user = users.find(u => u.id === userId);
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const invoiceToUpdate = invoices.find(inv => inv.id === invoiceId);
    if (!invoiceToUpdate) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const oldStatus = invoiceToUpdate.status;
    invoiceToUpdate.status = status as InvoiceStatus;
    
    auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date(),
        user: user.name,
        role: user.role,
        action: 'UPDATE_INVOICE_STATUS',
        entity: 'Invoice',
        entityId: invoiceId,
        details: `Updated invoice status from "${oldStatus}" to "${status}".`,
    });


    return NextResponse.json(invoiceToUpdate);
  } catch (error) {
    console.error('Failed to update invoice status:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
