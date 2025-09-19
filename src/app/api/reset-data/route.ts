
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDb() {
    // The order is important to avoid foreign key constraint violations.
    // Delete from tables that are dependencies of others first.
    await prisma.auditLog.deleteMany({});
    await prisma.receiptItem.deleteMany({});
    await prisma.goodsReceiptNote.deleteMany({});
    await prisma.invoiceItem.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.pOItem.deleteMany({});
    await prisma.purchaseOrder.deleteMany({});
    await prisma.quoteAnswer.deleteMany({});
    await prisma.quoteItem.deleteMany({});
    await prisma.financialScore.deleteMany({});
    await prisma.technicalScore.deleteMany({});
    await prisma.committeeScoreSet.deleteMany({});
    await prisma.quotation.deleteMany({});
    await prisma.technicalCriterion.deleteMany({});
    await prisma.financialCriterion.deleteMany({});
    await prisma.evaluationCriteria.deleteMany({});
    await prisma.customQuestion.deleteMany({});
    await prisma.requisitionItem.deleteMany({});
    await prisma.committeeAssignment.deleteMany({});
    await prisma.purchaseRequisition.deleteMany({});
    await prisma.kYC_Document.deleteMany({});
    await prisma.vendor.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.department.deleteMany({});
}

export async function POST() {
  try {
    console.log('POST /api/reset-data - Resetting all application data.');
    await clearDb();
    // Re-running the seed logic can be complex here.
    // The intended use is `prisma db seed`.
    // We can just clear it, and the user can re-seed manually.
    return NextResponse.json({ message: 'Demo data has been cleared. Please run `npm run db:seed` to repopulate.' }, { status: 200 });
  } catch (error) {
    console.error('Failed to reset data:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to reset data', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unknown error occurred during data reset' }, { status: 500 });
  } finally {
      await prisma.$disconnect();
  }
}
