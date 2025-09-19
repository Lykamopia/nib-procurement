
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { UserRole } from '@prisma/client';

export async function GET() {
  console.log('GET /api/vendors - Fetching all vendors.');
  const vendors = await prisma.vendor.findMany({
    orderBy: { name: 'asc' },
    include: { kycDocuments: true }
  });
  return NextResponse.json(vendors);
}

export async function POST(request: Request) {
  console.log('POST /api/vendors - Creating new vendor.');
  try {
    const body = await request.json();
    console.log('Request body:', body);

    const { name, contactPerson, email, phone, address, password } = body;

    const existingVendor = await prisma.vendor.findUnique({ where: { email } });
    if (existingVendor) {
        return NextResponse.json({ error: 'Vendor with this email already exists' }, { status: 409 });
    }

    const newUser = await prisma.user.create({
        data: {
            name,
            email,
            password, // Should be hashed in a real app
            role: 'Vendor',
        }
    });

    const newVendor = await prisma.vendor.create({
        data: {
            user: { connect: { id: newUser.id } },
            name,
            contactPerson,
            email,
            phone,
            address,
            kycStatus: 'Pending',
            kycDocuments: {
                create: [
                    { name: 'Business License', url: '#' },
                    { name: 'Tax ID Document', url: '#' },
                ]
            }
        }
    });
    
    // Update user with vendorId
    await prisma.user.update({
        where: { id: newUser.id },
        data: { vendorId: newVendor.id }
    });

    console.log('Created new vendor:', newVendor);

    await prisma.auditLog.create({
        data: {
            userId: 'SYSTEM',
            role: 'Admin',
            action: 'CREATE_VENDOR',
            entity: 'Vendor',
            entityId: newVendor.id,
            details: `Added new vendor "${newVendor.name}" (pending verification).`,
        }
    });

    return NextResponse.json(newVendor, { status: 201 });
  } catch (error) {
    console.error('Failed to create vendor:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process vendor', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
