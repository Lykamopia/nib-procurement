

'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/services/email-service';
import { Vendor, Quotation, QuoteItem, User } from '@/lib/types';
import { differenceInMinutes } from 'date-fns';


export async function tallyAndAwardScores(
    requisitionId: string, 
    actor?: User | null
) {
    const committeeConfig = {
        A: { min: 200001, max: Infinity },
        B: { min: 10000, max: 200000 },
    };

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

    // Determine the winner
    const sortedByScore = allQuotesForReq.sort((a, b) => (b.finalAverageScore || 0) - (a.finalAverageScore || 0));
    const winner = sortedByScore[0];

    if (!winner) {
        throw new Error("Could not determine a winner.");
    }

    const totalAwardValue = winner.totalPrice;

    // --- NEW: ROUTE TO COMMITTEE BASED ON VALUE ---
    let nextStatus: string = 'Approved'; // Default if below all thresholds
    let auditAction = 'AWARD_RECOMMENDATION_APPROVED';
    let auditDetails = `Award value of ${totalAwardValue.toLocaleString()} ETB is within discretionary limits. Proceeding to notify vendor.`;

    if (totalAwardValue >= committeeConfig.B.min && totalAwardValue <= committeeConfig.B.max) {
        nextStatus = 'Pending_Committee_B_Review';
        auditAction = 'ROUTE_TO_COMMITTEE_B';
        auditDetails = `Award value of ${totalAwardValue.toLocaleString()} ETB requires Committee B review.`;
    } else if (totalAwardValue >= committeeConfig.A.min) {
        nextStatus = 'Pending_Committee_A_Recommendation';
        auditAction = 'ROUTE_TO_COMMITTEE_A';
        auditDetails = `Award value of ${totalAwardValue.toLocaleString()} ETB requires Committee A recommendation.`;
    }

    // Update the requisition status to reflect the next step in the workflow
    await prisma.purchaseRequisition.update({
        where: { id: requisitionId },
        data: { status: nextStatus as any }
    });
    
    // Log the routing decision
    if (actor) {
        await prisma.auditLog.create({
            data: {
                timestamp: new Date(),
                user: { connect: { id: actor.id } },
                action: auditAction,
                entity: 'Requisition',
                entityId: requisitionId,
                details: auditDetails,
            }
        });
    }

    // If the award is below committee thresholds, we can proceed to notify the vendor.
    if (nextStatus === 'Approved') {
        // This is now handled in the PATCH /api/requisitions route after approval.
        // For simplicity, we assume if it doesn't need committee review, it's auto-approved.
        // A more complex workflow might have another layer.
        const { finalizeAndNotifyVendors } = await import('@/app/api/requisitions/route');
        await finalizeAndNotifyVendors(requisitionId);
        return { success: true, message: "Award value is within limits. Vendor has been notified.", escalated: false };
    }

    // If we are here, it means it was routed to a committee.
    return { success: true, message: `Award recommendation has been routed to the appropriate committee for review.`, escalated: true };
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const requisitionId = params.id;
  try {
    const body = await request.json();
    const { userId } = body;

    const user: User | null = await prisma.user.findUnique({where: {id: userId}});
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
