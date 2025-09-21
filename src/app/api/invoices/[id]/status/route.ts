

'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auditLogs } from '@/lib/data-store';
import { users } from '@/lib/auth-store';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log(`PATCH /api/invoices/${params.id}/status`);
  try {
    const invoiceId = params.id;
    const body = await request.json();
    console.log('Request body:', body);
    const { status, userId } = body;

    const validStatuses = ['Approved for Payment', 'Disputed'];
    if (!validStatuses.includes(status)) {
      console.error('Invalid status provided:', status);
      return NextResponse.json({ error: 'Invalid status provided.' }, { status: 400 });
    }
    
    const user = users.find(u => u.id === userId);
    if (!user) {
        console.error('User not found for ID:', userId);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const invoiceToUpdate = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoiceToUpdate) {
        console.error('Invoice not found for ID:', invoiceId);
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    console.log('Found invoice to update:', invoiceToUpdate);

    const oldStatus = invoiceToUpdate.status;
    const updatedInvoice = await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: status.replace(/ /g, '_') }
    });
    
    const auditLogEntry = {
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        user: user.name,
        role: user.role,
        action: 'UPDATE_INVOICE_STATUS',
        entity: 'Invoice',
        entityId: invoiceId,
        details: `Updated invoice status from "${oldStatus}" to "${status}".`,
    };
    auditLogs.unshift(auditLogEntry);
    console.log('Added audit log:', auditLogEntry);

    console.log('Successfully updated invoice. Sending back:', updatedInvoice);
    return NextResponse.json(updatedInvoice);
  } catch (error) {
    console.error('Failed to update invoice status:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
