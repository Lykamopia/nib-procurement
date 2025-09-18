
'use server';

import { NextResponse } from 'next/server';
import { auditLogs, users } from '@/lib/data-store';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const requisitionId = params.id;
  try {
    const body = await request.json();
    const { userId } = body;

    const user = users.find(u => u.id === userId);
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'Committee Member') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    if (!user.committeeAssignments) {
        user.committeeAssignments = [];
    }

    const assignment = user.committeeAssignments.find(a => a.requisitionId === requisitionId);

    if (assignment) {
        assignment.scoresSubmitted = true;
    } else {
        user.committeeAssignments.push({ requisitionId, scoresSubmitted: true });
    }

    auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date(),
        user: user.name,
        role: user.role,
        action: 'SUBMIT_ALL_SCORES',
        entity: 'Requisition',
        entityId: requisitionId,
        details: `Finalized and submitted all scores for the requisition.`,
    });

    return NextResponse.json({ message: 'All scores have been successfully submitted.' });
  } catch (error) {
    console.error('Failed to submit final scores:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
