
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { users } from '@/lib/data-store';
import { format } from 'date-fns';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { userId, newDeadline } = body;

    const user = users.find(u => u.id === userId);
    if (!user || user.role !== 'Procurement Officer') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!newDeadline) {
        return NextResponse.json({ error: 'New deadline is required.' }, { status: 400 });
    }

    const updatedRequisition = await prisma.purchaseRequisition.update({
        where: { id },
        data: {
            scoringDeadline: new Date(newDeadline)
        }
    });

    // auditLogs.unshift({ ... });

    return NextResponse.json(updatedRequisition);

  } catch (error) {
    console.error('Failed to extend scoring deadline:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
