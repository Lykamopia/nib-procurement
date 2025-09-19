
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { DocumentRecord } from '@/lib/types';

export async function GET() {
  const allRecords: any[] = [];

  const requisitions = await prisma.purchaseRequisition.findMany({ include: { requester: true } });
  requisitions.forEach(r => {
    allRecords.push({
      id: r.id,
      type: 'Requisition',
      title: r.title,
      status: r.status,
      date: r.createdAt,
      amount: r.totalPrice,
      user: r.requester?.name || 'N/A',
      relatedTo: [],
    });
  });

  const quotations = await prisma.quotation.findMany();
  quotations.forEach(q => {
    allRecords.push({
        id: q.id,
        type: 'Quotation',
        title: `Quote from ${q.vendorName}`,
        status: q.status,
        date: q.createdAt,
        amount: q.totalPrice,
        user: q.vendorName,
        relatedTo: [q.requisitionId]
    })
  })

  const purchaseOrders = await prisma.purchaseOrder.findMany({ include: { vendor: true } });
  purchaseOrders.forEach(po => {
    allRecords.push({
      id: po.id,
      type: 'Purchase Order',
      title: po.requisitionTitle,
      status: po.status,
      date: po.createdAt,
      amount: po.totalAmount,
      user: po.vendor.name,
      relatedTo: [po.requisitionId],
    });
  });
  
  const goodsReceipts = await prisma.goodsReceiptNote.findMany({ include: { receivedBy: true } });
  goodsReceipts.forEach(grn => {
    allRecords.push({
        id: grn.id,
        type: 'Goods Receipt',
        title: `GRN for PO ${grn.purchaseOrderId}`,
        status: 'Completed',
        date: grn.receivedDate,
        amount: 0,
        user: grn.receivedBy.name,
        relatedTo: [grn.purchaseOrderId]
    })
  })

  const invoices = await prisma.invoice.findMany();
  invoices.forEach(inv => {
    allRecords.push({
      id: inv.id,
      type: 'Invoice',
      title: `Invoice for PO ${inv.purchaseOrderId}`,
      status: inv.status,
      date: inv.invoiceDate,
      amount: inv.totalAmount,
      user: 'Finance Team',
      relatedTo: [inv.purchaseOrderId],
    });
  });

  allRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const auditLogs = await prisma.auditLog.findMany({ include: { user: true } });

  const recordsWithAudit = allRecords.map(record => {
      const relatedLogs = auditLogs.filter(log => log.entityId === record.id || record.relatedTo.includes(log.entityId))
      .map(log => ({ ...log, user: log.user?.name || 'System' }));

      return {
          ...record,
          auditTrail: relatedLogs
      }
  });

  return NextResponse.json(recordsWithAudit);
}
