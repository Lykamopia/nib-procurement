

'use server';

import { NextResponse } from 'next/server';
import { auditLogs, invoices } from '@/lib/data-store';
import { users } from '@/lib/auth-store';

export async function POST(
  request: Request
) {
  console.log('POST /api/payments - Processing payment.');
  try {
    const body = await request.json();
    console.log('Request body:', body);
    const { invoiceId, userId } = body;

    const user = users.find(u => u.id === userId);
    if (!user) {
        console.error('User not found for ID:', userId);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const invoiceToUpdate = invoices.find(inv => inv.id === invoiceId);
    if (!invoiceToUpdate) {
        console.error('Invoice not found for ID:', invoiceId);
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    console.log('Found invoice to pay:', invoiceToUpdate);
    
    if (invoiceToUpdate.status !== 'Approved for Payment') {
        console.error(`Invoice ${invoiceId} is not approved for payment. Current status: ${invoiceToUpdate.status}`);
        return NextResponse.json({ error: 'Invoice must be approved before payment.' }, { status: 400 });
    }

    const paymentReference = `PAY-${Date.now()}`;
    invoiceToUpdate.status = 'Paid';
    invoiceToUpdate.paymentDate = new Date();
    invoiceToUpdate.paymentReference = paymentReference;
    console.log('Invoice updated to Paid status.');
    
    const auditLogEntry = {
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        user: user.name,
        role: user.role,
        action: 'PROCESS_PAYMENT',
        entity: 'Invoice',
        entityId: invoiceId,
        details: `Processed payment for invoice ${invoiceId}. Ref: ${paymentReference}.`,
    };
    auditLogs.unshift(auditLogEntry);
    console.log('Added audit log:', auditLogEntry);

    return NextResponse.json(invoiceToUpdate);
  } catch (error) {
    console.error('Failed to process payment:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
