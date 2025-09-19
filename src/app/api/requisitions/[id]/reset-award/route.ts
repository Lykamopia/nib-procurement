
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log(`POST /api/requisitions/${params.id}/reset-award`);
  try {
    const requisitionId = params.id;
    const body = await request.json();
    console.log('Request body:', body);
    const { userId } = body;
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        console.error('User not found for ID:', userId);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const requisition = await prisma.purchaseRequisition.findUnique({ where: { id: requisitionId }});
    if (!requisition) {
      console.error('Requisition not found for ID:', requisitionId);
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }
    console.log('Found requisition to reset:', requisition);

    const { count } = await prisma.quotation.updateMany({
        where: { requisitionId },
        data: { status: 'Submitted' }
    });
    console.log(`Reset ${count} quotes to 'Submitted' status.`);

    const updatedRequisition = await prisma.purchaseRequisition.update({
        where: { id: requisitionId },
        data: { status: 'Approved', updatedAt: new Date() }
    });
    console.log(`Requisition ${requisitionId} status reverted to 'Approved'.`);

    const auditDetails = `changed the award decision for requisition ${requisitionId}, reverting all quotes to Submitted.`;
    
    await prisma.auditLog.create({
        data: {
            userId: user.id,
            role: user.role,
            action: 'RESET_AWARD',
            entity: 'Requisition',
            entityId: requisitionId,
            details: auditDetails,
        }
    });

    return NextResponse.json({ message: 'Award reset successfully', requisition: updatedRequisition });
  } catch (error) {
    console.error('Failed to reset award:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
