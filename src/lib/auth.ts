

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
    if (!token.startsWith('mock-token-for-')) {
        return null;
    }
    
    try {
        const userStr = Buffer.from(token.split('__TS__')[0].replace('mock-token-for-', ''), 'base64').toString('utf-8');
        const user = JSON.parse(userStr);
        return { user, role: user.role };
    } catch(e) {
        console.error("Failed to parse token:", e);
        return null;
    }
}

    