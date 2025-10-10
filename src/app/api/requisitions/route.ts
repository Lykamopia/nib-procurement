
'use server';

import { NextResponse } from 'next/server';
import type { PurchaseRequisition } from '@/lib/types';
import { prisma } from '@/lib/prisma';
import { getUserByToken } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET(request: Request) {
  console.log('GET /api/requisitions - Fetching requisitions from DB.');
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const forVendor = searchParams.get('forVendor');
  const approverId = searchParams.get('approverId');

  try {
    const whereClause: any = {};
    if (status) {
        whereClause.status = status.replace(/ /g, '_');
    }

    if (forVendor === 'true') {
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.split(' ')[1];
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userPayload = await getUserByToken(token);
        if (!userPayload || !userPayload.user.vendorId) {
             return NextResponse.json({ error: 'Unauthorized: No valid vendor found for this user.' }, { status: 403 });
        }
        
        whereClause.status = 'RFQ_In_Progress';
        whereClause.OR = [
          { allowedVendorIds: { isEmpty: true } }, // 'all' vendors
          { allowedVendorIds: { has: userPayload.user.vendorId } },
        ];
    }
    
    // Add logic for approval queue for a specific user
    if (approverId) {
        whereClause.currentApproverId = approverId;
    }


    const requisitions = await prisma.purchaseRequisition.findMany({
      where: whereClause,
      include: {
        items: true,
        customQuestions: true,
        department: true,
        requester: true,
        currentApprover: true,
        evaluationCriteria: {
            include: {
                financialCriteria: true,
                technicalCriteria: true,
            }
        },
        financialCommitteeMembers: { select: { id: true } },
        technicalCommitteeMembers: { select: { id: true } },
        quotations: {
            include: {
                vendor: true
            }
        }, // Include quotations to check vendor status
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedRequisitions = requisitions.map(req => ({
        ...req,
        status: req.status.replace(/_/g, ' '),
        department: req.department?.name || 'N/A',
        requesterName: req.requester.name,
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
    
    const user = await prisma.user.findFirst({where: {name: body.requesterName}});
    if (!user) {
        return NextResponse.json({ error: 'Requester user not found' }, { status: 404 });
    }

    const totalPrice = body.items.reduce((acc: number, item: any) => {
        const price = item.unitPrice || 0;
        const quantity = item.quantity || 0;
        return acc + (price * quantity);
    }, 0);
    
    const department = await prisma.department.findUnique({ where: { name: body.department } });
    if (!department) {
        return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    const newRequisition = await prisma.purchaseRequisition.create({
        data: {
            requester: { connect: { id: user.id } },
            requesterName: user.name,
            department: { connect: { id: department.id } },
            title: body.title,
            urgency: body.urgency,
            justification: body.justification,
            status: 'Draft',
            totalPrice: totalPrice,
            items: {
                create: body.items.map((item: any) => ({
                    name: item.name,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice || 0,
                    description: item.description || ''
                }))
            },
            customQuestions: {
                create: body.customQuestions?.map((q: any) => ({
                    questionText: q.questionText,
                    questionType: q.questionType,
                    isRequired: q.isRequired,
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

    // Set the transactionId to be its own ID after creation
    const finalRequisition = await prisma.purchaseRequisition.update({
        where: { id: newRequisition.id },
        data: { transactionId: newRequisition.id }
    });


    console.log('Created new requisition in DB:', finalRequisition);

    await prisma.auditLog.create({
        data: {
            transactionId: finalRequisition.id,
            user: { connect: { id: user.id } },
            timestamp: new Date(),
            action: 'CREATE_REQUISITION',
            entity: 'Requisition',
            entityId: finalRequisition.id,
            details: `Created new requisition: "${finalRequisition.title}".`,
        }
    });

    return NextResponse.json(finalRequisition, { status: 201 });
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

    const user = await prisma.user.findUnique({
      where: {id: userId}, 
      include: { manager: true }
    });
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const requisition = await prisma.purchaseRequisition.findUnique({ 
        where: { id },
        include: { department: { include: { head: true } } }
    });
    if (!requisition) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }
    
    // Authorization check
    if (requisition.currentApproverId && requisition.currentApproverId !== user.id) {
      return NextResponse.json({ error: 'You are not the current approver for this requisition.'}, { status: 403 });
    }

    let dataToUpdate: any = {};
    let auditAction = 'UPDATE_REQUISITION';
    let auditDetails = `Updated requisition ${id}.`;
    
    if ((requisition.status === 'Draft' || requisition.status === 'Rejected') && updateData.title) {
        // ... (existing edit logic)
    } else if (status) { // This handles normal status changes
        const currentStatus = requisition.status.replace(/_/g, ' ');
        const newStatus = status.replace(/ /g, '_');
        
        // --- WORKFLOW LOGIC ---
        if (newStatus === 'Pending_Approval' && currentStatus === 'Draft') {
            // 1. Requester submits
            const requesterDepartment = await prisma.department.findUnique({where: {id: requisition.departmentId}});
            if (!requesterDepartment) throw new Error("Requester's department not found.");
            
            const divisionManager = await prisma.user.findFirst({where: {departmentId: requesterDepartment.id, role: 'Division_Manager'}});
            if (!divisionManager) throw new Error(`Division Manager for department ${requesterDepartment.name} not found.`);

            dataToUpdate.status = 'Pending_Division_Manager_Approval';
            dataToUpdate.currentApproverId = divisionManager.id;
            auditAction = 'SUBMIT_FOR_APPROVAL';
            auditDetails = `Requisition submitted. Pending Division Manager approval.`;

        } else if (newStatus === 'Approved') {
           // Generic approval action, determine next step based on current status
            dataToUpdate.approverComment = comment;

            switch(currentStatus) {
                case 'Pending Division Manager Approval':
                    // 2. Division Manager approves -> Send to Department Head
                    if (!requisition.department?.headId) throw new Error(`Department Head for ${requisition.department?.name} not configured.`);
                    dataToUpdate.status = 'Pending_Department_Head_Approval';
                    dataToUpdate.currentApproverId = requisition.department.headId;
                    auditAction = 'APPROVE_REQUISITION';
                    auditDetails = `Division Manager approved. Pending Department Head approval.`;
                    break;
                case 'Pending Department Head Approval':
                    // 3. Department Head approves -> Send to Procurement Director
                     const procDirector = await prisma.user.findFirst({where: {role: 'Procurement_Director'}});
                     if(!procDirector) throw new Error("Procurement Director not found.");
                     dataToUpdate.status = 'Pending_Procurement_Director_Approval';
                     dataToUpdate.currentApproverId = procDirector.id;
                     auditAction = 'APPROVE_REQUISITION';
                     auditDetails = `Department Head approved. Pending Procurement Director approval.`;
                    break;
                case 'Pending Procurement Director Approval':
                     // 4. Procurement Director approves -> Final Approval
                     dataToUpdate.status = 'Approved'; // Final "pre-procurement" approval
                     dataToUpdate.currentApproverId = null; // Cleared for Procurement Officer to pick up
                     auditAction = 'FINALIZE_APPROVAL';
                     auditDetails = `Procurement Director gave final approval. Requisition is ready for RFQ process.`;
                    break;
                 default:
                    dataToUpdate.status = 'Approved';
                    dataToUpdate.currentApproverId = null;
                    auditAction = 'APPROVE_REQUISITION';
                    auditDetails = `Requisition ${id} was approved with comment: "${comment}".`;
                    break;
            }

        } else if (newStatus === 'Rejected') {
            dataToUpdate.status = 'Rejected';
            dataToUpdate.approverComment = comment;
            dataToUpdate.currentApproverId = null; // Goes back to requester
            auditAction = 'REJECT_REQUISITION';
            auditDetails = `Requisition ${id} was rejected with comment: "${comment}".`;
        }
    } else {
        return NextResponse.json({ error: 'No valid update action specified.' }, { status: 400 });
    }
    
    const updatedRequisition = await prisma.purchaseRequisition.update({
      where: { id },
      data: dataToUpdate,
    });
    
    await prisma.auditLog.create({
        data: {
            transactionId: updatedRequisition.transactionId,
            user: { connect: { id: user.id } },
            timestamp: new Date(),
            action: auditAction,
            entity: 'Requisition',
            entityId: id,
            details: auditDetails,
        }
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

export async function DELETE(
  request: Request,
) {
  try {
    const body = await request.json();
    const { id, userId } = body;

    const user = await prisma.user.findUnique({where: {id: userId}});
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const requisition = await prisma.purchaseRequisition.findUnique({ where: { id } });

    if (!requisition) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    if (requisition.requesterId !== userId) {
      return NextResponse.json({ error: 'You are not authorized to delete this requisition.' }, { status: 403 });
    }

    if (requisition.status !== 'Draft' && !requisition.status.startsWith('Pending')) {
      return NextResponse.json({ error: `Cannot delete a requisition with status "${requisition.status}".` }, { status: 403 });
    }
    
    // Need to perform cascading deletes manually if not handled by the database schema
    await prisma.requisitionItem.deleteMany({ where: { requisitionId: id } });
    await prisma.customQuestion.deleteMany({ where: { requisitionId: id } });
    
    const oldCriteria = await prisma.evaluationCriteria.findUnique({ where: { requisitionId: id }});
    if (oldCriteria) {
        await prisma.financialCriterion.deleteMany({ where: { evaluationCriteriaId: oldCriteria.id }});
        await prisma.technicalCriterion.deleteMany({ where: { evaluationCriteriaId: oldCriteria.id }});
        await prisma.evaluationCriteria.delete({ where: { id: oldCriteria.id }});
    }

    await prisma.purchaseRequisition.delete({ where: { id } });

    await prisma.auditLog.create({
        data: {
            transactionId: requisition.transactionId,
            user: { connect: { id: user.id } },
            timestamp: new Date(),
            action: 'DELETE_REQUISITION',
            entity: 'Requisition',
            entityId: id,
            details: `Deleted requisition: "${requisition.title}".`,
        }
    });

    return NextResponse.json({ message: 'Requisition deleted successfully.' });
  } catch (error) {
     console.error('Failed to delete requisition:', error);
     if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
