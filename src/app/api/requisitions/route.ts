
'use server';

import { NextResponse } from 'next/server';
import type { PurchaseRequisition, RequisitionStatus } from '@/lib/types';
import { requisitions, auditLogs } from '@/lib/data-store';
import { users } from '@/lib/data-store';

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
    const questionsWithIds = body.customQuestions?.map((q: any, index: number) => ({...q, id: `Q-${Date.now()}-${index}`})) || [];
    
    const newRequisition: PurchaseRequisition = {
      id: `REQ-${Date.now()}`,
      requesterId: user?.id || 'temp-user-id',
      requesterName: body.requesterName,
      title: body.title,
      department: body.department,
      items: itemsWithIds,
      customQuestions: questionsWithIds,
      evaluationCriteria: body.evaluationCriteria,
      totalPrice: 0,
      justification: body.justification,
      status: 'Draft',
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
  console.log('PATCH /api/requisitions - Updating requisition status or content.');
  try {
    const body = await request.json();
    console.log('Request body:', body);
    const { id, status, userId, comment } = body;

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
    
    let auditDetails = ``;

    // This handles editing a rejected requisition and resubmitting
    if (oldStatus === 'Rejected' && status === 'Pending Approval') {
        requisition.title = body.title;
        requisition.department = body.department;
        requisition.items = body.items;
        requisition.customQuestions = body.customQuestions;
        requisition.justification = body.justification;
        requisition.evaluationCriteria = body.evaluationCriteria;
        
        const total = 0; // Price is no longer estimated here
        requisition.totalPrice = total;
        
        requisition.status = 'Pending Approval';
        requisition.approverId = undefined;
        requisition.approverComment = undefined;
        auditDetails = `Edited and resubmitted for approval.`;
    } else if (status) { // This handles normal status changes (draft -> pending, pending -> approved/rejected)
        requisition.status = status as RequisitionStatus;
        auditDetails = `Changed status from "${oldStatus}" to "${status}"`;

        if (status === 'Pending Approval') {
            const total = 0; // Price is no longer estimated here
            requisition.totalPrice = total;
            auditDetails = `Submitted for approval.`
        }

        if (status === 'Approved' || status === 'Rejected') {
            requisition.approverId = userId;
            requisition.approverComment = comment;

            if (status === 'Approved') {
                auditDetails = `Approved requisition. Comment: "${comment}"`
            } else {
                auditDetails = `Rejected requisition. Comment: "${comment}"`
            }
        }
    } else {
        return NextResponse.json({ error: 'No valid update action specified.' }, { status: 400 });
    }

    requisition.updatedAt = new Date();
    
    const auditLogEntry = {
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        user: user.name,
        role: user.role,
        action: 'UPDATE',
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
