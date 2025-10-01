

import type { User, UserRole, Vendor } from './types';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

type VendorDetails = {
    contactPerson: string;
    address: string;
    phone: string;
    licensePath: string;
    taxIdPath: string;
}

export async function getUserByToken(token: string): Promise<{ user: User, role: UserRole } | null> {
    console.log("Attempting to get user by token.");
    if (!token.startsWith('mock-token-for-')) {
        console.error("Invalid token format.");
        return null;
    }

    try {
        const tokenContent = token.substring('mock-token-for-'.length);
        const [userId, rolePart] = tokenContent.split('__ROLE__');
        
        if (!userId || !rolePart) {
             console.error("Invalid token structure.");
             return null;
        }

        const [userRole] = rolePart.split('__TS__');
        
        console.log(`Parsed token -> userId: ${userId}, role: ${userRole}`);
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                vendor: true,
                department: true,
                committeeAssignments: true,
            }
        });

        if (user && user.role === userRole) {
          console.log("Token valid. Found user:", user.email);
          const { password, ...userWithoutPassword } = user;
          return { user: userWithoutPassword as User, role: user.role as UserRole };
        }
        console.error("User from token not found or role mismatch.");
    } catch(e) {
        console.error("Failed to parse token:", e);
        return null;
    }
    return null;
}
