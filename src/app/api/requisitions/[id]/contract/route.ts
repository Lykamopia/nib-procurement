
import { NextResponse } from 'next/server';
import { requisitions, auditLogs } from '@/lib/data-store';
import { users } from '@/lib/auth-store';
import { ContractDetails } from '@/lib/types';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { userId, notes, fileName } = body;

    const requisition = requisitions.find((r) => r.id === id);
    if (!requisition) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    const user = users.find(u => u.id === userId);
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const contractDetails: ContractDetails = {
      fileName: fileName,
      uploadDate: new Date(),
    };
    
    requisition.contract = contractDetails;
    requisition.negotiationNotes = notes;
    requisition.status = 'RFQ In Progress'; // Update status
    requisition.updatedAt = new Date();

    auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date(),
        user: user.name,
        role: user.role,
        action: 'ATTACH_CONTRACT',
        entity: 'Requisition',
        entityId: id,
        details: `Attached contract "${fileName}" and updated negotiation notes.`,
    });

    return NextResponse.json(requisition);

  } catch (error) {
    console.error('Failed to update contract details:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
