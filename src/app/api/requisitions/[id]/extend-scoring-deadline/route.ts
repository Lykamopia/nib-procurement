
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { User, UserRole } from '@/lib/types';
import { format } from 'date-fns';
import { rolePermissions } from '@/lib/roles'; // Assuming settings might be stored here or similar config place

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { userId, newDeadline } = body;

    const user: User | null = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // In a real app, settings would be fetched from a DB. We'll simulate fetching a setting.
    // This is a placeholder for a real settings service.
    const rfqSenderSetting = { type: 'all' }; // Or 'specific', with a userId

    let isAuthorized = false;
    if (user.role === 'Admin') {
        isAuthorized = true;
    } else if (rfqSenderSetting.type === 'all' && user.role === 'Procurement_Officer') {
        isAuthorized = true;
    } else if (rfqSenderSetting.type === 'specific' && rfqSenderSetting.userId === userId) {
        isAuthorized = true;
    }

    if (!isAuthorized) {
        return NextResponse.json({ error: 'Unauthorized: You do not have permission to extend deadlines.' }, { status: 403 });
    }

    if (!newDeadline) {
        return NextResponse.json({ error: 'New deadline is required.' }, { status: 400 });
    }
    
    const requisition = await prisma.purchaseRequisition.findUnique({ where: { id }});
    if (!requisition) {
       return NextResponse.json({ error: 'Requisition not found.' }, { status: 404 });
    }

    const oldDeadline = requisition.scoringDeadline;
    const updatedRequisition = await prisma.purchaseRequisition.update({
        where: { id },
        data: {
            scoringDeadline: new Date(newDeadline)
        }
    });

    await prisma.auditLog.create({
        data: {
            user: { connect: { id: userId } },
            action: 'EXTEND_SCORING_DEADLINE',
            entity: 'Requisition',
            entityId: id,
            details: `Extended committee scoring deadline from ${oldDeadline ? format(new Date(oldDeadline), 'PPp') : 'N/A'} to ${format(new Date(newDeadline), 'PPpp')}.`,
        }
    });


    return NextResponse.json(updatedRequisition);

  } catch (error) {
    console.error('Failed to extend scoring deadline:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
