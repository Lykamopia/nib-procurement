
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        user: {
            include: {
                role: true // Include the nested role object
            }
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    const formattedLogs = logs.map(log => ({
        ...log,
        user: log.user?.name || 'System', // Fallback for system actions
        role: log.user?.role?.name.replace(/_/g, ' ') || 'System',
    }));

    return NextResponse.json(formattedLogs);
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to fetch audit logs', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unknown error occurred while fetching audit logs' }, { status: 500 });
  }
}
