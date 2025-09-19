
'use server';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { KycStatus } from '@prisma/client';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log(`PATCH /api/vendors/${params.id}/status`);
  try {
    const vendorId = params.id;
    const body = await request.json();
    console.log('Request body:', body);
    const { status, userId, rejectionReason } = body;

    const validStatuses: KycStatus[] = ['Verified', 'Rejected'];

    if (!validStatuses.includes(status)) {
      console.error('Invalid status provided:', status);
      return NextResponse.json({ error: 'Invalid status provided.' }, { status: 400 });
    }
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        console.error('User not found for ID:', userId);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const vendorToUpdate = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendorToUpdate) {
        console.error('Vendor not found for ID:', vendorId);
        return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }
    console.log('Found vendor to update:', vendorToUpdate);

    const oldStatus = vendorToUpdate.kycStatus;
    const updatedVendor = await prisma.vendor.update({
        where: { id: vendorId },
        data: {
            kycStatus: status as KycStatus,
            rejectionReason: status === 'Rejected' ? rejectionReason : null,
        }
    });
    
    await prisma.auditLog.create({
        data: {
            userId: user.id,
            role: user.role,
            action: 'VERIFY_VENDOR',
            entity: 'Vendor',
            entityId: vendorId,
            details: `Updated vendor KYC status from "${oldStatus}" to "${status}". ${rejectionReason ? `Reason: ${rejectionReason}` : ''}`.trim(),
        }
    });


    return NextResponse.json(updatedVendor);
  } catch (error) {
    console.error('Failed to update vendor status:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
