
'use server';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log(`GET /api/requisitions/${params.id}`);
  try {
    const { id } = params;
    const requisition = await prisma.purchaseRequisition.findUnique({
        where: { id },
        include: {
            items: true,
            customQuestions: true,
            evaluationCriteria: {
                include: {
                    financialCriteria: true,
                    technicalCriteria: true,
                },
            },
            quotations: {
                include: {
                    items: true,
                    answers: true,
                    scores: true,
                }
            }
        }
    });

    if (!requisition) {
      console.error(`Requisition with ID ${id} not found.`);
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }
    
    console.log('Found requisition:', requisition);
    return NextResponse.json(requisition);
  } catch (error) {
     console.error('Failed to fetch requisition:', error);
     if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log(`DELETE /api/requisitions/${params.id}`);
  try {
    const { id } = params;
    const body = await request.json();
    const { userId } = body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const requisition = await prisma.purchaseRequisition.findUnique({ where: { id } });
    if (!requisition) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    if (requisition.requesterId !== userId) {
      return NextResponse.json({ error: 'You are not authorized to delete this requisition.' }, { status: 403 });
    }

    if (requisition.status !== 'Draft' && requisition.status !== 'Pending_Approval') {
      return NextResponse.json({ error: `Cannot delete a requisition with status "${requisition.status}".` }, { status: 403 });
    }
    
    await prisma.purchaseRequisition.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        role: user.role,
        action: 'DELETE',
        entity: 'Requisition',
        entityId: id,
        details: `Deleted requisition "${requisition.title}".`,
      }
    });

    return NextResponse.json({ message: 'Requisition deleted successfully.' });
  } catch (error) {
     console.error('Failed to delete requisition:', error);
     if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
