
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { User, UserRole } from '@/lib/types';


async function findApproverId(role: UserRole): Promise<string | null> {
    const user = await prisma.user.findFirst({
        where: { role: role.replace(/ /g, '_') }
    });
    return user?.id || null;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
    const requisitionId = params.id;
    try {
        const body = await request.json();
        const { userId, awards, awardStrategy, awardResponseDeadline, totalAwardValue } = body;

        const user: User | null = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || (user.role !== 'Procurement_Officer' && user.role !== 'Admin')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }
        
        // Define approval chain thresholds
        const presidentMin = 1000001;
        const vpMin = 200001;
        const directorMin = 10001;
        const managerMin = 0; // <= 10,000

        // Start transaction
        const result = await prisma.$transaction(async (tx) => {
            
            const allQuotes = await tx.quotation.findMany({ 
                where: { requisitionId: requisitionId }, 
                orderBy: { finalAverageScore: 'desc' } 
            });

            if (allQuotes.length === 0) {
                throw new Error("No quotes found to process for this requisition.");
            }

            const awardedVendorIds = Object.keys(awards);
            const winnerQuotes = allQuotes.filter(q => awardedVendorIds.includes(q.vendorId));
            const otherQuotes = allQuotes.filter(q => !awardedVendorIds.includes(q.vendorId));

            // 1. Update winning quotes
            for (const quote of winnerQuotes) {
                const award = awards[quote.vendorId];
                 await tx.quotation.update({
                    where: { id: quote.id },
                    data: {
                        status: award.items.length > 0 ? (awardStrategy === 'all' ? 'Awarded' : 'Partially_Awarded') : 'Rejected',
                        rank: 1 // All winners get rank 1
                    }
                });
            }
            
            // 2. Update standby quotes
            const standbyQuotes = otherQuotes.slice(0, 2);
            if (standbyQuotes.length > 0) {
                for (let i = 0; i < standbyQuotes.length; i++) {
                    await tx.quotation.update({ where: { id: standbyQuotes[i].id }, data: { status: 'Standby', rank: (i + 2) as 2 | 3 } });
                }
            }
            
            // 3. Reject all other quotes
            const rejectedQuoteIds = otherQuotes.slice(2).map(q => q.id);
            if (rejectedQuoteIds.length > 0) {
                await tx.quotation.updateMany({ where: { id: { in: rejectedQuoteIds } }, data: { status: 'Rejected', rank: null } });
            }

            let nextStatus: string;
            let nextApproverId: string | null = null;
            let auditDetails: string;

            // 4. Determine initial routing based on value
            if (totalAwardValue >= presidentMin) { // Above 1M -> Reviewed by VP
                nextApproverId = await findApproverId('VP_Resources_and_Facilities');
                nextStatus = 'Pending_VP_Approval';
                auditDetails = `Award value ${totalAwardValue.toLocaleString()} ETB. Routing to VP for review.`;
            } else if (totalAwardValue >= vpMin) { // 200k to 1M -> Reviewed by Director
                nextApproverId = await findApproverId('Director_Supply_Chain_and_Property_Management');
                nextStatus = 'Pending_Director_Approval';
                auditDetails = `Award value ${totalAwardValue.toLocaleString()} ETB. Routing to Director for review.`;
            } else if (totalAwardValue >= directorMin) { // 10k to 200k -> Reviewed by Manager
                nextApproverId = await findApproverId('Manager_Procurement_Division');
                nextStatus = 'Pending_Managerial_Review';
                auditDetails = `Award value ${totalAwardValue.toLocaleString()} ETB. Routing to Manager for review.`;
            } else { // <= 10k -> Final approval by Manager
                nextApproverId = await findApproverId('Manager_Procurement_Division');
                nextStatus = 'Pending_Managerial_Approval';
                auditDetails = `Award value ${totalAwardValue.toLocaleString()} ETB. Routing for final Managerial Approval.`;
            }
            
            if(!nextApproverId) {
                throw new Error(`Could not find a user for the required approval role. Status was set to ${nextStatus}`);
            }

            const awardedItemIds = Object.values(awards).flatMap((a: any) => a.items.map((i: any) => i.quoteItemId));
            
            const updatedRequisition = await tx.purchaseRequisition.update({
                where: { id: requisitionId },
                data: {
                    status: nextStatus as any,
                    currentApproverId: nextApproverId,
                    awardedQuoteItemIds: awardedItemIds,
                    awardResponseDeadline: awardResponseDeadline ? new Date(awardResponseDeadline) : undefined,
                    totalPrice: totalAwardValue
                }
            });

            await tx.auditLog.create({
                data: {
                    user: { connect: { id: userId } },
                    action: 'FINALIZE_AWARD',
                    entity: 'Requisition',
                    entityId: requisitionId,
                    details: auditDetails
                }
            });
            
            return updatedRequisition;
        }, {
            maxWait: 10000,
            timeout: 20000,
        });

        return NextResponse.json({ message: 'Award process finalized and routed for review.', requisition: result });

    } catch (error) {
        console.error("Failed to finalize scores and award:", error);
        if (error instanceof Error) {
            return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 500 });
        }
        return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
    }
}
