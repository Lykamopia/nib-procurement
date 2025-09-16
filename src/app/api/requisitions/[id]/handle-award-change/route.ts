
'use server';

import { NextResponse } from 'next/server';
import { auditLogs, quotations, requisitions } from '@/lib/data-store';
import { users } from '@/lib/auth-store';

type AwardAction = 'promote_second' | 'promote_third' | 'restart_rfq';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log(`POST /api/requisitions/${params.id}/handle-award-change`);
  try {
    const requisitionId = params.id;
    const body = await request.json();
    console.log('Request body:', body);
    const { userId, action, newDeadline } = body as { userId: string; action: AwardAction, newDeadline?: string };

    const user = users.find(u => u.id === userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const requisition = requisitions.find(r => r.id === requisitionId);
    if (!requisition) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    const reqQuotes = quotations.filter(q => q.requisitionId === requisitionId);
    const currentAwarded = reqQuotes.find(q => q.status === 'Awarded');
    const secondStandby = reqQuotes.find(q => q.rank === 2);
    const thirdStandby = reqQuotes.find(q => q.rank === 3);
    let auditDetails = ``;

    switch (action) {
      case 'promote_second':
        if (!currentAwarded || !secondStandby) {
          return NextResponse.json({ error: 'Invalid state for promoting second vendor.' }, { status: 400 });
        }
        currentAwarded.status = 'Failed'; // Or a new 'Failed' status could be added
        secondStandby.status = 'Awarded';
        secondStandby.rank = 1;
        // Demote 3rd to 2nd if it exists
        if (thirdStandby) {
            thirdStandby.rank = 2;
        }
        auditDetails = `Promoted second standby vendor (${secondStandby.vendorName}) to Awarded after primary vendor failure.`;
        break;

      case 'promote_third':
        if (!currentAwarded || !thirdStandby) {
          return NextResponse.json({ error: 'Invalid state for promoting third vendor.' }, { status: 400 });
        }
        currentAwarded.status = 'Failed';
        thirdStandby.status = 'Awarded';
        thirdStandby.rank = 1; // The new primary
        if(secondStandby) {
            secondStandby.status = 'Rejected'; // The second one was skipped/failed
        }
        auditDetails = `Promoted third standby vendor (${thirdStandby.vendorName}) to Awarded after other vendors failed.`;
        break;

      case 'restart_rfq':
        // Find all quote IDs for the current requisition
        const quoteIdsToDelete = quotations
            .filter(q => q.requisitionId === requisitionId)
            .map(q => q.id);

        // Remove the quotes from the main quotations array
        const originalCount = quotations.length;
        const updatedQuotations = quotations.filter(q => !quoteIdsToDelete.includes(q.id));
        quotations.length = 0; // Clear the original array
        Array.prototype.push.apply(quotations, updatedQuotations); // Repopulate with filtered quotes
        
        // Also clear them from the requisition object itself
        if (requisition.quotations) {
            requisition.quotations = [];
        }

        requisition.status = 'Approved';
        requisition.deadline = undefined;
        requisition.awardResponseDeadline = undefined;
        auditDetails = `Canceled all awards and restarted RFQ process for requisition ${requisitionId}. All previous quotes have been deleted.`;
        break;

      default:
        return NextResponse.json({ error: 'Invalid action specified.' }, { status: 400 });
    }
    
    requisition.awardResponseDeadline = newDeadline ? new Date(newDeadline) : undefined;
    requisition.updatedAt = new Date();

    const auditLogEntry = {
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        user: user.name,
        role: user.role,
        action: 'HANDLE_AWARD_CHANGE' as const,
        entity: 'Requisition',
        entityId: requisitionId,
        details: auditDetails,
    };
    auditLogs.unshift(auditLogEntry);

    return NextResponse.json({ message: 'Award change handled successfully.', requisition });
  } catch (error) {
    console.error('Failed to handle award change:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
