

'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { User, UserRole } from '@/lib/types';


async function findApproverId(role: UserRole): Promise<string | null> {
    const user = await prisma.user.findFirst({
        where: { role: role }
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
        if (!user || (user.role !== 'ProcurementOfficer' && user.role !== 'Admin')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }
        
        const committeeConfig = {
            A: { min: 200001, max: Infinity },
            B: { min: 10001, max: 200000 },
        };
        const managerProcId = await findApproverId('ManagerProcurement');
        
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

            // 1. Update winning quotes status to "Awarded" or "Partially Awarded"
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
            
            // 2. Set standby vendors
            const standbyQuotes = otherQuotes.slice(0, 2);
            if (standbyQuotes.length > 0) {
                for (let i = 0; i < standbyQuotes.length; i++) {
                    await tx.quotation.update({ where: { id: standbyQuotes[i].id }, data: { status: 'Standby', rank: (i + 2) as 2 | 3 } });
                }
            }
            
            // 3. Reject all other vendors
            const rejectedQuoteIds = otherQuotes.slice(2).map(q => q.id);
            if (rejectedQuoteIds.length > 0) {
                await tx.quotation.updateMany({ where: { id: { in: rejectedQuoteIds } }, data: { status: 'Rejected', rank: null } });
            }

            let nextStatus: string;
            let nextApproverId: string | null = null;
            let auditDetails: string;

            // Route for final approval based on total value
            if (totalAwardValue >= committeeConfig.A.min) {
                nextStatus = 'Pending_Committee_A_Recommendation';
                auditDetails = `Award finalized. Total value ${totalAwardValue.toLocaleString()} ETB. Routing to Committee A for recommendation.`;
            } else if (totalAwardValue >= committeeConfig.B.min) {
                nextStatus = 'Pending_Committee_B_Review';
                auditDetails = `Award finalized. Total value ${totalAwardValue.toLocaleString()} ETB. Routing to Committee B for review.`;
            } else { // <= 10,000, route directly to manager
                if (managerProcId) {
                    nextStatus = 'Pending_Managerial_Approval';
                    nextApproverId = managerProcId;
                    auditDetails = `Award finalized. Total value ${totalAwardValue.toLocaleString()} ETB. Routing for Managerial Approval.`;
                } else {
                     throw new Error("Manager, Procurement Division role not found.");
                }
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
                    transactionId: updatedRequisition.transactionId,
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
