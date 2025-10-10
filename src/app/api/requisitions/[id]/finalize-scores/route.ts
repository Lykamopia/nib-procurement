
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/services/email-service';
import { User, RequisitionStatus } from '@/lib/types';
import { differenceInMinutes } from 'date-fns';

/**
 * Determines the correct approver for an award based on its value.
 * It finds the user with the smallest approval limit that is still sufficient.
 * @param awardValue The total value of the items being awarded.
 * @returns The user object of the determined approver, or null.
 */
async function determineAwardApprover(awardValue: number): Promise<User | null> {
    const allApprovers = await prisma.user.findMany({
        where: {
            approvalLimit: {
                gt: 0
            }
        },
        orderBy: {
            approvalLimit: 'asc'
        }
    });

    if (allApprovers.length === 0) {
        return null;
    }

    // Find the first user in the sorted list whose limit is sufficient
    // We use >= to include the case where the limit is exactly the award value.
    const bestFitApprover = allApprovers.find(u => (u.approvalLimit || 0) >= awardValue);

    // If a best-fit is found (including someone with an exact limit), they are the approver.
    if (bestFitApprover) {
        return bestFitApprover as User;
    }

    // If no single user has a high enough limit, find the absolute highest approver.
    // This handles the "override" scenario.
    const highestApprover = allApprovers.sort((a, b) => (b.approvalLimit || 0) - (a.approvalLimit || 0))[0];
    
    return highestApprover as User;
}

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    const requisitionId = params.id;
    try {
        const body = await request.json();
        const { userId, awardResponseDeadline, meetingMinutes } = body as { 
            userId: string, 
            awardResponseDeadline?: string,
            meetingMinutes?: string
        };

        const actor = await prisma.user.findUnique({
            where: { id: userId },
            include: { role: true }
        });
        if (!actor) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const requisition = await prisma.purchaseRequisition.findUnique({ where: { id: requisitionId } });
        if (!requisition) return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
        
        // This is the settings object for who can initiate this flow
        const rfqSenderSetting = (requisition.rfqSettings as any)?.value || { type: 'all' };

        // Authorization: Check if the user is the current designated approver OR the initial approver if none is set.
        const isInitialApprover = 
            (rfqSenderSetting.type === 'all' && ['Procurement Officer', 'Admin'].includes(actor.role.name.replace(/_/g, ' '))) ||
            (rfqSenderSetting.type === 'specific' && actor.id === rfqSenderSetting.userId);
        
        const isCurrentEscalatedApprover = requisition.currentApproverId === actor.id;

        if (!isCurrentEscalatedApprover && !(requisition.currentApproverId === null && isInitialApprover)) {
             return NextResponse.json({ error: 'Unauthorized. You are not the current approver for this award.' }, { status: 403 });
        }
        
        // --- Tally scores and find the winning quote's value ---
        const allQuotesForReq = await prisma.quotation.findMany({ where: { requisitionId }, include: { items: true } });
        if (allQuotesForReq.length === 0) {
            throw new Error("No quotes found for this requisition to score or award.");
        }

        const sortedByScore = allQuotesForReq.sort((a, b) => (b.finalAverageScore || 0) - (a.finalAverageScore || 0));
        const winningQuote = sortedByScore[0];
        const awardValue = winningQuote.totalPrice;

        // --- Determine the next approver ---
        const nextApprover = await determineAwardApprover(awardValue);

        if (!nextApprover) {
            throw new Error("No suitable approver could be found for this award value.");
        }
        
        // If the actor IS NOT the correct final approver, escalate it.
        if (actor.id !== nextApprover.id) {
             await prisma.purchaseRequisition.update({
                where: { id: requisitionId },
                data: {
                    status: 'Pending_Managerial_Approval',
                    currentApproverId: nextApprover.id,
                }
            });
            await prisma.auditLog.create({
                data: {
                    transactionId: requisition.transactionId,
                    timestamp: new Date(),
                    user: { connect: { id: actor.id } },
                    action: 'ESCALATE_AWARD',
                    entity: 'Requisition',
                    entityId: requisitionId,
                    details: `Award value of ${awardValue.toLocaleString()} ETB requires higher approval. Assigned to ${nextApprover.name}.`,
                }
            });
            
            // Notify the next approver
            await sendEmail({
                to: nextApprover.email,
                subject: `Award Approval Required: ${requisition.title}`,
                html: `<p>An award for requisition <strong>${requisition.title}</strong> has been assigned to you for final approval.</p><p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/quotations/${requisitionId}">View and Finalize Award</a></p>`
            });

            return NextResponse.json({ message: `Award requires higher approval. Assigned to ${nextApprover.name}.` });
        }
        
        // --- If the actor IS the correct final approver, finalize the award ---
        const awardedQuoteItemIds = winningQuote.items.map(item => item.id);

        // Reject all other quotes
        await prisma.quotation.updateMany({
            where: { requisitionId: requisitionId, NOT: { vendorId: winningQuote.vendorId } },
            data: { status: 'Rejected', rank: null }
        });
        // Award the winning quote
        await prisma.quotation.update({ where: { id: winningQuote.id }, data: { status: 'Awarded', rank: 1 } });
        
        // Mark standby vendors
        const standbyCandidates = sortedByScore.filter(q => q.id !== winningQuote.id);
        for (let i = 0; i < Math.min(2, standbyCandidates.length); i++) {
            await prisma.quotation.update({ where: { id: standbyCandidates[i].id }, data: { status: 'Standby', rank: (i + 2) as 2 | 3 } });
        }

        // Update the requisition state
        await prisma.purchaseRequisition.update({
            where: { id: requisitionId },
            data: {
                status: 'RFQ_In_Progress', // Indicates award has been sent out
                awardResponseDeadline: awardResponseDeadline ? new Date(awardResponseDeadline) : undefined,
                awardResponseDurationMinutes: awardResponseDeadline ? differenceInMinutes(new Date(awardResponseDeadline), new Date()) : undefined,
                awardedQuoteItemIds: awardedQuoteItemIds,
            }
        });
        
        await prisma.auditLog.create({
            data: {
                transactionId: requisition.transactionId,
                timestamp: new Date(),
                user: { connect: { id: actor.id } },
                action: 'FINALIZE_SCORES_AND_AWARD',
                entity: 'Requisition',
                entityId: requisitionId,
                details: `Finalized scores and distributed award to ${winningQuote.vendorName}. Justification: ${meetingMinutes || 'N/A'}.`,
            }
        });
        
        // Notify the awarded vendor
        const awardedVendor = await prisma.vendor.findUnique({ where: { id: winningQuote.vendorId }});
        if(awardedVendor) {
            await sendEmail({
                to: awardedVendor.email,
                subject: `Congratulations! You've been awarded: ${requisition.title}`,
                html: `<p>You have been awarded the contract for requisition <strong>${requisition.title}</strong>.</p><p>Please log in to the vendor portal to accept or decline the award.</p><p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/vendor/dashboard">Go to Vendor Portal</a></p>`
            });
        }


        return NextResponse.json({ message: "Scores finalized and awards sent." });
    } catch (error) {
        console.error('Failed to finalize scores:', error);
        if (error instanceof Error) {
            return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 500 });
        }
        return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
    }
}
