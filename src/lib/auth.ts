

import { User as PrismaUser } from '@prisma/client';
import type { User, UserRole, Vendor } from './types';

type VendorDetails = {
    contactPerson: string;
    address: string;
    phone: string;
}

export async function register(
    name: string, 
    email: string, 
    password: string, 
    role: UserRole,
    vendorDetails?: VendorDetails
): Promise<{ user: User; token: string; role: UserRole } | null> {
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role, vendorDetails })
        });
        if (!response.ok) {
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error("Registration fetch error:", error);
        return null;
    }
}


export async function login(email: string, password: string): Promise<{ user: User; token: string; role: UserRole } | null> {
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            return null;
        }
        return await response.json();

    } catch(error) {
        console.error("Login fetch error:", error);
        return null;
    }
}

export async function getUserByToken(token: string): Promise<{ user: User, role: UserRole } | null> {
    console.log("Attempting to get user by token.");
    if (!token.startsWith('mock-token-for-')) {
        console.error("Invalid token format.");
        return null;
    }

    try {
        const response = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });
        if (!response.ok) {
            return null;
        }
        return await response.json();
    } catch(e) {
        console.error("Failed to verify token:", e);
        return null;
    }
}

export async function getAllUsers(): Promise<User[]> {
    try {
        const response = await fetch('/api/users');
        if (!response.ok) {
            return [];
        }
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch all users:", error);
        return [];
    }
}
