
'use server';

import { NextResponse } from 'next/server';
import { auditLogs, vendors } from '@/lib/data-store';
import { users } from '@/lib/auth-store';
import { KycStatus } from '@/lib/types';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const vendorId = params.id;
    const body = await request.json();
    const { status, userId, rejectionReason } = body;

    if (!['Verified', 'Rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status provided.' }, { status: 400 });
    }
    
    const user = users.find(u => u.id === userId);
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const vendorToUpdate = vendors.find(v => v.id === vendorId);
    if (!vendorToUpdate) {
        return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const oldStatus = vendorToUpdate.kycStatus;
    vendorToUpdate.kycStatus = status as KycStatus;
    if (status === 'Rejected') {
        vendorToUpdate.rejectionReason = rejectionReason;
    }
    
    auditLogs.unshift({
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        user: user.name,
        role: user.role,
        action: 'VERIFY_VENDOR',
        entity: 'Vendor',
        entityId: vendorId,
        details: `Updated vendor KYC status from "${oldStatus}" to "${status}". ${rejectionReason ? `Reason: ${rejectionReason}` : ''}`.trim(),
    });


    return NextResponse.json(vendorToUpdate);
  } catch (error) {
    console.error('Failed to update vendor status:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
