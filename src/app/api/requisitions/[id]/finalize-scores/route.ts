
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/services/email-service';
import { User } from '@/lib/types';
import { differenceInMinutes } from 'date-fns';


/**
 * Tallies scores and determines if an award can be made or if it needs escalation.
 * @returns An object indicating the result:
 *  - success: True if the process was valid.
 *  - escalated: True if the award value exceeds the actor's limit and was escalated.
 *  - message: A descriptive message of the outcome.
 *  - awards: The calculated award distribution (if not escalated).
 *  - escalationTarget: The user to whom the request was escalated (if applicable).
 */
export async function tallyAndAwardScores(
    requisitionId: string,
    actor?: User | null,
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

    // Calculate final average score for each quote
    allQuotesForReq.forEach(quote => {
        if (!quote.scores || quote.scores.length === 0) {
            quote.finalAverageScore = 0;
            return;
        }
        const totalScorers = quote.scores.length;
        const aggregateScore = quote.scores.reduce((sum, scoreSet) => sum + scoreSet.finalScore, 0);
        quote.finalAverageScore = aggregateScore / totalScorers;
    });

    // Award all to single winner
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

    // --- HIERARCHICAL APPROVAL LOGIC ---
    if (actor && actor.approvalLimit !== null && totalAwardValue > (actor.approvalLimit || 0)) {
        if (actor.managerId) {
             const manager = await prisma.user.findUnique({ where: { id: actor.managerId } });
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
    if (awardedVendorIds.length === 0) {
        throw new Error("No vendor was awarded. Cannot proceed.");
    }

    const awardedQuoteItemIds = Object.values(awards).flatMap((award: any) => award.items.map((item: any) => item.quoteItemId));

    await prisma.quotation.updateMany({
        where: { requisitionId: requisitionId },
        data: { status: 'Rejected', rank: null }
    });

    const allQuotesForReq = await prisma.quotation.findMany({
        where: { requisitionId },
        include: { items: true }
    });


    for (const vendorId of awardedVendorIds) {
        const quote = allQuotesForReq.find(q => q.vendorId === vendorId);
        if (quote) {
            const awardedItemsForThisVendor = quote.items.filter(i =>
                (awards[vendorId] as any).items.some((awarded: any) => awarded.quoteItemId === i.id)
            );
            const requisition = await prisma.purchaseRequisition.findUnique({ where: { id: requisitionId }, include: { items: true } });
            const isPartial = awardedVendorIds.length > 1 || awardedItemsForThisVendor.length < (requisition?.items.length ?? 0);

            await prisma.quotation.update({
                where: { id: quote.id },
                data: {
                    status: isPartial ? 'Partially_Awarded' : 'Awarded',
                    rank: 1
                }
            });
        }
    }

    const standbyCandidates = allQuotesForReq
        .filter(q => !awardedVendorIds.includes(q.vendorId))
        .sort((a, b) => (b.finalAverageScore || 0) - (a.finalAverageScore || 0));


    for (let i = 0; i < Math.min(2, standbyCandidates.length); i++) {
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

    const requisition = await prisma.purchaseRequisition.findUnique({ where: { id: requisitionId }, include: { items: true } });
    for (const vendorId of awardedVendorIds) {
        const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, include: { quotations: { include: { items: true } } } });
        if (vendor && requisition) {
            const awardDetails = awards[vendorId];
            const awardedQuoteItems = vendor.quotations
                .flatMap(q => q.items)
                .filter(item => awardDetails.items.some((i: any) => i.quoteItemId === item.id));

            const totalPriceForThisVendor = awardedQuoteItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
            const isPartialAward = awardedVendorIds.length > 1 || awardedQuoteItems.length < requisition.items.length;

            const itemsHtml = `...`; // Email content remains the same

            const emailHtml = `...`; // Email content remains the same

            // await sendEmail({ ... });
        }
    }
}


export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    const requisitionId = params.id;
    try {
        const body = await request.json();
        const { userId, awardResponseDeadline, highestApproverCanOverride } = body;

        const user: User | null = await prisma.user.findUnique({
            where: { id: userId },
            include: { role: true }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const requisition = await prisma.purchaseRequisition.findUnique({ where: { id: requisitionId } });
        if (!requisition) {
            return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
        }

        if (requisition.currentApproverId !== user.id) {
            return NextResponse.json({ error: 'Unauthorized. You are not the current approver for this award.' }, { status: 403 });
        }

        const result = await tallyAndAwardScores(
            requisitionId,
            user,
            highestApproverCanOverride
        );

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

        if (!result.success) {
            throw new Error(result.message);
        }

        await processAndNotifyAwards(requisitionId, result.awards, awardResponseDeadline ? new Date(awardResponseDeadline) : undefined);

        await prisma.auditLog.create({
            data: {
                timestamp: new Date(),
                user: { connect: { id: user.id } },
                action: 'FINALIZE_SCORES_AND_AWARD',
                entity: 'Requisition',
                entityId: requisitionId,
                details: `Finalized scores and distributed awards for requisition ${requisitionId}.`,
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
