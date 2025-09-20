
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { users } from '@/lib/data-store';
// Note: scoring-service would also need to be updated to use Prisma
import { tallyAndAwardScores } from '@/services/scoring-service';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const requisitionId = params.id;
  try {
    const body = await request.json();
    const { userId, awardResponseDeadline } = body;

    const user = users.find(u => u.id === userId);
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'Procurement Officer' && user.role !== 'Committee') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // This service call abstracts the complex logic of tallying and awarding.
    // It would need to be refactored to use Prisma internally.
    // For now, we assume it works with the database.
    const result = await tallyAndAwardScores(requisitionId, awardResponseDeadline ? new Date(awardResponseDeadline) : undefined);

    if (!result.success) {
        throw new Error(result.message);
    }
    
    // auditLogs.unshift({ ... });

    return NextResponse.json({ message: 'Scores finalized and awards have been made.' });
  } catch (error) {
    console.error('Failed to finalize scores:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
