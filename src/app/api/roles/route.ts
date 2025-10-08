
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const roles = await prisma.role.findMany({
        include: {
            permissions: true
        }
    });
    return NextResponse.json(roles);
  } catch (error) {
    console.error("Failed to fetch roles:", error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to fetch roles', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
  }
}
