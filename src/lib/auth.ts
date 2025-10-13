

import type { User, UserRole } from './types';
import jwt, { JwtPayload } from 'jsonwebtoken';

export async function getUserByToken(token: string): Promise<{ user: User, role: UserRole } | null> {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        console.error('JWT_SECRET is not defined in environment variables.');
        return null;
    }
    
    try {
        const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

        // The decoded object is the payload you signed
        const user: User = {
            id: decoded.id,
            name: decoded.name,
            email: decoded.email,
            role: decoded.role,
            vendorId: decoded.vendorId,
            department: decoded.department,
        };

        return { user, role: user.role };
    } catch(e) {
        console.error("Failed to verify token:", e);
        return null;
    }
}
