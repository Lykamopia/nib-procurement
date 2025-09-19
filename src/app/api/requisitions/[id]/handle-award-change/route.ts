
'use server';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type AwardAction = 'promote_second' | 'promote_third' | 'restart_rfq';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log(`POST /api/requisitions/${params.id}/handle-award-change`);
  try {
    const requisitionId = params.id;
    const body = await request.json();
    console.log('Request body:', body);
    const { userId, action, newDeadline } = body as { userId: string; action: AwardAction, newDeadline?: string };

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const requisition = await prisma.purchaseRequisition.findUnique({ where: { id: requisitionId } });
    if (!requisition) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    const reqQuotes = await prisma.quotation.findMany({ where: { requisitionId }});
    const currentAwarded = reqQuotes.find(q => q.status === 'Awarded');
    const secondStandby = reqQuotes.find(q => q.rank === 2);
    const thirdStandby = reqQuotes.find(q => q.rank === 3);
    let auditDetails = ``;

    switch (action) {
      case 'promote_second':
        if (!currentAwarded || !secondStandby) {
          return NextResponse.json({ error: 'Invalid state for promoting second vendor.' }, { status: 400 });
        }
        await prisma.quotation.update({ where: { id: currentAwarded.id }, data: { status: 'Failed' } });
        await prisma.quotation.update({ where: { id: secondStandby.id }, data: { status: 'Awarded', rank: 1 } });
        
        if (thirdStandby) {
            await prisma.quotation.update({ where: { id: thirdStandby.id }, data: { rank: 2 } });
        }
        auditDetails = `Promoted second standby vendor (${secondStandby.vendorName}) to Awarded after primary vendor failure.`;
        break;

      case 'promote_third':
        if (!currentAwarded || !thirdStandby) {
          return NextResponse.json({ error: 'Invalid state for promoting third vendor.' }, { status: 400 });
        }
        await prisma.quotation.update({ where: { id: currentAwarded.id }, data: { status: 'Failed' } });
        await prisma.quotation.update({ where: { id: thirdStandby.id }, data: { status: 'Awarded', rank: 1 } });
        if(secondStandby) {
            await prisma.quotation.update({ where: { id: secondStandby.id }, data: { status: 'Rejected' } });
        }
        auditDetails = `Promoted third standby vendor (${thirdStandby.vendorName}) to Awarded after other vendors failed.`;
        break;

      case 'restart_rfq':
        await prisma.quotation.deleteMany({ where: { requisitionId } });
        
        await prisma.purchaseRequisition.update({
            where: { id: requisitionId },
            data: {
                status: 'Approved',
                deadline: null,
                awardResponseDeadline: null,
            }
        });
        auditDetails = `Canceled all awards and restarted RFQ process for requisition ${requisitionId}. All previous quotes have been deleted.`;
        break;

      default:
        return NextResponse.json({ error: 'Invalid action specified.' }, { status: 400 });
    }
    
    await prisma.purchaseRequisition.update({
        where: { id: requisitionId },
        data: {
            awardResponseDeadline: newDeadline ? new Date(newDeadline) : null,
            updatedAt: new Date()
        }
    });

    await prisma.auditLog.create({
        data: {
            userId: user.id,
            role: user.role,
            action: 'HANDLE_AWARD_CHANGE',
            entity: 'Requisition',
            entityId: requisitionId,
            details: auditDetails,
        }
    });

    const updatedRequisition = await prisma.purchaseRequisition.findUnique({ where: { id: requisitionId } });

    return NextResponse.json({ message: 'Award change handled successfully.', requisition: updatedRequisition });
  } catch (error) {
    console.error('Failed to handle award change:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
