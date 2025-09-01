
import { NextResponse } from 'next/server';
import { requisitions, auditLogs, departmentBudgets } from '@/lib/data-store';
import type { RequisitionStatus } from '@/lib/types';
import { users } from '@/lib/auth-store';

function checkBudget(department: string, amount: number) {
    const budget = departmentBudgets.find(b => b.department === department);
    if (!budget) return 'OK'; // Default to OK if no budget is defined
    return (budget.spentBudget + amount) > budget.totalBudget ? 'Exceeded' : 'OK';
}


export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status, userId, comment, overrideBudget } = body;

    const requisitionIndex = requisitions.findIndex((r) => r.id === id);
    if (requisitionIndex === -1) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    const user = users.find(u => u.id === userId);
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const requisition = requisitions[requisitionIndex];
    const oldStatus = requisition.status;
    requisition.status = status as RequisitionStatus;
    requisition.updatedAt = new Date();
    
    let auditDetails = `Changed status from "${oldStatus}" to "${status}"`;

    // Budget check logic on submission for approval
    if (status === 'Pending Approval') {
        requisition.budgetStatus = checkBudget(requisition.department, requisition.totalPrice);
        auditDetails = `Submitted for approval. Budget status: ${requisition.budgetStatus}`
    }

    if (status === 'Approved' || status === 'Rejected') {
        requisition.approverId = userId;
        requisition.approverComment = comment;

        if (status === 'Approved') {
            const budget = departmentBudgets.find(b => b.department === requisition.department);
            if (budget) {
                budget.spentBudget += requisition.totalPrice;
            }
            auditDetails = `Approved requisition. Comment: "${comment}"`
            if (overrideBudget) {
              auditDetails += ` (Budget Overridden)`
            }
        } else {
            auditDetails = `Rejected requisition. Comment: "${comment}"`
        }
    }
    
    // Add to audit log
    auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date(),
        user: user.name,
        role: user.role,
        action: 'UPDATE_STATUS',
        entity: 'Requisition',
        entityId: id,
        details: auditDetails,
    });

    return NextResponse.json(requisition);
  } catch (error) {
    console.error('Failed to update requisition:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
