
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { User, UserRole } from '@/lib/types';

export async function POST(request: Request) {
    console.log("LOGIN API: Received login request.");
    try {
        const { email, password } = await request.json();
        console.log(`LOGIN API: Attempting login for email: ${email}`);

        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                vendor: true,
                department: true,
            }
        });

        if (!user) {
            console.error(`LOGIN API: User not found for email: ${email}`);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        console.log("LOGIN API: Found user in database:", { id: user.id, name: user.name, role: user.role, department: user.department?.name });


        if (user && user.password && await bcrypt.compare(password, user.password)) {
            const { password: _, ...userWithoutPassword } = user;
            
            const finalUser: User = {
                ...userWithoutPassword,
                role: user.role as UserRole,
                department: user.department?.name,
            };
            console.log("LOGIN API: Password validated. Preparing token for user:", finalUser);


            const jwtSecret = process.env.JWT_SECRET;
            if (!jwtSecret) {
                console.error("LOGIN API: JWT_SECRET is not defined!");
                throw new Error('JWT_SECRET is not defined in environment variables.');
            }

            const tokenPayload = { 
                id: finalUser.id, 
                name: finalUser.name,
                email: finalUser.email,
                role: finalUser.role,
                vendorId: finalUser.vendorId,
                department: finalUser.department,
            };

            const token = jwt.sign(
                tokenPayload, 
                jwtSecret, 
                { expiresIn: '1d' } // Token expires in 1 day
            );

            console.log("LOGIN API: Token generated successfully. Payload:", tokenPayload);
            
            return NextResponse.json({ 
                user: finalUser, 
                token, 
                role: finalUser.role
            });
        }
        
        console.warn(`LOGIN API: Invalid password for email: ${email}`);
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });

    } catch (error) {
        console.error('LOGIN API: An unexpected error occurred:', error);
        if (error instanceof Error) {
            return NextResponse.json({ error: 'An internal server error occurred', details: error.message }, { status: 500 });
        }
        return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
    }
}
