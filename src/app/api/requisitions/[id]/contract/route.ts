
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
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

    const requisition = await prisma.purchaseRequisition.findUnique({ where: { id } });
    if (!requisition) {
      console.error('Requisition not found for ID:', id);
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }
    console.log('Found requisition:', requisition);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        console.error('User not found for ID:', userId);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const contractDetails: ContractDetails = {
      fileName: fileName,
      uploadDate: new Date(),
    };
    
    const updatedRequisition = await prisma.purchaseRequisition.update({
        where: { id },
        data: {
            contract: contractDetails as any, // Prisma expects JsonValue
            negotiationNotes: notes,
            updatedAt: new Date(),
        }
    });
    console.log('Attached contract and notes to requisition.');

    await prisma.auditLog.create({
        data: {
            userId: user.id,
            role: user.role,
            action: 'ATTACH_CONTRACT',
            entity: 'Requisition',
            entityId: id,
            details: `Attached contract "${fileName}" and updated negotiation notes.`,
        }
    });

    return NextResponse.json(updatedRequisition);

  } catch (error) {
    console.error('Failed to update contract details:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
