
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import type { UserRole } from '@/lib/types';

export async function POST(request: Request) {
    try {
        const { name, email, password, role, vendorDetails } = await request.json();

        console.log(`Registering user with email: ${email}`);
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            console.error("Registration failed: User already exists.");
            return NextResponse.json({ error: 'User already exists' }, { status: 409 });
        }
        
        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password, // Should be hashed
                role: 'Vendor',
            }
        });

        if (role === 'Vendor' && vendorDetails) {
            const newVendor = await prisma.vendor.create({
                data: {
                    user: { connect: { id: newUser.id } },
                    name: name,
                    contactPerson: vendorDetails.contactPerson,
                    email: email,
                    phone: vendorDetails.phone,
                    address: vendorDetails.address,
                    kycStatus: 'Pending',
                    kycDocuments: {
                        create: [
                            { name: 'Business License', url: '/placeholder-document.pdf', submittedAt: new Date() },
                            { name: 'Tax ID Document', url: '/placeholder-document.pdf', submittedAt: new Date() },
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
        console.log(`Registration successful for ${email}.`);
        return NextResponse.json({ user: userWithoutPassword, token: mockToken, role: newUser.role });

    } catch (error) {
        console.error('Registration API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
