
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const roles = await prisma.role.findMany({
        include: {
            permissions: {
              include: {
                permission: true
              }
            },
            users: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                }
            }
        }
    });

    const formattedRoles = roles.map(role => ({
      ...role,
      permissions: role.permissions.map(p => p.permission)
    }));

    return NextResponse.json(formattedRoles);
  } catch (error) {
    console.error("Failed to fetch roles:", error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to fetch roles', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
  }
}
