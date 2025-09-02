
'use server';

import { NextResponse } from 'next/server';
import type { PurchaseRequisition, RequisitionStatus } from '@/lib/types';
import { requisitions, auditLogs, departmentBudgets } from '@/lib/data-store';
import { users } from '@/lib/data-store';

function checkBudget(department: string, amount: number) {
    if (amount === 0) return 'OK'; // No price yet, so budget is OK.
    const budget = departmentBudgets.find(b => b.department === department);
    if (!budget) return 'OK'; // Default to OK if no budget is defined
    return (budget.spentBudget + amount) > budget.totalBudget ? 'Exceeded' : 'OK';
}


export async function GET() {
  console.log('GET /api/requisitions - Fetching all requisitions.');
  return NextResponse.json(requisitions);
}

export async function POST(request: Request) {
  console.log('POST /api/requisitions - Creating new requisition.');
  try {
    const body = await request.json();
    console.log('Request body:', body);
    
    const user = users.find(u => u.name === body.requesterName);

    const itemsWithIds = body.items.map((item: any, index: number) => ({...item, id: `ITEM-${Date.now()}-${index}`}));
    
    const newRequisition: PurchaseRequisition = {
      id: `REQ-${Date.now()}`,
      requesterId: user?.id || 'temp-user-id',
      requesterName: body.requesterName,
      title: body.title,
      department: body.department,
      items: itemsWithIds,
      totalPrice: 0, // Price is not set at creation
      justification: body.justification,
      status: 'Draft',
      budgetStatus: 'Pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      quotations: [], // Initialize quotations array
    };

    requisitions.unshift(newRequisition);
    console.log('Created new requisition:', newRequisition);

    const auditLogEntry = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      user: newRequisition.requesterName || 'Unknown',
      role: user?.role || 'Requester',
      action: 'CREATE',
      entity: 'Requisition',
      entityId: newRequisition.id,
      details: `Created new requisition "${newRequisition.title}"`,
    };
    auditLogs.unshift(auditLogEntry);
    console.log('Added audit log:', auditLogEntry);

    return NextResponse.json(newRequisition, { status: 201 });
  } catch (error) {
    console.error('Failed to create requisition:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process requisition', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}


export async function PATCH(
  request: Request,
) {
  console.log('PATCH /api/requisitions - Updating requisition status.');
  try {
    const body = await request.json();
    console.log('Request body:', body);
    const { id, status, userId, comment, overrideBudget } = body;

    const requisitionIndex = requisitions.findIndex((r) => r.id === id);
    if (requisitionIndex === -1) {
      console.error('Requisition not found for ID:', id);
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    const user = users.find(u => u.id === userId);
    if (!user) {
        console.error('User not found for ID:', userId);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const requisition = requisitions[requisitionIndex];
    const oldStatus = requisition.status;
    requisition.status = status as RequisitionStatus;
    requisition.updatedAt = new Date();
    
    let auditDetails = `Changed status from "${oldStatus}" to "${status}"`;

    if (status === 'Pending Approval') {
        const total = requisition.items.reduce((acc, item) => acc + ((item.unitPrice || 0) * item.quantity), 0);
        requisition.totalPrice = total;
        requisition.budgetStatus = checkBudget(requisition.department, requisition.totalPrice || 0);
        auditDetails = `Submitted for approval. Total Price: ${total}. Budget status: ${requisition.budgetStatus}`
    }

    if (status === 'Approved' || status === 'Rejected') {
        requisition.approverId = userId;
        requisition.approverComment = comment;

        if (status === 'Approved') {
            const budget = departmentBudgets.find(b => b.department === requisition.department);
            if (budget) {
                budget.spentBudget += requisition.totalPrice || 0;
            }
            auditDetails = `Approved requisition. Comment: "${comment}"`
            if (overrideBudget) {
              auditDetails += ` (Budget Overridden)`
            }
        } else {
            auditDetails = `Rejected requisition. Comment: "${comment}"`
        }
    }
    
    const auditLogEntry = {
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        user: user.name,
        role: user.role,
        action: 'UPDATE_STATUS',
        entity: 'Requisition',
        entityId: id,
        details: auditDetails,
    };
    auditLogs.unshift(auditLogEntry);
    console.log('Added audit log:', auditLogEntry);

    console.log('Successfully updated requisition:', requisition);
    return NextResponse.json(requisition);
  } catch (error) {
    console.error('Failed to update requisition:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
