
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { users } from '@/lib/auth-store';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { userId, vendorIds, deadline, cpoAmount, awardResponseDurationMinutes, rfqSettings } = body;

    const requisition = await prisma.purchaseRequisition.findUnique({ where: { id }});
    if (!requisition) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    const user = await prisma.user.findUnique({where: {id: userId}});
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (requisition.status !== 'Approved') {
        return NextResponse.json({ error: 'Requisition must be approved before sending RFQ.' }, { status: 400 });
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
            awardResponseDurationMinutes: awardResponseDurationMinutes,
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

    return NextResponse.json(updatedRequisition);

  } catch (error) {
    console.error('Failed to send RFQ:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
