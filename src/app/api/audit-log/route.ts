
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const auditLogs = await prisma.auditLog.findMany({
    orderBy: {
      timestamp: 'desc'
    },
    include: {
        user: {
            select: {
                name: true
            }
        }
    }
  });

  const formattedLogs = auditLogs.map(log => ({
      ...log,
      user: log.user?.name || 'System'
  }));

  return NextResponse.json(formattedLogs);
}
