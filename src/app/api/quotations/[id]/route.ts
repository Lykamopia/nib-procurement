
'use server';

import { NextResponse } from 'next/server';
import { quotations, auditLogs, requisitions } from '@/lib/data-store';
import { users } from '@/lib/auth-store';
import { Quotation } from '@/lib/types';
import { addDays } from 'date-fns';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log(`GET /api/quotations/${params.id}`);
  try {
    const { id } = params;
    const requisition = requisitions.find((r) => r.id === id);

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

        const user = users.find(u => u.id === userId);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        
        const quoteIndex = quotations.findIndex(q => q.id === quoteId);
        if (quoteIndex === -1) {
            return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
        }

        const quote = quotations[quoteIndex];
        
        // Check if any quote for this requisition is already awarded or on standby
        const isAwardProcessStarted = quotations.some(q => q.requisitionId === quote.requisitionId && (q.status === 'Awarded' || q.status === 'Standby'));
        if (isAwardProcessStarted) {
            return NextResponse.json({ error: 'Cannot edit quote after award process has started.' }, { status: 403 });
        }
        
        let totalPrice = 0;
        let maxLeadTime = 0;
        const quoteItems = items.map((item: any) => {
            totalPrice += item.unitPrice * item.quantity;
            if (item.leadTimeDays > maxLeadTime) {
                maxLeadTime = item.leadTimeDays;
            }
            return {
                requisitionItemId: item.requisitionItemId,
                name: item.name,
                quantity: item.quantity,
                unitPrice: Number(item.unitPrice),
                leadTimeDays: Number(item.leadTimeDays),
            };
        });

        const updatedQuote: Quotation = {
            ...quote,
            items: quoteItems,
            totalPrice,
            deliveryDate: addDays(new Date(), maxLeadTime),
            notes: notes,
            answers: answers,
            createdAt: new Date(), // Update timestamp to reflect edit time
        };

        quotations[quoteIndex] = updatedQuote;

        auditLogs.unshift({
            id: `log-${Date.now()}`,
            timestamp: new Date(),
            user: user.name,
            role: user.role,
            action: 'UPDATE_QUOTATION',
            entity: 'Quotation',
            entityId: quoteId,
            details: `Updated quote for requisition ${quote.requisitionId}.`,
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
