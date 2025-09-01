import { NextResponse } from 'next/server';
import type { PurchaseRequisition } from '@/lib/types';

// In-memory store for requisitions
const requisitions: PurchaseRequisition[] = [];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const total = body.items.reduce((acc: number, item: { quantity: number; unitPrice?: number; }) => {
        return acc + (item.quantity || 0) * (item.unitPrice || 0);
    }, 0);

    const newRequisition: PurchaseRequisition = {
      id: `REQ-${Date.now()}`,
      requesterId: 'temp-user-id', // In a real app, get this from the authenticated user session
      title: body.title,
      department: body.department,
      items: body.items.map((item: any, index: number) => ({...item, id: `ITEM-${index}`})),
      totalPrice: total,
      justification: body.justification,
      status: 'Draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    requisitions.push(newRequisition);

    console.log('Stored requisitions:', requisitions);

    return NextResponse.json(newRequisition, { status: 201 });
  } catch (error) {
    console.error('Failed to create requisition:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process requisition', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
