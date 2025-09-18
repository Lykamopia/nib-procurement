
'use server';

import { NextResponse } from 'next/server';
import { requisitions, auditLogs, users } from '@/lib/data-store';
import { format } from 'date-fns';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { userId, newDeadline } = body;

    const requisition = requisitions.find((r) => r.id === id);
    if (!requisition) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    const user = users.find(u => u.id === userId);
    if (!user || user.role !== 'Procurement Officer') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!newDeadline) {
        return NextResponse.json({ error: 'New deadline is required.' }, { status: 400 });
    }

    requisition.scoringDeadline = new Date(newDeadline);
    requisition.updatedAt = new Date();

    const auditLogEntry = {
        id: `log-${Date.now()}`,
        timestamp: new Date(),
        user: user.name,
        role: user.role,
        action: 'EXTEND_SCORING_DEADLINE' as const,
        entity: 'Requisition',
        entityId: id,
        details: `Extended committee scoring deadline to ${format(new Date(newDeadline), 'PPpp')}.`,
    };
    auditLogs.unshift(auditLogEntry);

    return NextResponse.json(requisition);

  } catch (error) {
    console.error('Failed to extend scoring deadline:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
