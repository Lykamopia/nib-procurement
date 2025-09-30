'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import type { User, UserRole } from '@/lib/types';

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                vendor: true,
                department: true,
                committeeAssignments: true,
            }
        });

        if (user && user.password && await bcrypt.compare(password, user.password)) {
            const mockToken = `mock-token-for-${user.id}__ROLE__${user.role}__TS__${Date.now()}`;
            const { password: _, ...userWithoutPassword } = user;

            return NextResponse.json({ 
                user: userWithoutPassword, 
                token: mockToken, 
                role: user.role 
            });
        }
        
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
    }
}
