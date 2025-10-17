
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { User, UserRole } from '@/lib/types';

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                department: true,
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (user && user.password && (await bcrypt.compare(password, user.password))) {
            const { password: _, ...userWithoutPassword } = user;
            
            const finalUser: User = {
                ...userWithoutPassword,
                role: user.role as UserRole, // Use the role directly from the DB
                department: user.department?.name,
            };

            const jwtSecret = process.env.JWT_SECRET;
            if (!jwtSecret) {
                throw new Error('JWT_SECRET is not defined in environment variables.');
            }

            const token = jwt.sign(
                { 
                    id: finalUser.id, 
                    name: finalUser.name,
                    email: finalUser.email,
                    role: finalUser.role, // This will have underscores, e.g., 'Procurement_Officer'
                    vendorId: finalUser.vendorId,
                    department: finalUser.department,
                }, 
                jwtSecret, 
                { expiresIn: '1d' } // Token expires in 1 day
            );
            
            return NextResponse.json({ 
                user: finalUser, 
                token, 
                role: finalUser.role 
            });
        }
        
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });

    } catch (error) {
        console.error('Login error:', error);
        if (error instanceof Error) {
            return NextResponse.json({ error: 'An internal server error occurred', details: error.message }, { status: 500 });
        }
        return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
    }
}
