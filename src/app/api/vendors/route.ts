
import { NextResponse } from 'next/server';
import { vendors } from '@/lib/data-store';
import { Vendor } from '@/lib/types';
import { users } from '@/lib/auth-store';

export async function GET() {
  return NextResponse.json(vendors);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const newVendor: Vendor = {
      id: `VENDOR-${Date.now()}`,
      name: body.name,
      contactPerson: body.contactPerson,
      email: body.email,
      phone: body.phone,
      address: body.address,
    };

    vendors.unshift(newVendor);

    // In a real app, you'd also create an audit log entry here.

    return NextResponse.json(newVendor, { status: 201 });
  } catch (error) {
    console.error('Failed to create vendor:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process vendor', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
