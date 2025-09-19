
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { UserRole } from '@/lib/types';

export async function POST(request: Request) {
    try {
        const { token } = await request.json();

        console.log("Attempting to verify token.");
        if (!token || !token.startsWith('mock-token-for-')) {
            console.error("Invalid token format.");
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
        
        const tokenContent = token.substring('mock-token-for-'.length);
        const [userId, rolePart] = tokenContent.split('__ROLE__');
        const [userRole] = rolePart.split('__TS__');
        
        console.log(`Parsed token -> userId: ${userId}, role: ${userRole}`);
        const user = await prisma.user.findUnique({ 
            where: { id: userId },
            include: {
                department: true,
                committeeAssignments: true,
            }
        });

        if (user && user.role === userRole) {
          console.log("Token valid. Found user:", user);
          const { password: _, ...userWithoutPassword } = user;
          
          const clientRole = user.role.replace(/_/g, ' ') as UserRole;

          return NextResponse.json({ user: userWithoutPassword, role: clientRole });
        }
        
        console.error("User from token not found or role mismatch.");
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    } catch(e) {
        console.error("Failed to parse token:", e);
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
}
