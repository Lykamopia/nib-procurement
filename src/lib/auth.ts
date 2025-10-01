

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
        
        // This is a simplified mock. In a real app, you'd validate the token against a session store.
        const userFromLocalStorage = JSON.parse(localStorage.getItem('user') || '{}');
        
        if (userFromLocalStorage && userFromLocalStorage.id === userId) {
            console.log("Token valid. Found user in localStorage:", userFromLocalStorage.email);
            return { user: userFromLocalStorage, role: userFromLocalStorage.role };
        }
        
        console.error("User from token not found in localStorage.");
    } catch(e) {
        console.error("Failed to parse token:", e);
        return null;
    }
    return null;
}
