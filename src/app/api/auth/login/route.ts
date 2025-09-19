
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import type { User, UserRole } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    console.log(`Login API attempt for email: ${email}`);
    
    const user = await prisma.user.findUnique({ 
        where: { email },
        include: { 
            department: true,
            committeeAssignments: true,
        }
    });

    if (user && user.password === password) { // DO NOT use this in production
        console.log("Login successful, user found:", user);
        const mockToken = `mock-token-for-${user.id}__ROLE__${user.role}__TS__${Date.now()}`;
        const { password: _, ...userWithoutPassword } = user;
        
        const clientRole = user.role.replace(/_/g, ' ') as UserRole;

        return NextResponse.json({ user: userWithoutPassword, token: mockToken, role: clientRole });
    }

    console.error(`Login failed for email: ${email}. User not found or password incorrect.`);
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
