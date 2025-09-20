
'use server';

import { NextResponse } from 'next/server';
import type { PurchaseRequisition, RequisitionStatus } from '@/lib/types';
import { prisma } from '@/lib/prisma';
import { users } from '@/lib/data-store'; // Still using in-memory users for now

export async function GET() {
  console.log('GET /api/requisitions - Fetching all requisitions from DB.');
  try {
    const requisitions = await prisma.purchaseRequisition.findMany({
      include: {
        items: true,
        customQuestions: true,
        evaluationCriteria: {
            include: {
                financialCriteria: true,
                technicalCriteria: true,
            }
        },
        financialCommitteeMembers: { select: { id: true } },
        technicalCommitteeMembers: { select: { id: true } },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedRequisitions = requisitions.map(req => ({
        ...req,
        financialCommitteeMemberIds: req.financialCommitteeMembers.map(m => m.id),
        technicalCommitteeMemberIds: req.technicalCommitteeMembers.map(m => m.id),
    }));

    return NextResponse.json(formattedRequisitions);
  } catch (error) {
    console.error('Failed to fetch requisitions:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to fetch requisitions', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  console.log('POST /api/requisitions - Creating new requisition in DB.');
  try {
    const body = await request.json();
    console.log('Request body:', body);
    
    // Using in-memory user data for now
    const user = users.find(u => u.name === body.requesterName);
    if (!user) {
        return NextResponse.json({ error: 'Requester user not found' }, { status: 404 });
    }
    
    const newRequisition = await prisma.purchaseRequisition.create({
        data: {
            requester: { connect: { id: user.id } },
            department: { connect: { name: body.department } },
            title: body.title,
            justification: body.justification,
            status: 'Draft',
            items: {
                create: body.items.map((item: any) => ({
                    name: item.name,
                    quantity: item.quantity,
                    description: item.description || ''
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
                        create: body.evaluationCriteria.financialCriteria.map((c:any) => ({ name: c.name, weight: c.weight }))
                    },
                    technicalCriteria: {
                        create: body.evaluationCriteria.technicalCriteria.map((c:any) => ({ name: c.name, weight: c.weight }))
                    }
                }
            }
        },
        include: { items: true, customQuestions: true, evaluationCriteria: true }
    });

    console.log('Created new requisition in DB:', newRequisition);

    // Audit log can still use in-memory for now or be updated later
    // const auditLogEntry = { ... };
    // auditLogs.unshift(auditLogEntry);

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
  console.log('PATCH /api/requisitions - Updating requisition status or content in DB.');
  try {
    const body = await request.json();
    const { id, status, userId, comment, ...updateData } = body;

    const user = users.find(u => u.id === userId);
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const requisition = await prisma.purchaseRequisition.findUnique({ where: { id }});
    if (!requisition) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    let dataToUpdate: any = {};
    
    // This handles editing a rejected requisition and resubmitting
    if (requisition.status === 'Rejected' && status === 'Pending Approval') {
        dataToUpdate = {
            title: updateData.title,
            justification: updateData.justification,
            department: { connect: { name: updateData.department } },
            status: 'Pending Approval',
            approverId: null,
            approverComment: null,
            // We need to delete old items and create new ones
            items: {
                deleteMany: {},
                create: updateData.items.map((item: any) => ({
                    name: item.name,
                    quantity: item.quantity,
                    description: item.description || ''
                })),
            },
            // Same for questions and criteria
            customQuestions: {
                deleteMany: {},
                create: updateData.customQuestions?.map((q: any) => ({
                    questionText: q.questionText,
                    questionType: q.questionType,
                    options: q.options || [],
                })),
            },
        };
        // Handle evaluation criteria update by deleting old and creating new
         await prisma.evaluationCriteria.deleteMany({ where: { requisitionId: id } });
         dataToUpdate.evaluationCriteria = {
            create: {
                financialWeight: updateData.evaluationCriteria.financialWeight,
                technicalWeight: updateData.evaluationCriteria.technicalWeight,
                financialCriteria: {
                    create: updateData.evaluationCriteria.financialCriteria.map((c:any) => ({ name: c.name, weight: c.weight }))
                },
                technicalCriteria: {
                    create: updateData.evaluationCriteria.technicalCriteria.map((c:any) => ({ name: c.name, weight: c.weight }))
                }
            }
        };

    } else if (status) { // This handles normal status changes
        dataToUpdate.status = status as RequisitionStatus;
        if (status === 'Approved' || status === 'Rejected') {
            dataToUpdate.approverId = userId;
            dataToUpdate.approverComment = comment;
        }
    } else {
        return NextResponse.json({ error: 'No valid update action specified.' }, { status: 400 });
    }
    
    const updatedRequisition = await prisma.purchaseRequisition.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedRequisition);
  } catch (error) {
    console.error('Failed to update requisition:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
