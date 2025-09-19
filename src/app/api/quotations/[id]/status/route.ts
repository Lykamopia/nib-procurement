
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { QuotationStatus } from '@prisma/client';

type StatusUpdate = {
    quoteId: string;
    status: QuotationStatus;
    rank?: 1 | 2 | 3 | null;
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log(`PATCH /api/quotations/status for requisition ${params.id}`);
  try {
    const requisitionId = params.id;
    const body = await request.json();
    console.log('Request body:', body);
    const { updates, userId } = body as { updates: StatusUpdate[], userId: string };

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        console.error('User not found for ID:', userId);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const requisition = await prisma.purchaseRequisition.findUnique({ where: { id: requisitionId } });
    if (!requisition) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    let auditDetails = `Updated quote statuses for requisition ${requisitionId}: `;
    
    for(const update of updates) {
        await prisma.quotation.update({
            where: { id: update.quoteId },
            data: {
                status: update.status,
                rank: update.rank
            }
        });
        auditDetails += `Set ${update.quoteId} to ${update.status} (Rank: ${update.rank || 'N/A'}). `;
    }

    const updatedQuoteIds = new Set(updates.map(u => u.quoteId));
    await prisma.quotation.updateMany({
      where: {
        requisitionId: requisitionId,
        id: { notIn: Array.from(updatedQuoteIds) }
      },
      data: {
        status: 'Rejected',
        rank: null
      }
    });
    
    if (updates.some(u => u.status === 'Awarded')) {
        await prisma.purchaseRequisition.update({
            where: { id: requisitionId },
            data: {
                status: 'RFQ_In_Progress',
                updatedAt: new Date()
            }
        });
    }
    
    await prisma.auditLog.create({
        data: {
            userId: user.id,
            role: user.role,
            action: 'UPDATE_QUOTES_STATUS',
            entity: 'Requisition',
            entityId: requisitionId,
            details: auditDetails,
        }
    });

    const updatedQuotes = await prisma.quotation.findMany({ where: { requisitionId }});
    return NextResponse.json(updatedQuotes);
  } catch (error) {
    console.error('Failed to update quotation statuses:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
