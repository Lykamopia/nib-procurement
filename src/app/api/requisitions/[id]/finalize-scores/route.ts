

'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { User } from '@/lib/types';
import { finalizeAndNotifyVendors } from '../../route';


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
        
        const committeeA_Min = 200001;
        const committeeB_Min = 10000;

        let nextStatus: string;
        let auditDetails: string;

        // Start transaction
        const result = await prisma.$transaction(async (tx) => {
            // 1. Update quote statuses based on awards
            const vendorIds = Object.keys(awards);
            for (const vendorId of vendorIds) {
                const award = awards[vendorId];
                const quote = await tx.quotation.findFirst({
                    where: { vendorId: vendorId, requisitionId: requisitionId }
                });
                if (quote) {
                    await tx.quotation.update({
                        where: { id: quote.id },
                        data: {
                            status: award.items.length > 0 ? (awardStrategy === 'all' ? 'Awarded' : 'Partially_Awarded') : 'Rejected'
                        }
                    });
                }
            }

            // Reject all other vendors
            await tx.quotation.updateMany({
                where: {
                    requisitionId: requisitionId,
                    vendorId: { notIn: vendorIds }
                },
                data: { status: 'Rejected' }
            });

            // 2. Set ranks for winners and standby
            const allQuotes = await tx.quotation.findMany({ where: { requisitionId: requisitionId }, orderBy: { finalAverageScore: 'desc' } });
            let rank = 1;
            for (const quote of allQuotes) {
                if (vendorIds.includes(quote.vendorId)) {
                    await tx.quotation.update({ where: { id: quote.id }, data: { rank: rank++ } });
                } else if (rank <= 3) {
                     await tx.quotation.update({ where: { id: quote.id }, data: { status: 'Standby', rank: rank++ } });
                }
            }
            
            // 3. Determine next status based on award value
            if (totalAwardValue >= committeeA_Min) {
                nextStatus = 'Pending_Committee_A_Recommendation';
                auditDetails = `Award finalized. Total value ${totalAwardValue.toLocaleString()} ETB. Routing to Committee A for final review.`;
            } else if (totalAwardValue >= committeeB_Min) {
                nextStatus = 'Pending_Committee_B_Review';
                auditDetails = `Award finalized. Total value ${totalAwardValue.toLocaleString()} ETB. Routing to Committee B for final review.`;
            } else {
                nextStatus = 'Approved'; // Auto-approved for low value
                auditDetails = `Award finalized. Total value ${totalAwardValue.toLocaleString()} ETB. Auto-approved due to low value. Notifying vendor.`;
                // If auto-approved, we can call the notification logic directly.
                await finalizeAndNotifyVendors(requisitionId, awardResponseDeadline ? new Date(awardResponseDeadline) : undefined);
            }
            
            // 4. Update the requisition
            const updatedRequisition = await tx.purchaseRequisition.update({
                where: { id: requisitionId },
                data: {
                    status: nextStatus as any,
                    awardedQuoteItemIds: Object.values(awards).flatMap((a: any) => a.items.map((i: any) => i.quoteItemId)),
                    awardResponseDeadline: awardResponseDeadline ? new Date(awardResponseDeadline) : undefined,
                }
            });

            // 5. Create Audit Log
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
        });


        return NextResponse.json({ message: 'Award process finalized.', requisition: result });

    } catch (error) {
        console.error("Failed to finalize scores and award:", error);
        if (error instanceof Error) {
            return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 500 });
        }
        return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
    }
}
