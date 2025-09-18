
'use server';

import { NextResponse } from 'next/server';
import { requisitions, auditLogs, users } from '@/lib/data-store';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { 
        userId, 
        financialCommitteeMemberIds, 
        technicalCommitteeMemberIds,
        committeeName, 
        committeePurpose, 
        scoringDeadline 
    } = body;

    const requisition = requisitions.find((r) => r.id === id);
    if (!requisition) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    const user = users.find(u => u.id === userId);
    if (!user || (user.role !== 'Procurement Officer' && user.role !== 'Committee')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    requisition.financialCommitteeMemberIds = financialCommitteeMemberIds;
    requisition.technicalCommitteeMemberIds = technicalCommitteeMemberIds;
    requisition.committeeName = committeeName;
    requisition.committeePurpose = committeePurpose;
    requisition.scoringDeadline = scoringDeadline ? new Date(scoringDeadline) : undefined;
    requisition.updatedAt = new Date();

    const allMemberIds = [...(financialCommitteeMemberIds || []), ...(technicalCommitteeMemberIds || [])];
    const committeeNames = users.filter(u => allMemberIds.includes(u.id)).map(u => u.name);

    const auditLogEntry = {
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        user: user.name,
        role: user.role,
        action: 'ASSIGN_COMMITTEE',
        entity: 'Requisition',
        entityId: id,
        details: `Assigned committee "${committeeName}" with members: ${committeeNames.join(', ')}.`,
    };
    auditLogs.unshift(auditLogEntry);

    return NextResponse.json(requisition);

  } catch (error) {
    console.error('Failed to assign committee:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
