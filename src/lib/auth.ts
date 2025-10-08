
import type { User, Role } from './types';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

export async function getUserByToken(token: string): Promise<{ user: User, role: Role } | null> {
    if (!token.startsWith('mock-token-for-')) {
        return null;
    }
    
    try {
        const userStr = Buffer.from(token.split('__TS__')[0].replace('mock-token-for-', ''), 'base64').toString('utf-8');
        const parsedUser = JSON.parse(userStr);

        // Fetch the full user object from DB to get fresh permissions
        const fullUser = await prisma.user.findUnique({
            where: { id: parsedUser.id },
            include: {
                role: {
                    include: {
                        permissions: true,
                    },
                },
                department: true,
            },
        });

        if (!fullUser) return null;
        
        const { password: _, ...userWithoutPassword } = fullUser;

        return { user: userWithoutPassword as User, role: fullUser.role };

    } catch(e) {
        console.error("Failed to parse token:", e);
        return null;
    }
}
