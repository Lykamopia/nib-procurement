
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { users } from '@/lib/auth-store';

export async function POST(
  request: Request
) {
  console.log('POST /api/payments - Processing payment.');
  try {
    const body = await request.json();
    console.log('Request body:', body);
    const { invoiceId, userId } = body;

    const user = await prisma.user.findUnique({where: {id: userId}});
    if (!user) {
        console.error('User not found for ID:', userId);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const invoiceToUpdate = await prisma.invoice.findUnique({ 
        where: { id: invoiceId },
        include: { po: true }
    });
    if (!invoiceToUpdate) {
        console.error('Invoice not found for ID:', invoiceId);
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    console.log('Found invoice to pay:', invoiceToUpdate);
    
    if (invoiceToUpdate.status !== 'Approved_for_Payment') {
        console.error(`Invoice ${invoiceId} is not approved for payment. Current status: ${invoiceToUpdate.status}`);
        return NextResponse.json({ error: 'Invoice must be approved before payment.' }, { status: 400 });
    }
    
    const transactionResult = await prisma.$transaction(async (tx) => {

        const paymentReference = `PAY-${Date.now()}`;
        const updatedInvoice = await tx.invoice.update({
            where: { id: invoiceId },
            data: {
                status: 'Paid',
                paymentDate: new Date(),
                paymentReference: paymentReference,
            }
        });
        console.log('Invoice updated to Paid status.');

        // Now, update the requisition status to 'Closed'
        if (invoiceToUpdate.po) {
             await tx.purchaseRequisition.update({
                where: { id: invoiceToUpdate.po.requisitionId },
                data: { status: 'Closed' }
            });
            console.log(`Requisition ${invoiceToUpdate.po.requisitionId} status updated to Closed.`);
        }
        
        await tx.auditLog.create({
            data: {
                user: { connect: { id: user.id } },
                timestamp: new Date(),
                action: 'PROCESS_PAYMENT',
                entity: 'Invoice',
                entityId: invoiceId,
                details: `Processed payment for invoice ${invoiceId}. Ref: ${paymentReference}. Requisition closed.`,
            }
        });
        console.log('Added audit log:');

        return updatedInvoice;
    });

    return NextResponse.json(transactionResult);
  } catch (error) {
    console.error('Failed to process payment:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
