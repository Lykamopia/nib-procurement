
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const vendorId = params.id;
  try {
    const body = await request.json();
    const { name, contactPerson, phone, address, licensePath, taxIdPath } = body;

    // Find the vendor and its existing KYC documents
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: { kycDocuments: true },
    });

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const updatedVendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        name,
        contactPerson,
        phone,
        address,
        kycStatus: 'Pending', // Reset status to Pending for re-verification
        rejectionReason: null,
      },
    });

    // Update or Create KYC Documents
    if (licensePath) {
        await prisma.kYC_Document.upsert({
            where: { 
                vendorId_name: {
                    vendorId: vendorId,
                    name: 'Business License'
                }
            },
            update: { url: licensePath, submittedAt: new Date() },
            create: { vendorId, name: 'Business License', url: licensePath, submittedAt: new Date() },
        });
    }
     if (taxIdPath) {
        await prisma.kYC_Document.upsert({
            where: { 
                vendorId_name: {
                    vendorId: vendorId,
                    name: 'Tax ID Document'
                }
            },
            update: { url: taxIdPath, submittedAt: new Date() },
            create: { vendorId, name: 'Tax ID Document', url: taxIdPath, submittedAt: new Date() },
        });
    }

    await prisma.auditLog.create({
      data: {
        user: { connect: { id: vendor.userId } },
        timestamp: new Date(),
        action: 'RESUBMIT_KYC',
        entity: 'Vendor',
        entityId: vendorId,
        details: `Vendor ${name} resubmitted their KYC documents and profile for verification.`,
      },
    });

    return NextResponse.json({ message: 'Profile updated and resubmitted for verification.' });
  } catch (error) {
    console.error('Failed to resubmit KYC:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
