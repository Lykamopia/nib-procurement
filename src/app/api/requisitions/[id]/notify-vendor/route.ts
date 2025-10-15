
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { User } from '@/lib/types';
import { sendEmail } from '@/services/email-service';
import { format, differenceInMinutes } from 'date-fns';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const requisitionId = params.id;
  try {
    const body = await request.json();
    const { userId } = body;

    const user: User | null = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'Procurement_Officer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const requisition = await prisma.purchaseRequisition.findUnique({ where: { id: requisitionId } });
    if (!requisition) {
      return NextResponse.json({ error: 'Requisition not found.' }, { status: 404 });
    }

    const transactionResult = await prisma.$transaction(async (tx) => {
        const winningQuote = await tx.quotation.findFirst({
            where: {
                requisitionId: requisitionId,
                rank: 1
            },
            include: {
                vendor: true
            }
        });

        if (!winningQuote) {
            throw new Error("No winning quote found to notify.");
        }

        await tx.quotation.update({
            where: { id: winningQuote.id },
            data: { status: 'Awarded' }
        });

        const updatedRequisition = await tx.purchaseRequisition.update({
            where: { id: requisitionId },
            data: {
                status: 'RFQ_In_Progress'
            }
        });

        if (winningQuote.vendor && requisition) {
            const emailHtml = `
                <h1>Congratulations, ${winningQuote.vendor.name}!</h1>
                <p>You have been awarded the contract for requisition <strong>${requisition.title}</strong>.</p>
                <p>Please log in to the vendor portal to review the award and respond.</p>
                ${requisition.awardResponseDeadline ? `<p><strong>This award must be accepted by ${format(new Date(requisition.awardResponseDeadline), 'PPpp')}.</strong></p>` : ''}
                <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002'}/vendor/dashboard">Go to Vendor Portal</a>
                <p>Thank you,</p>
                <p>Nib InternationalBank Procurement</p>
            `;

            await sendEmail({
                to: winningQuote.vendor.email,
                subject: `Contract Awarded: ${requisition.title}`,
                html: emailHtml
            });
        }
        
        await tx.auditLog.create({
            data: {
                user: { connect: { id: userId } },
                action: 'NOTIFY_VENDOR',
                entity: 'Requisition',
                entityId: requisitionId,
                details: `Sent award notification to vendor ${winningQuote.vendor.name} for requisition ${requisitionId}.`
            }
        });

        return updatedRequisition;
    });

    return NextResponse.json({ message: 'Vendor notified successfully.', requisition: transactionResult });

  } catch (error) {
    console.error("Failed to notify vendor:", error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
