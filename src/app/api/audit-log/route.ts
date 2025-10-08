
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        user: {
            include: {
                role: true
            }
        }, 
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    const formattedLogs = logs.map(log => {
        let roleName = 'System';
        if (log.user && log.user.role) {
            // This handles the case where user.role could be an object with a name property
            if (typeof log.user.role === 'object' && log.user.role.name) {
                 roleName = log.user.role.name.replace(/_/g, ' ');
            }
        }

        return {
            ...log,
            user: log.user?.name || 'System',
            role: roleName,
        }
    });

    return NextResponse.json(formattedLogs);
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to fetch audit logs', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unknown error occurred while fetching audit logs' }, { status: 500 });
  }
}
