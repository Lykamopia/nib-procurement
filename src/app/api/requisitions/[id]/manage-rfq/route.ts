
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { User, UserRole } from '@/lib/types';


type RFQAction = 'update' | 'cancel';

// In a real app, this would come from a centralized config service or database
// For now, we simulate fetching it. This should mirror the logic in the AuthProvider context.
const getRfqSenderSetting = async (): Promise<{ type: 'all' | 'specific', userId?: string | null }> => {
    // This is a placeholder. In a real scenario, you'd fetch this from your database or config store.
    // We assume the frontend and backend settings are in sync.
    // For this case, we know 'Charlie' is the specific person. We need his ID.
    const charlie = await prisma.user.findFirst({ where: { name: 'Charlie' }});
    // Defaulting to 'all' if Charlie isn't found, but for the bug fix, we assume he is.
    // A more robust solution would read this from a 'Settings' table in the DB.
    if (charlie) {
        return { type: 'specific', userId: charlie.id };
    }
    return { type: 'all', userId: null };
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const requisitionId = params.id;
    const body = await request.json();
    const { userId, action, reason, newDeadline } = body as {
      userId: string;
      action: RFQAction;
      reason: string;
      newDeadline?: string;
    };

    const user: User | null = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Authorization Check
    const rfqSetting = await getRfqSenderSetting();
    let isAuthorized = false;
    if (rfqSetting.type === 'all') {
        isAuthorized = user.role === 'Procurement_Officer' || user.role === 'Admin';
    } else if (rfqSetting.type === 'specific') {
        isAuthorized = user.id === rfqSetting.userId || user.role === 'Admin'; // Admin can always manage
    }
    
    if (!isAuthorized) {
        return NextResponse.json({ error: 'Unauthorized: You do not have permission to manage this RFQ.' }, { status: 403 });
    }


    const requisition = await prisma.purchaseRequisition.findUnique({ where: { id: requisitionId }});
    if (!requisition) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    if (requisition.status !== 'RFQ_In_Progress') {
        return NextResponse.json({ error: 'This action is only available for requisitions with an active RFQ.' }, { status: 400 });
    }

    let updatedRequisition;
    let auditAction: string = '';
    let auditDetails: string = '';

    switch (action) {
      case 'update':
        if (!newDeadline) {
          return NextResponse.json({ error: 'A new deadline is required for an update.' }, { status: 400 });
        }
        updatedRequisition = await prisma.purchaseRequisition.update({
            where: { id: requisitionId },
            data: { deadline: new Date(newDeadline) }
        });
        auditAction = 'UPDATE_RFQ_DEADLINE';
        auditDetails = `Updated RFQ deadline for requisition ${requisitionId} to ${new Date(newDeadline).toLocaleDateString()}. Reason: ${reason}`;
        break;
      case 'cancel':
        await prisma.quotation.updateMany({ where: { requisitionId }, data: { status: 'Rejected' }});
        updatedRequisition = await prisma.purchaseRequisition.update({
            where: { id: requisitionId },
            data: { status: 'Approved', deadline: null }
        });
        auditAction = 'CANCEL_RFQ';
        auditDetails = `Cancelled RFQ for requisition ${requisitionId}. Reason: ${reason}`;
        break;
      default:
        return NextResponse.json({ error: 'Invalid action specified.' }, { status: 400 });
    }

    await prisma.auditLog.create({
        data: {
            timestamp: new Date(),
            user: { connect: { id: user.id } },
            action: auditAction,
            entity: 'Requisition',
            entityId: requisitionId,
            details: auditDetails,
        }
    });

    return NextResponse.json({ message: 'RFQ successfully modified.', requisition: updatedRequisition });
  } catch (error) {
    console.error('Failed to manage RFQ:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
