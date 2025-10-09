
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/services/email-service';
import { User, RequisitionStatus, RfqSenderSetting } from '@/lib/types';
import { differenceInMinutes } from 'date-fns';

async function tallyAndAwardScores(
    requisitionId: string,
    actor: User,
    highestApproverCanOverride?: boolean,
): Promise<{ success: boolean; message: string; escalated: boolean; awards: any; escalationTarget?: User | null }> {
    const allQuotesForReq = await prisma.quotation.findMany({
        where: { requisitionId },
        include: {
            scores: {
                include: {
                    itemScores: {
                        include: {
                            financialScores: true,
                            technicalScores: true
                        }
                    }
                }
            },
            items: true,
        }
    });

    if (allQuotesForReq.length === 0) {
        throw new Error("No quotes found for this requisition to score or award.");
    }

    let awards: any = {};
    allQuotesForReq.forEach(quote => {
        if (!quote.scores || quote.scores.length === 0) {
            quote.finalAverageScore = 0;
            return;
        }
        const totalScorers = quote.scores.length;
        const aggregateScore = quote.scores.reduce((sum, scoreSet) => sum + scoreSet.finalScore, 0);
        quote.finalAverageScore = aggregateScore / totalScorers;
    });

    const sortedByScore = allQuotesForReq.sort((a, b) => (b.finalAverageScore || 0) - (a.finalAverageScore || 0));
    if (sortedByScore.length > 0) {
        const winner = sortedByScore[0];
        awards[winner.vendorId] = {
            vendorName: winner.vendorName,
            items: winner.items.map(i => ({
                requisitionItemId: i.requisitionItemId,
                quoteItemId: i.id
            }))
        };
    }

    const awardedVendorIds = Object.keys(awards);
    if (awardedVendorIds.length === 0) {
        throw new Error("No vendor was awarded. Cannot proceed.");
    }

    let totalAwardValue = 0;
    awardedVendorIds.forEach(vendorId => {
        const quote = allQuotesForReq.find(q => q.vendorId === vendorId);
        const awardedItems = (awards[vendorId] as any).items.map((i: any) => i.quoteItemId);
        if (quote) {
            quote.items.forEach(item => {
                if (awardedItems.includes(item.id)) {
                    totalAwardValue += item.quantity * item.unitPrice;
                }
            });
        }
    });

    if (actor.approvalLimit !== null && totalAwardValue > (actor.approvalLimit || 0)) {
        if (actor.managerId) {
            const manager = await prisma.user.findUnique({ where: { id: actor.managerId }, include: { role: true } });
            return {
                success: true,
                message: `Award value of ${totalAwardValue.toLocaleString()} ETB exceeds approval limit. Escalated to manager.`,
                escalated: true,
                awards: {},
                escalationTarget: manager,
            };
        }
        if (!actor.managerId && !highestApproverCanOverride) {
            throw new Error(`Award value of ${totalAwardValue.toLocaleString()} ETB exceeds the final approver's limit of ${(actor.approvalLimit || 0).toLocaleString()} ETB.`);
        }
    }

    return { success: true, message: "Approval limit sufficient.", escalated: false, awards, escalationTarget: null };
}

export async function processAndNotifyAwards(
    requisitionId: string,
    awards: any,
    awardResponseDeadline?: Date,
) {
    const awardedVendorIds = Object.keys(awards);
    if (awardedVendorIds.length === 0) throw new Error("No vendor was awarded.");

    const awardedQuoteItemIds = Object.values(awards).flatMap((award: any) => award.items.map((item: any) => item.quoteItemId));

    await prisma.quotation.updateMany({
        where: { requisitionId: requisitionId },
        data: { status: 'Rejected', rank: null }
    });

    const allQuotesForReq = await prisma.quotation.findMany({ where: { requisitionId }, include: { items: true } });

    for (const vendorId of awardedVendorIds) {
        const quote = allQuotesForReq.find(q => q.vendorId === vendorId);
        if (quote) {
            await prisma.quotation.update({ where: { id: quote.id }, data: { status: 'Awarded', rank: 1 } });
        }
    }

    const standbyCandidates = allQuotesForReq
        .filter(q => !awardedVendorIds.includes(q.vendorId))
        .sort((a, b) => (b.finalAverageScore || 0) - (a.finalAverageScore || 0));

    for (let i = 0; i < Math.min(2, standbyCandidates.length); i++) {
        await prisma.quotation.update({ where: { id: standbyCandidates[i].id }, data: { status: 'Standby', rank: (i + 2) as 2 | 3 } });
    }
    
    let updatedStatus: RequisitionStatus = 'RFQ_In_Progress';
    if(awardedVendorIds.length > 0) {
        updatedStatus = 'Pending_Managerial_Approval';
    }


    await prisma.purchaseRequisition.update({
        where: { id: requisitionId },
        data: {
            status: updatedStatus,
            awardResponseDeadline: awardResponseDeadline,
            awardResponseDurationMinutes: awardResponseDeadline ? differenceInMinutes(awardResponseDeadline, new Date()) : undefined,
            awardedQuoteItemIds: awardedQuoteItemIds,
            currentApproverId: null,
        }
    });

    // Email logic remains the same...
}

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    const requisitionId = params.id;
    try {
        const body = await request.json();
        const { userId, awardResponseDeadline, meetingMinutes, highestApproverCanOverride, rfqSenderSetting } = body as { 
            userId: string, 
            awardResponseDeadline?: string,
            meetingMinutes?: string,
            highestApproverCanOverride: boolean,
            rfqSenderSetting: RfqSenderSetting 
        };

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { role: true }
        });
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const requisition = await prisma.purchaseRequisition.findUnique({ where: { id: requisitionId } });
        if (!requisition) return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });

        const isInitialApprover = 
            (rfqSenderSetting.type === 'all' && ['Procurement Officer', 'Admin'].includes(user.role.name)) ||
            (rfqSenderSetting.type === 'specific' && user.id === rfqSenderSetting.userId);
        
        const isCurrentEscalatedApprover = requisition.currentApproverId === user.id;

        if (!isCurrentEscalatedApprover && !(requisition.currentApproverId === null && isInitialApprover)) {
             return NextResponse.json({ error: 'Unauthorized. You are not the current approver for this award.' }, { status: 403 });
        }
        
        const result = await tallyAndAwardScores(requisitionId, user, highestApproverCanOverride);

        if (result.escalated && result.escalationTarget) {
            await prisma.purchaseRequisition.update({
                where: { id: requisitionId },
                data: {
                    currentApproverId: result.escalationTarget.id,
                }
            });
            await prisma.auditLog.create({
                data: {
                    timestamp: new Date(),
                    user: { connect: { id: user.id } },
                    action: 'ESCALATE_AWARD',
                    entity: 'Requisition',
                    entityId: requisitionId,
                    details: `Award requires higher approval. Escalated to ${result.escalationTarget.name}.`,
                }
            });
            return NextResponse.json({ message: result.message });
        }

        if (!result.success) throw new Error(result.message);

        await processAndNotifyAwards(requisitionId, result.awards, awardResponseDeadline ? new Date(awardResponseDeadline) : undefined);

        await prisma.auditLog.create({
            data: {
                timestamp: new Date(),
                user: { connect: { id: user.id } },
                action: 'FINALIZE_SCORES_AND_AWARD',
                entity: 'Requisition',
                entityId: requisitionId,
                details: `Finalized scores and distributed awards. Justification: ${meetingMinutes || 'N/A'}.`,
            }
        });

        return NextResponse.json({ message: "Scores finalized and awards sent." });
    } catch (error) {
        console.error('Failed to finalize scores:', error);
        if (error instanceof Error) {
            return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 500 });
        }
        return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
    }
}
