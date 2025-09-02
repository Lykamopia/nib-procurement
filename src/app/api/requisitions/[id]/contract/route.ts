

import { NextResponse } from 'next/server';
import { requisitions, auditLogs } from '@/lib/data-store';
import { users } from '@/lib/auth-store';
import { ContractDetails } from '@/lib/types';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log(`POST /api/requisitions/${params.id}/contract`);
  try {
    const { id } = params;
    const body = await request.json();
    console.log('Request body:', body);
    const { userId, notes, fileName } = body;

    const requisition = requisitions.find((r) => r.id === id);
    if (!requisition) {
      console.error('Requisition not found for ID:', id);
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }
    console.log('Found requisition:', requisition);

    const user = users.find(u => u.id === userId);
    if (!user) {
        console.error('User not found for ID:', userId);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const contractDetails: ContractDetails = {
      fileName: fileName,
      uploadDate: new Date(),
    };
    
    requisition.contract = contractDetails;
    requisition.negotiationNotes = notes;
    requisition.updatedAt = new Date();
    console.log('Attached contract and notes to requisition.');

    const auditLogEntry = {
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        user: user.name,
        role: user.role,
        action: 'ATTACH_CONTRACT',
        entity: 'Requisition',
        entityId: id,
        details: `Attached contract "${fileName}" and updated negotiation notes.`,
    };
    auditLogs.unshift(auditLogEntry);
    console.log('Added audit log:', auditLogEntry);

    return NextResponse.json(requisition);

  } catch (error) {
    console.error('Failed to update contract details:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
