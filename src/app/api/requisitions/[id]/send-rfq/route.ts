

'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { User } from '@/lib/types';
import { sendEmail } from '@/services/email-service';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { userId, vendorIds, deadline, cpoAmount, rfqSettings } = body;

    const requisition = await prisma.purchaseRequisition.findUnique({ where: { id }});
    if (!requisition) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    const user: User | null = await prisma.user.findUnique({where: {id: userId}});
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // This is the main fix: Allow sending RFQ if status is Approved OR if an award process was reset.
    if (requisition.status !== 'Approved' && requisition.status !== 'RFQ_In_Progress') {
        // A more flexible check can be implemented if there are other states
        // from which an RFQ should be re-sent.
        const isRestartable = !requisition.deadline; // Example: if deadline is null, it can be restarted.
        if (requisition.status !== 'Approved' && !isRestartable) {
            return NextResponse.json({ error: 'Requisition must be in a state where an RFQ can be sent.' }, { status: 400 });
        }
    }
    
    let finalVendorIds = vendorIds;
    // If vendorIds is an empty array, it means 'all verified vendors'.
    if (Array.isArray(vendorIds) && vendorIds.length === 0) {
        const verifiedVendors = await prisma.vendor.findMany({
            where: { kycStatus: 'Verified' },
            select: { id: true }
        });
        finalVendorIds = verifiedVendors.map(v => v.id);
    }


    const updatedRequisition = await prisma.purchaseRequisition.update({
        where: { id },
        data: {
            status: 'RFQ_In_Progress',
            allowedVendorIds: finalVendorIds,
            deadline: deadline ? new Date(deadline) : undefined,
            cpoAmount: cpoAmount,
            rfqSettings: rfqSettings || {},
        }
    });

    await prisma.auditLog.create({
        data: {
            user: { connect: { id: user.id } },
            timestamp: new Date(),
            action: 'SEND_RFQ',
            entity: 'Requisition',
            entityId: id,
            details: `Sent RFQ to ${finalVendorIds.length === 0 ? 'all verified vendors' : `${finalVendorIds.length} selected vendors`}.`,
        }
    });

    // --- Send Email Notifications ---
    const vendorsToNotify = await prisma.vendor.findMany({
        where: {
            id: { in: finalVendorIds }
        }
    });

    for (const vendor of vendorsToNotify) {
        if (vendor.email) {
            const emailHtml = `
                <h1>New Request for Quotation</h1>
                <p>Hello ${vendor.name},</p>
                <p>A new Request for Quotation (RFQ) has been issued that you are invited to bid on.</p>
                <ul>
                    <li><strong>Requisition Title:</strong> ${requisition.title}</li>
                    <li><strong>Requisition ID:</strong> ${requisition.id}</li>
                    <li><strong>Submission Deadline:</strong> ${deadline ? new Date(deadline).toLocaleString() : 'N/A'}</li>
                </ul>
                <p>Please log in to the vendor portal to view the full details and submit your quotation.</p>
                <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002'}/vendor/dashboard">Go to Vendor Portal</a>
                <p>Thank you,</p>
                <p>Nib InternationalBank Procurement</p>
            `;
            
            await sendEmail({
                to: vendor.email,
                subject: `New Request for Quotation: ${requisition.title}`,
                html: emailHtml
            });
        }
    }


    return NextResponse.json(updatedRequisition);

  } catch (error) {
    console.error('Failed to send RFQ:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
