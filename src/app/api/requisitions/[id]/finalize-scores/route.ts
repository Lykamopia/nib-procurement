

'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/services/email-service';
import { Vendor, Quotation, QuoteItem, User } from '@/lib/types';
import { differenceInMinutes } from 'date-fns';

const COMMITTEE_B_THRESHOLD = 10000;
const COMMITTEE_A_THRESHOLD = 200000;

export async function tallyAndAwardScores(
    requisitionId: string, 
    actor?: User | null
) {
    
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
    
    if (sortedByScore.length === 0) {
        throw new Error("No scored quotes available to determine a winner.");
    }
    const winner = sortedByScore[0];
    const totalAwardValue = winner.totalPrice;

    // --- COMMITTEE REVIEW & HIERARCHICAL APPROVAL LOGIC ---
    let nextStatus: any = 'Approved'; // Default if no review/approval needed
    let nextApproverId: string | null = null;
    let auditDetails = `Finalized scores for requisition ${requisitionId}. Winner: ${winner.vendorName} with a value of ${totalAwardValue.toLocaleString()} ETB.`;

    if (totalAwardValue >= COMMITTEE_A_THRESHOLD) {
        nextStatus = 'Pending_Committee_A_Review';
        auditDetails += " Awaiting review from Committee A.";
    } else if (totalAwardValue >= COMMITTEE_B_THRESHOLD) {
        nextStatus = 'Pending_Committee_B_Review';
        auditDetails += " Awaiting review from Committee B.";
    } else {
        // If below thresholds, it's considered approved, but let's check if it still needs final manager sign-off
        if (actor && actor.approvalLimit !== null && totalAwardValue > (actor.approvalLimit || 0)) {
            if (!actor.managerId) {
                throw new Error(`Award value of ${totalAwardValue.toLocaleString()} ETB exceeds the final approver's limit of ${(actor.approvalLimit || 0).toLocaleString()} ETB.`);
            }
            nextStatus = 'Pending_Final_Approval';
            nextApproverId = actor.managerId;
            auditDetails += " Award requires final managerial approval.";
        }
    }

    // Update ranks for all quotes first
    for (const quote of allQuotesForReq) {
        const rank = sortedByScore.findIndex(q => q.id === quote.id) + 1;
        await prisma.quotation.update({
            where: { id: quote.id },
            data: { rank: rank > 0 ? rank : null }
        });
    }

    // Now update the requisition status to trigger the next step in the workflow
    await prisma.purchaseRequisition.update({
        where: { id: requisitionId },
        data: {
            status: nextStatus,
            currentApproverId: nextApproverId,
            awardedQuoteItemIds: winner.items.map(i => i.id) // Pre-select winning items
        }
    });

    if (actor) {
        await prisma.auditLog.create({
            data: {
                timestamp: new Date(),
                user: { connect: { id: actor.id } },
                action: 'FINALIZE_SCORES',
                entity: 'Requisition',
                entityId: requisitionId,
                details: auditDetails,
            }
        });
    }

    // IMPORTANT: Vendor notification is now deferred.
    // It will happen only after all reviews and approvals are complete.
    
    return { success: true, message: "Scores tallied. Requisition has been moved to the next review/approval step." };
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const requisitionId = params.id;
  try {
    const body = await request.json();
    const { userId } = body;

    const user: User | null = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'Procurement_Officer' && user.role !== 'Admin') {
        return NextResponse.json({ error: 'Unauthorized to finalize awards.' }, { status: 403 });
    }
    
    const result = await tallyAndAwardScores(requisitionId, user);

    if (!result.success) {
        throw new Error(result.message);
    }
    
    return NextResponse.json({ message: result.message });
  } catch (error) {
    console.error('Failed to finalize scores:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}

    