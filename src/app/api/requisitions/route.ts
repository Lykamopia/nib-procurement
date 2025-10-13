

'use server';

import { NextResponse } from 'next/server';
import type { PurchaseRequisition, User, UserRole, Vendor } from '@/lib/types';
import { prisma } from '@/lib/prisma';
import { getUserByToken } from '@/lib/auth';
import { headers } from 'next/headers';
import { sendEmail } from '@/services/email-service';
import { differenceInMinutes } from 'date-fns';

// This function is exported so it can be called from the finalize-scores route
export async function finalizeAndNotifyVendors(requisitionId: string, awardResponseDeadline?: Date) {
    const allQuotesForReq = await prisma.quotation.findMany({
        where: { requisitionId },
        include: { items: true }
    });

    const sortedByScore = allQuotesForReq.sort((a, b) => (b.finalAverageScore || 0) - (a.finalAverageScore || 0));

    if (sortedByScore.length === 0) {
        throw new Error("No quotes available to award.");
    }
    
    const winner = sortedByScore[0];
    const awardedVendorIds = [winner.vendorId]; // For now, only single winner
    
    const awardedQuoteItemIds = winner.items.map(item => item.id);

    await prisma.quotation.updateMany({
        where: { requisitionId: requisitionId },
        data: { status: 'Rejected', rank: null }
    });
    
    await prisma.quotation.update({
        where: { id: winner.id },
        data: { status: 'Awarded', rank: 1 }
    });

    const standbyCandidates = sortedByScore.slice(1, 3);
    for (let i = 0; i < standbyCandidates.length; i++) {
        await prisma.quotation.update({
            where: { id: standbyCandidates[i].id },
            data: { status: 'Standby', rank: (i + 2) as 2 | 3 }
        });
    }

    const awardResponseDurationMinutes = awardResponseDeadline
        ? differenceInMinutes(awardResponseDeadline, new Date())
        : undefined;

    await prisma.purchaseRequisition.update({
      where: { id: requisitionId },
      data: {
        status: 'RFQ_In_Progress',
        awardResponseDeadline: awardResponseDeadline,
        awardResponseDurationMinutes,
        awardedQuoteItemIds: awardedQuoteItemIds,
        currentApproverId: null,
      }
    });

    const requisition = await prisma.purchaseRequisition.findUnique({where: { id: requisitionId }, include: {items: true}});
    const vendor = await prisma.vendor.findUnique({ where: { id: winner.vendorId }});

    if (vendor && requisition) {
        const emailHtml = `
            <h1>Congratulations, ${vendor.name}!</h1>
            <p>You have been awarded the contract for requisition <strong>${requisition.title}</strong>.</p>
            <p>Please log in to the vendor portal to review the award and respond.</p>
            <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002'}/vendor/dashboard">Go to Vendor Portal</a>
            <p>Thank you,</p>
            <p>Nib InternationalBank Procurement</p>
        `;

        await sendEmail({
            to: vendor.email,
            subject: `Contract Awarded: ${requisition.title}`,
            html: emailHtml
        });
    }
}


export async function GET(request: Request) {
  console.log('GET /api/requisitions - Fetching requisitions from DB.');
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get('status');
  const forVendor = searchParams.get('forVendor');
  const approverId = searchParams.get('approverId');
  const forReview = searchParams.get('forReview');

  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.split(' ')[1];
  let userPayload: { user: User, role: UserRole } | null = null;
  if(token) {
    userPayload = await getUserByToken(token);
  }

  try {
    const whereClause: any = {};
    
    if (forReview === 'true' && userPayload) {
        const { role } = userPayload;
        if (role === 'Committee_A_Member') {
            whereClause.status = 'Pending_Committee_A_Recommendation';
        } else if (role === 'Committee_B_Member') {
            whereClause.status = 'Pending_Committee_B_Review';
        } else if (role === 'Admin') {
            whereClause.status = { in: ['Pending_Committee_A_Recommendation', 'Pending_Committee_B_Review'] };
        } else {
            return NextResponse.json([]);
        }
    } else if (statusParam) {
        const statuses = statusParam.split(',').map(s => s.trim().replace(/ /g, '_'));
        whereClause.status = { in: statuses };
    }

    if (forVendor === 'true') {
        if (!userPayload || !userPayload.user.vendorId) {
             return NextResponse.json({ error: 'Unauthorized: No valid vendor found for this user.' }, { status: 403 });
        }
        
        whereClause.status = 'RFQ_In_Progress';
        whereClause.OR = [
          { allowedVendorIds: { isEmpty: true } }, // 'all' vendors
          { allowedVendorIds: { has: userPayload.user.vendorId } },
        ];
    }
    
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
        },
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
                    questionType: q.questionType.replace(/-/g, '_'),
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
    const { id, status, userId, comment, isManagerialApproval, isCommitteeApproval } = body;
    const updateData = body;


    const user = await prisma.user.findUnique({where: {id: userId}});
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const requisition = await prisma.purchaseRequisition.findUnique({ 
        where: { id },
        include: { department: true }
    });
    if (!requisition) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    let dataToUpdate: any = {};
    let auditAction = 'UPDATE_REQUISITION';
    let auditDetails = `Updated requisition ${id}.`;
    
    // This handles editing a draft or rejected requisition and resubmitting
    if ((requisition.status === 'Draft' || requisition.status === 'Rejected') && updateData.title) {
        const totalPrice = updateData.items.reduce((acc: number, item: any) => {
            const price = item.unitPrice || 0;
            const quantity = item.quantity || 0;
            return acc + (price * quantity);
        }, 0);

        dataToUpdate = {
            title: updateData.title,
            justification: updateData.justification,
            urgency: updateData.urgency,
            department: { connect: { name: updateData.department } },
            totalPrice: totalPrice,
            status: status ? status.replace(/ /g, '_') : requisition.status,
            approver: { disconnect: true },
            approverComment: null,
            items: {
                deleteMany: {},
                create: updateData.items.map((item: any) => ({
                    name: item.name,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice || 0,
                    description: item.description || ''
                })),
            },
            customQuestions: {
                deleteMany: {},
                create: updateData.customQuestions?.map((q: any) => ({
                    questionText: q.questionText,
                    questionType: q.questionType.replace(/-/g, '_'),
                    isRequired: q.isRequired,
                    options: q.options || [],
                })),
            },
        };
         const oldCriteria = await prisma.evaluationCriteria.findUnique({ where: { requisitionId: id } });
         if (oldCriteria) {
             await prisma.financialCriterion.deleteMany({ where: { evaluationCriteriaId: oldCriteria.id } });
             await prisma.technicalCriterion.deleteMany({ where: { evaluationCriteriaId: oldCriteria.id } });
             await prisma.evaluationCriteria.delete({ where: { id: oldCriteria.id } });
         }

         dataToUpdate.evaluationCriteria = {
            create: {
                financialWeight: updateData.evaluationCriteria.financialWeight,
                technicalWeight: updateData.evaluationCriteria.technicalWeight,
                financialCriteria: { create: updateData.evaluationCriteria.financialCriteria.map((c:any) => ({ name: c.name, weight: c.weight })) },
                technicalCriteria: { create: updateData.evaluationCriteria.technicalCriteria.map((c:any) => ({ name: c.name, weight: c.weight })) }
            }
        };
        
        if (status === 'Pending Approval') {
            const department = await prisma.department.findUnique({ where: { id: requisition.departmentId! } });
            if (department?.headId) { dataToUpdate.currentApprover = { connect: { id: department.headId } }; }
            auditAction = 'SUBMIT_FOR_APPROVAL';
            auditDetails = `Requisition ${id} ("${updateData.title}") was edited and submitted for approval.`;
        }

    } else if (status) { // This handles normal status changes (approve, reject, submit)
        dataToUpdate.status = status.replace(/ /g, '_');
        
        if (status === 'Pending Approval') {
            const department = await prisma.department.findUnique({ where: { id: requisition.departmentId! } });
            if (department?.headId) { dataToUpdate.currentApprover = { connect: { id: department.headId } };
            } else { return NextResponse.json({ error: 'No department head assigned to approve this requisition.' }, { status: 400 }); }
            auditAction = 'SUBMIT_FOR_APPROVAL';
            auditDetails = `Draft requisition ${id} was submitted for approval.`;
        } else if (status === 'Approved') {
            dataToUpdate.approver = { connect: { id: userId } };
            dataToUpdate.approverComment = comment;
            dataToUpdate.currentApprover = { disconnect: true };
            
            if (isManagerialApproval || isCommitteeApproval) {
                 auditAction = isManagerialApproval ? 'APPROVE_AWARD' : 'COMMITTEE_APPROVE_AWARD';
                 auditDetails = `${isManagerialApproval ? 'Managerially' : 'Committee'} approved award for requisition ${id}. Notifying vendors.`;
                 
                 // Create Review Record
                 if (isCommitteeApproval) {
                     await prisma.review.create({
                         data: {
                             requisitionId: id,
                             reviewerId: userId,
                             committeeType: user.role === 'Committee_A_Member' ? 'Committee A' : 'Committee B',
                             decision: 'Approved',
                             comment: comment
                         }
                     })
                 }
                 
                 await finalizeAndNotifyVendors(id, requisition.awardResponseDeadline || undefined);
            } else {
                auditAction = 'APPROVE_REQUISITION';
                auditDetails = `Requisition ${id} was approved with comment: "${comment}".`;
            }
            
        } else if (status === 'Rejected') {
            dataToUpdate.approver = { connect: { id: userId } };
            dataToUpdate.approverComment = comment;
            dataToUpdate.currentApprover = { disconnect: true };
             auditAction = 'REJECT_REQUISITION';
             auditDetails = `Requisition ${id} was rejected with comment: "${comment}".`;

             if (isCommitteeApproval) {
                 await prisma.review.create({
                     data: {
                         requisitionId: id,
                         reviewerId: userId,
                         committeeType: user.role === 'Committee_A_Member' ? 'Committee A' : 'Committee B',
                         decision: 'Rejected',
                         comment: comment
                     }
                 })
             }
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
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 500 });
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

    if (requisition.status !== 'Draft' && requisition.status !== 'Pending_Approval') {
      return NextResponse.json({ error: `Cannot delete a requisition with status "${requisition.status}".` }, { status: 403 });
    }
    
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
