import { NextResponse } from 'next/server';
import type { PurchaseRequisition } from '@/lib/types';

// In-memory store for requisitions
const requisitions: PurchaseRequisition[] = [
    {
    id: `REQ-1672531200`,
    requesterId: '1',
    requesterName: 'Alice',
    title: 'New Laptops for Design Team',
    department: 'Design',
    items: [
        { id: 'ITEM-1', name: 'MacBook Pro 16-inch', quantity: 5, unitPrice: 2499, description: '' },
        { id: 'ITEM-2', name: '4K Monitor', quantity: 5, unitPrice: 799, description: '' }
    ],
    totalPrice: 16490,
    justification: 'Current laptops are over 5 years old and struggling with new design software.',
    status: 'Approved',
    createdAt: new Date('2023-10-01T10:00:00Z'),
    updatedAt: new Date('2023-10-05T11:30:00Z'),
    },
    {
    id: `REQ-1672617600`,
    requesterId: '2',
    requesterName: 'Bob',
    title: 'Office Supplies Replenishment',
    department: 'Operations',
    items: [
        { id: 'ITEM-3', name: 'Printer Paper (Case)', quantity: 10, unitPrice: 45, description: '' },
        { id: 'ITEM-4', name: 'Toner Cartridge', quantity: 4, unitPrice: 150, description: '' }
    ],
    totalPrice: 1050,
    justification: 'Standard quarterly replenishment of office supplies.',
    status: 'Pending Approval',
    createdAt: new Date('2023-10-02T14:00:00Z'),
    updatedAt: new Date('2023-10-02T14:00:00Z'),
  },
  {
    id: `REQ-1672704000`,
    requesterId: '3',
    requesterName: 'Charlie',
    title: 'Software License Renewals',
    department: 'IT',
    items: [
      { id: 'ITEM-5', name: 'Project Management Tool (Annual)', quantity: 20, unitPrice: 240, description: '' },
    ],
    totalPrice: 4800,
    justification: 'Annual renewal for critical project management software.',
    status: 'PO Created',
    createdAt: new Date('2023-09-15T09:20:00Z'),
    updatedAt: new Date('2023-09-25T16:00:00Z'),
  },
];

export async function GET() {
  return NextResponse.json(requisitions);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const total = body.items.reduce((acc: number, item: { quantity: number; unitPrice?: number; }) => {
        return acc + (item.quantity || 0) * (item.unitPrice || 0);
    }, 0);

    const newRequisition: PurchaseRequisition = {
      id: `REQ-${Date.now()}`,
      requesterId: 'temp-user-id', // In a real app, get this from the authenticated user session
      requesterName: body.requesterName,
      title: body.title,
      department: body.department,
      items: body.items.map((item: any, index: number) => ({...item, id: `ITEM-${index}`})),
      totalPrice: total,
      justification: body.justification,
      status: 'Draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    requisitions.unshift(newRequisition);

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
