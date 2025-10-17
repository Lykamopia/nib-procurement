
'use server';

import { NextResponse } from 'next/server';
import type { PurchaseRequisition, User, UserRole, Vendor } from '@/lib/types';
import { prisma } from '@/lib/prisma';
import { getUserByToken } from '@/lib/auth';
import { headers } from 'next/headers';
import { sendEmail } from '@/services/email-service';
import { differenceInMinutes, format } from 'date-fns';

async function findApproverId(role: UserRole): Promise<string | null> {
    const user = await prisma.user.findFirst({
        where: { role: role.replace(/ /g, '_') }
    });
    return user?.id || null;
}

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
    
    await prisma.quotation.updateMany({
        where: { requisitionId: requisitionId, NOT: { id: winner.id } },
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
        status: 'RFQ_In_Progress', // Stays in this status until vendor accepts
        awardResponseDeadline: awardResponseDeadline,
        awardResponseDurationMinutes,
        awardedQuoteItemIds: winner.items.map(item => item.id), // Store IDs of awarded items from the winning quote
        currentApproverId: null, // Clear current approver
      }
    });

    const requisition = await prisma.purchaseRequisition.findUnique({where: { id: requisitionId }});
    const vendor = await prisma.vendor.findUnique({ where: { id: winner.vendorId }});

    if (vendor && requisition) {
        const emailHtml = `
            <h1>Congratulations, ${vendor.name}!</h1>
            <p>You have been awarded the contract for requisition <strong>${requisition.title}</strong>.</p>
            <p>Please log in to the vendor portal to review the award and respond.</p>
            ${awardResponseDeadline ? `<p><strong>This award must be accepted by ${format(awardResponseDeadline, 'PPpp')}.</strong></p>` : ''}
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
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get('status');
  const forVendor = searchParams.get('forVendor');
  const approverId = searchParams.get('approverId');
  const forReview = searchParams.get('forReview');
  const forQuoting = searchParams.get('forQuoting');


  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.split(' ')[1];
  let userPayload: { user: User, role: UserRole } | null = null;
  if(token) {
    userPayload = await getUserByToken(token);
  }

  try {
    let whereClause: any = {};
    
    if (forReview === 'true' && userPayload) {
        const userRole = userPayload.role.replace(/ /g, '_');
        
        const isHierarchicalApprover = [
            'Manager_Procurement_Division',
            'Director_Supply_Chain_and_Property_Management',
            'VP_Resources_and_Facilities',
            'President'
        ].includes(userRole);

        if (userRole === 'Committee_A_Member' || userRole === 'Committee_B_Member') {
             whereClause.status = userRole === 'Committee_A_Member' 
                ? 'Pending_Committee_A_Recommendation'
                : 'Pending_Committee_B_Review';
        } else if (isHierarchicalApprover) {
            whereClause.currentApproverId = userPayload.user.id;
        } else if (userRole === 'Admin' || userRole === 'Procurement_Officer') {
             whereClause.status = { in: [
                'Pending_Committee_A_Recommendation',
                'Pending_Committee_B_Review',
                'Pending_Managerial_Review',
                'Pending_Director_Approval',
                'Pending_VP_Approval',
                'Pending_President_Approval',
                'Pending_Managerial_Approval'
             ]};
        } else {
             return NextResponse.json([]);
        }

    } else if (statusParam) {
        const statuses = statusParam.split(',').map(s => s.trim().replace(/ /g, '_'));
        whereClause.status = { in: statuses };
    }
    
     if (forQuoting === 'true' && userPayload) {
        const isProcurementStaff = userPayload.role === 'Procurement_Officer' || userPayload.role === 'Admin';
        
        if (userPayload.role === 'Committee_Member') {
            const assignedReqs = await prisma.committeeAssignment.findMany({
                where: { userId: userPayload.user.id },
                select: { requisitionId: true }
            });
            whereClause.id = { in: assignedReqs.map(a => a.requisitionId) };
        } else if (isProcurementStaff) {
             const settings = await prisma.setting.findMany();
             const rfqSetting = settings.find(s => s.key === 'rfqSenderSetting')?.value as any;
             const isDesignatedSender = rfqSetting?.type === 'specific' && rfqSetting.userId === userPayload.user.id;
             const isGeneralSender = rfqSetting?.type === 'all' && userPayload.role === 'Procurement_Officer';

             if (isDesignatedSender || isGeneralSender || userPayload.role === 'Admin') {
                const allReqs = await prisma.purchaseRequisition.findMany({
                    where: {
                        OR: [
                            { status: 'Approved', currentApproverId: userPayload.user.id },
                            { status: 'RFQ_In_Progress' },
                            { status: { startsWith: 'Pending_' } }, // Keep visibility during approval chain
                        ]
                    },
                    include: {
                        committeeAssignments: true,
                        financialCommitteeMembers: { select: { id: true } },
                        technicalCommitteeMembers: { select: { id: true } },
                        quotations: {
                            where: { status: { in: ['Awarded', 'Partially_Awarded'] } }
                        }
                    }
                });

                const reqsForQueue = allReqs.filter(req => {
                    // 1. Ready for RFQ
                    if (req.status === 'Approved') return true;
                    
                    if (req.status === 'RFQ_In_Progress') {
                        const deadlinePassed = req.deadline ? new Date() > new Date(req.deadline) : false;
                        if (!deadlinePassed) return false;

                        // Don't show if it's already awarded and accepted
                        if (req.quotations.length > 0) return false;

                        // 2. Ready for Committee Assignment
                        const hasCommittee = (req.financialCommitteeMembers.length > 0 || req.technicalCommitteeMembers.length > 0);
                        if (!hasCommittee) return true;
                        
                        // 3. Ready to Award
                        const assignedMemberIds = new Set([...req.financialCommitteeMembers.map(m => m.id), ...req.technicalCommitteeMembers.map(m => m.id)]);
                        if (assignedMemberIds.size === 0) return false;
                        
                        const submittedMemberIds = new Set(req.committeeAssignments.filter(a => a.scoresSubmitted).map(a => a.userId));
                        const allHaveScored = [...assignedMemberIds].every(id => submittedMemberIds.has(id));

                        return allHaveScored;
                    }

                    // 4. In Managerial/Committee review, keep it in the list for visibility
                    if (req.status.startsWith('Pending_')) {
                        return true;
                    }

                    return false;
                });

                whereClause.id = { in: reqsForQueue.map(r => r.id) };
                if (reqsForQueue.length === 0) {
                     return NextResponse.json([]); // No results
                }
             } else {
                 return NextResponse.json([]); // Not an authorized RFQ sender
             }
        } else {
            return NextResponse.json([]); // Other roles don't see this queue
        }
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
        committeeAssignments: true,
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
  try {
    const body = await request.json();
    
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
            },
        },
        include: { items: true, customQuestions: true, evaluationCriteria: true }
    });

    const finalRequisition = await prisma.purchaseRequisition.update({
        where: { id: newRequisition.id },
        data: { transactionId: newRequisition.id }
    });

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
  try {
    const body = await request.json();
    const { id, status, userId, comment } = body;
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
        dataToUpdate.approver = { connect: { id: userId } };
        dataToUpdate.approverComment = comment;

        if (status === 'Approved') {
            auditAction = 'APPROVE_REQUISITION';
            auditDetails = `Requisition ${id} was approved with comment: "${comment}".`;
            let nextApproverId: string | null = null;
            let nextStatus: string | null = null;

            // This is a committee or hierarchical approval
            if (requisition.status.startsWith('Pending')) {
                const totalValue = requisition.totalPrice;
                 switch (requisition.status) {
                    // Step 1: Committee Reviews
                    case 'Pending_Committee_A_Recommendation':
                        if (totalValue > 1000000) {
                            nextApproverId = await findApproverId('VP_Resources_and_Facilities');
                            nextStatus = 'Pending_VP_Approval';
                        } else { // 200,001 to 1,000,000
                            nextApproverId = await findApproverId('Director_Supply_Chain_and_Property_Management');
                            nextStatus = 'Pending_Director_Approval';
                        }
                        break;
                    case 'Pending_Committee_B_Review':
                        nextApproverId = await findApproverId('Manager_Procurement_Division');
                        nextStatus = 'Pending_Managerial_Review';
                        break;

                    // Step 2: Hierarchical Reviews
                    case 'Pending Managerial Review': // From 10,001 to 200,000
                        nextApproverId = await findApproverId('Director_Supply_Chain_and_Property_Management');
                        nextStatus = 'Pending_Director_Approval';
                        break;
                    case 'Pending Director Approval': // From 200,001 to 1M
                        nextApproverId = await findApproverId('VP_Resources_and_Facilities');
                        nextStatus = 'Pending_VP_Approval';
                        break;
                    case 'Pending VP Approval': // > 1M
                        nextApproverId = await findApproverId('President');
                        nextStatus = 'Pending_President_Approval';
                        break;
                    
                    case 'Pending_Approval': // This is the initial departmental approval
                        nextStatus = 'Approved';
                        const settings = await prisma.setting.findMany();
                        const rfqSetting = settings.find(s => s.key === 'rfqSenderSetting')?.value as any;
                        if (rfqSetting?.type === 'specific' && rfqSetting.userId) {
                            nextApproverId = rfqSetting.userId;
                        } else {
                            const firstProcOfficer = await prisma.user.findFirst({ where: { role: 'Procurement_Officer' } });
                            nextApproverId = firstProcOfficer?.id || null;
                        }
                        auditDetails += ` Department Head approved. Ready for RFQ and assigned to designated sender.`;
                        break;
                    
                    // Final Approvals in the chain
                    case 'Pending_Managerial_Approval': // <=10k - Final approval
                    case 'Pending_President_Approval': // >1M - Final approval
                        nextStatus = 'Approved'; 
                        nextApproverId = null; // To be handled by final notification step
                        auditDetails += ' Final approval received. Ready for vendor notification.'
                        break;
                    
                    default: 
                        nextStatus = 'Approved';
                        nextApproverId = null;
                }
            } else { // Should not happen if status starts with Pending
                 nextStatus = 'Approved';
                 nextApproverId = null;
            }

            dataToUpdate.status = nextStatus?.replace(/ /g, '_');
            if(nextApproverId) {
                 dataToUpdate.currentApproverId = nextApproverId;
            } else {
                dataToUpdate.currentApproverId = null;
            }


        } else if (status === 'Rejected') {
            dataToUpdate.currentApproverId = null;
            auditAction = 'REJECT_REQUISITION';
            auditDetails = `Requisition ${id} was rejected with comment: "${comment}".`;
        } else if (status === 'Pending Approval') {
            auditAction = 'SUBMIT_FOR_APPROVAL';
            auditDetails = `Draft requisition ${id} was submitted for approval.`;
            const department = await prisma.department.findUnique({ where: { id: requisition.departmentId! } });
            if (department?.headId) { dataToUpdate.currentApproverId = department.headId; }
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
