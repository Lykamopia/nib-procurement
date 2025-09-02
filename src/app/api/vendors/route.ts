

import { NextResponse } from 'next/server';
import { vendors, auditLogs } from '@/lib/data-store';
import { Vendor } from '@/lib/types';
import { users } from '@/lib/auth-store';

export async function GET() {
  console.log('GET /api/vendors - Fetching all vendors.');
  return NextResponse.json(vendors);
}

export async function POST(request: Request) {
  console.log('POST /api/vendors - Creating new vendor.');
  try {
    const body = await request.json();
    console.log('Request body:', body);

    const newVendor: Vendor = {
      id: `VENDOR-${Date.now()}`,
      userId: `TEMP-USER-${Date.now()}`, // This should be updated post-registration ideally
      name: body.name,
      contactPerson: body.contactPerson,
      email: body.email,
      phone: body.phone,
      address: body.address,
      kycStatus: 'Pending',
      kycDocuments: [
        { name: 'Business License', url: '#', submittedAt: new Date() },
        { name: 'Tax ID Document', url: '#', submittedAt: new Date() },
      ],
    };

    vendors.unshift(newVendor);
    console.log('Created new vendor:', newVendor);

    const auditLogEntry = {
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        user: 'System', // Or the user if available
        role: 'Admin' as const,
        action: 'CREATE_VENDOR',
        entity: 'Vendor',
        entityId: newVendor.id,
        details: `Added new vendor "${newVendor.name}" (pending verification).`,
    };
    auditLogs.unshift(auditLogEntry);
    console.log('Added audit log:', auditLogEntry);

    return NextResponse.json(newVendor, { status: 201 });
  } catch (error) {
    console.error('Failed to create vendor:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process vendor', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
