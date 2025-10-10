
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import type { User, UserRole } from '@/lib/types';

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                vendor: true,
                department: true,
                committeeAssignments: true,
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }

        const isPasswordValid = user.password ? await bcrypt.compare(password, user.password) : false;

        if (!isPasswordValid) {
            return NextResponse.json({ error: 'Invalid password.' }, { status: 401 });
        }

        const { password: _, ...userWithoutPassword } = user;
        
        const finalUser: User = {
            ...userWithoutPassword,
            role: user.role.replace(/_/g, ' ') as UserRole,
            department: user.department?.name
        };

        // Create a more robust mock token
        const userString = JSON.stringify(finalUser);
        const base64User = Buffer.from(userString).toString('base64');
        const mockToken = `mock-token-for-${base64User}__TS__${Date.now()}`;

        return NextResponse.json({ 
            user: finalUser, 
            token: mockToken, 
            role: finalUser.role
        });

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
    }
}
