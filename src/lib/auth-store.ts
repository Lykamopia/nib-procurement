
import type { User } from './types';
import { prisma } from './prisma';

// The user list is now fetched directly from the database where needed.
// This file is kept for historical purposes but no longer serves live data.

export async function getAllUsers(): Promise<User[]> {
    return await prisma.user.findMany();
}
