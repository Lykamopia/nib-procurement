
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import type { User, UserRole } from '@/lib/types';

export async function POST(request: Request) {
    try {
        const { name, email, password, role, vendorDetails } = await request.json();

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: 'Vendor', // All registrations are for Vendors
            }
        });

        if (role === 'Vendor' && vendorDetails) {
            const newVendor = await prisma.vendor.create({
                data: {
                    name: name,
                    contactPerson: vendorDetails.contactPerson,
                    email: email,
                    phone: vendorDetails.phone,
                    address: vendorDetails.address,
                    userId: newUser.id,
                    kycStatus: 'Pending',
                    kycDocuments: {
                        create: [
                            { name: 'Business License', url: vendorDetails.licensePath, submittedAt: new Date() },
                            { name: 'Tax ID Document', url: vendorDetails.taxIdPath, submittedAt: new Date() },
                        ]
                    }
                }
            });
            await prisma.user.update({
                where: { id: newUser.id },
                data: { vendorId: newVendor.id }
            });
        }
        
        const mockToken = `mock-token-for-${newUser.id}__ROLE__${newUser.role}__TS__${Date.now()}`;
        const { password: _, ...userWithoutPassword } = newUser;

        return NextResponse.json({ 
            user: userWithoutPassword, 
            token: mockToken, 
            role: newUser.role 
        }, { status: 201 });

    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
    }
}
