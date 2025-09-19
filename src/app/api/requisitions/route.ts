
'use server';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import type { RequisitionStatus } from '@prisma/client';


export async function GET() {
  console.log('GET /api/requisitions - Fetching all requisitions.');
  const requisitions = await prisma.purchaseRequisition.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      items: true,
      customQuestions: true,
      evaluationCriteria: {
        include: {
          financialCriteria: true,
          technicalCriteria: true,
        },
      },
      quotations: true,
      requester: true,
      approver: true,
    }
  });
  return NextResponse.json(requisitions);
}

export async function POST(request: Request) {
  console.log('POST /api/requisitions - Creating new requisition.');
  try {
    const body = await request.json();
    console.log('Request body:', body);
    
    // Find user by email, which is unique, instead of name
    const users = await prisma.user.findMany();
    const user = users.find(u => u.name === body.requesterName);

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const newRequisition = await prisma.purchaseRequisition.create({
      data: {
        requester: { connect: { id: user.id } },
        requesterName: body.requesterName,
        title: body.title,
        department: { connect: { name: body.department } },
        items: {
          create: body.items.map((item: any) => ({
            name: item.name,
            description: item.description || '',
            quantity: item.quantity,
            unitPrice: item.unitPrice || 0
          }))
        },
        customQuestions: {
          create: body.customQuestions?.map((q: any) => ({
            questionText: q.questionText,
            questionType: q.questionType,
            options: q.options || [],
          }))
        },
        evaluationCriteria: {
          create: {
            financialWeight: body.evaluationCriteria.financialWeight,
            technicalWeight: body.evaluationCriteria.technicalWeight,
            financialCriteria: {
              create: body.evaluationCriteria.financialCriteria.map((c: any) => ({ name: c.name, weight: c.weight }))
            },
            technicalCriteria: {
              create: body.evaluationCriteria.technicalCriteria.map((c: any) => ({ name: c.name, weight: c.weight }))
            }
          }
        },
        totalPrice: 0, // This should be calculated or handled differently
        justification: body.justification,
        status: 'Draft',
      }
    });

    console.log('Created new requisition:', newRequisition);

    await prisma.auditLog.create({
        data: {
            user: { connect: { id: user.id } },
            role: user.role,
            action: 'CREATE',
            entity: 'Requisition',
            entityId: newRequisition.id,
            details: `Created new requisition "${newRequisition.title}"`,
        }
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


export async function PATCH(
  request: Request,
) {
  console.log('PATCH /api/requisitions - Updating requisition status or content.');
  try {
    const body = await request.json();
    console.log('Request body:', body);
    const { id, status, userId, comment } = body;

    const requisition = await prisma.purchaseRequisition.findUnique({ where: { id }});
    if (!requisition) {
      console.error('Requisition not found for ID:', id);
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        console.error('User not found for ID:', userId);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const oldStatus = requisition.status;
    let updatedRequisition;
    let auditDetails = ``;

    if (oldStatus === 'Rejected' && status === 'Pending_Approval') {
        // Logic to update the entire requisition
        updatedRequisition = await prisma.purchaseRequisition.update({
          where: { id },
          data: {
            title: body.title,
            department: { connect: { name: body.department } },
            items: {
              deleteMany: {},
              create: body.items.map((item: any) => ({
                name: item.name,
                description: item.description || '',
                quantity: item.quantity,
                unitPrice: item.unitPrice || 0
              }))
            },
            justification: body.justification,
            status: 'Pending_Approval',
            approverId: null,
            approverComment: null,
            updatedAt: new Date()
          }
        });
        auditDetails = `Edited and resubmitted for approval.`;

    } else if (status) { // This handles normal status changes
        updatedRequisition = await prisma.purchaseRequisition.update({
          where: { id },
          data: {
            status: status as RequisitionStatus,
            approver: (status === 'Approved' || status === 'Rejected') ? { connect: { id: userId } } : undefined,
            approverComment: (status === 'Approved' || status === 'Rejected') ? comment : requisition.approverComment,
            updatedAt: new Date(),
          }
        });
        auditDetails = `Changed status from "${oldStatus}" to "${status}"`;

        if (status === 'Pending_Approval') auditDetails = `Submitted for approval.`;
        if (status === 'Approved') auditDetails = `Approved requisition. Comment: "${comment}"`;
        if (status === 'Rejected') auditDetails = `Rejected requisition. Comment: "${comment}"`;
    } else {
        return NextResponse.json({ error: 'No valid update action specified.' }, { status: 400 });
    }

    await prisma.auditLog.create({
        data: {
            user: { connect: { id: user.id } },
            role: user.role,
            action: 'UPDATE',
            entity: 'Requisition',
            entityId: id,
            details: auditDetails,
        }
    });

    console.log('Successfully updated requisition:', updatedRequisition);
    return NextResponse.json(updatedRequisition);
  } catch (error) {
    console.error('Failed to update requisition:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
