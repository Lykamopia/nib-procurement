
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { users } from '@/lib/auth-store';

type AwardAction = 'promote_second' | 'promote_third' | 'restart_rfq';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const requisitionId = params.id;
  try {
    const body = await request.json();
    const { userId, action, newDeadline } = body as { userId: string; action: AwardAction, newDeadline?: string };

    const user = users.find(u => u.id === userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const transaction = await prisma.$transaction(async (tx) => {
        const requisition = await tx.purchaseRequisition.findUnique({ where: { id: requisitionId }});
        if (!requisition) {
          throw new Error('Requisition not found');
        }

        const reqQuotes = await tx.quotation.findMany({ where: { requisitionId }});
        const currentAwarded = reqQuotes.find(q => q.status === 'Awarded');
        const secondStandby = reqQuotes.find(q => q.rank === 2);
        const thirdStandby = reqQuotes.find(q => q.rank === 3);

        switch (action) {
        case 'promote_second':
            if (!currentAwarded || !secondStandby) {
                throw new Error('Invalid state for promoting second vendor.');
            }
            await tx.quotation.update({ where: { id: currentAwarded.id }, data: { status: 'Failed' } });
            await tx.quotation.update({ where: { id: secondStandby.id }, data: { status: 'Awarded', rank: 1 } });
            if (thirdStandby) {
                await tx.quotation.update({ where: { id: thirdStandby.id }, data: { rank: 2 } });
            }
            break;
        case 'promote_third':
             if (!currentAwarded || !thirdStandby) {
                throw new Error('Invalid state for promoting third vendor.');
            }
            await tx.quotation.update({ where: { id: currentAwarded.id }, data: { status: 'Failed' } });
            await tx.quotation.update({ where: { id: thirdStandby.id }, data: { status: 'Awarded', rank: 1 } });
            if(secondStandby) {
                await tx.quotation.update({ where: { id: secondStandby.id }, data: { status: 'Rejected' } });
            }
            break;
        case 'restart_rfq':
            await tx.quotation.deleteMany({ where: { requisitionId }});
            return await tx.purchaseRequisition.update({
                where: { id: requisitionId },
                data: { status: 'Approved', deadline: null, awardResponseDeadline: null }
            });
        default:
            throw new Error('Invalid action specified.');
        }

        return await tx.purchaseRequisition.update({
            where: { id: requisitionId },
            data: { awardResponseDeadline: newDeadline ? new Date(newDeadline) : null }
        });
    });

    return NextResponse.json({ message: 'Award change handled successfully.', requisition: transaction });
  } catch (error) {
    console.error('Failed to handle award change:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
