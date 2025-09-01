
import { NextResponse } from 'next/server';
import type { PurchaseRequisition } from '@/lib/types';
import { requisitions, auditLogs, departmentBudgets } from '@/lib/data-store';
import { users } from '@/lib/auth-store';


export async function GET() {
  return NextResponse.json(requisitions);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const total = body.items.reduce((acc: number, item: { quantity: number; unitPrice?: number; }) => {
        return acc + (item.quantity || 0) * (item.unitPrice || 0);
    }, 0);

    const user = users.find(u => u.name === body.requesterName);

    const newRequisition: PurchaseRequisition = {
      id: `REQ-${Date.now()}`,
      requesterId: user?.id || 'temp-user-id',
      requesterName: body.requesterName,
      title: body.title,
      department: body.department,
      items: body.items.map((item: any, index: number) => ({...item, id: `ITEM-${Date.now()}-${index}`})),
      totalPrice: total,
      justification: body.justification,
      status: 'Draft',
      budgetStatus: 'Pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    requisitions.unshift(newRequisition);

    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date(),
      user: newRequisition.requesterName || 'Unknown',
      role: user?.role || 'Requester',
      action: 'CREATE',
      entity: 'Requisition',
      entityId: newRequisition.id,
      details: `Created new requisition "${newRequisition.title}"`,
    });

    return NextResponse.json(newRequisition, { status: 201 });
  } catch (error) {
    console.error('Failed to create requisition:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process requisition', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
