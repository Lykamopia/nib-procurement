
import { NextResponse } from 'next/server';
import { auditLogs, quotations, requisitions } from '@/lib/data-store';
import { users } from '@/lib/auth-store';


export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const requisitionId = params.id;
    const body = await request.json();
    const { userId } = body;
    
    const user = users.find(u => u.id === userId);
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const requisition = requisitions.find(r => r.id === requisitionId);
    if (!requisition) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    // Revert all related quotes to 'Submitted'
    quotations.forEach(q => {
        if (q.requisitionId === requisitionId) {
            q.status = 'Submitted';
        }
    });

    // Revert requisition status
    requisition.status = 'Approved';
    requisition.updatedAt = new Date();

    const auditDetails = `changed the award decision for requisition ${requisitionId}, reverting all quotes to Submitted.`;
    
    auditLogs.unshift({
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        user: user.name,
        role: user.role,
        action: 'RESET_AWARD',
        entity: 'Requisition',
        entityId: requisitionId,
        details: auditDetails,
    });


    return NextResponse.json({ message: 'Award reset successfully', requisition });
  } catch (error) {
    console.error('Failed to reset award:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
