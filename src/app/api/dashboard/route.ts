
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const openRequisitions = await prisma.purchaseRequisition.count({
    where: {
      status: {
        notIn: ['Closed', 'Fulfilled']
      }
    }
  });

  const pendingApprovals = await prisma.purchaseRequisition.count({
    where: {
      status: 'Pending_Approval'
    }
  });

  const pendingPayments = await prisma.invoice.count({
    where: {
      status: 'Approved_for_Payment'
    }
  });

  return NextResponse.json({
    openRequisitions,
    pendingApprovals,
    pendingPayments
  });
}
