
'use server';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { addDays } from 'date-fns';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log(`GET /api/quotations/${params.id}`);
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
            scores: {
              include: {
                financialScores: true,
                technicalScores: true,
              },
            },
          },
        },
      },
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


export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
    const quoteId = params.id;
    console.log(`PATCH /api/quotations/${quoteId}`);
    try {
        const body = await request.json();
        const { userId, items, notes, answers } = body;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        
        const quote = await prisma.quotation.findUnique({ where: { id: quoteId } });
        if (!quote) {
            return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
        }

        const isAwardProcessStarted = await prisma.quotation.count({
            where: { 
                requisitionId: quote.requisitionId,
                status: { in: ['Awarded', 'Standby'] }
            }
        }) > 0;
        
        if (isAwardProcessStarted) {
            return NextResponse.json({ error: 'Cannot edit quote after award process has started.' }, { status: 403 });
        }
        
        let totalPrice = 0;
        let maxLeadTime = 0;
        items.forEach((item: any) => {
            totalPrice += item.unitPrice * item.quantity;
            if (item.leadTimeDays > maxLeadTime) {
                maxLeadTime = item.leadTimeDays;
            }
        });

        // Delete old items and answers before creating new ones
        await prisma.quoteItem.deleteMany({ where: { quotationId: quoteId } });
        await prisma.quoteAnswer.deleteMany({ where: { quotationId: quoteId } });


        const updatedQuote = await prisma.quotation.update({
            where: { id: quoteId },
            data: {
                items: {
                    create: items.map((item: any) => ({
                        requisitionItemId: item.requisitionItemId,
                        name: item.name,
                        quantity: item.quantity,
                        unitPrice: Number(item.unitPrice),
                        leadTimeDays: Number(item.leadTimeDays),
                    }))
                },
                totalPrice,
                deliveryDate: addDays(new Date(), maxLeadTime),
                notes: notes,
                answers: {
                    create: answers.map((answer: any) => ({
                        questionId: answer.questionId,
                        answer: answer.answer
                    }))
                },
                createdAt: new Date(),
            }
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                role: user.role,
                action: 'UPDATE_QUOTATION',
                entity: 'Quotation',
                entityId: quoteId,
                details: `Updated quote for requisition ${quote.requisitionId}.`,
            }
        });

        return NextResponse.json(updatedQuote, { status: 200 });

    } catch (error) {
        console.error('Failed to update quote:', error);
        if (error instanceof Error) {
            return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
        }
        return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
    }
}
