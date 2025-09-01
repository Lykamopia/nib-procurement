
import { NextResponse } from 'next/server';
import { requisitions, purchaseOrders, goodsReceipts, invoices, quotations, auditLogs } from '@/lib/data-store';
import { DocumentRecord } from '@/lib/types';

export async function GET() {
  const allRecords: DocumentRecord[] = [];

  requisitions.forEach(r => {
    allRecords.push({
      id: r.id,
      type: 'Requisition',
      title: r.title,
      status: r.status,
      date: r.createdAt,
      amount: r.totalPrice,
      user: r.requesterName || 'N/A',
      relatedTo: [],
    });
  });

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
  
  goodsReceipts.forEach(grn => {
    allRecords.push({
        id: grn.id,
        type: 'Goods Receipt',
        title: `GRN for PO ${grn.purchaseOrderId}`,
        status: 'Completed',
        date: grn.receivedDate,
        amount: 0,
        user: grn.receivedBy,
        relatedTo: [grn.purchaseOrderId]
    })
  })

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

  // Sort all records by date descending
  allRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Add audit log data to each record
  const recordsWithAudit = allRecords.map(record => ({
      ...record,
      auditTrail: auditLogs.filter(log => log.entityId === record.id || record.relatedTo.includes(log.entityId))
  }));

  return NextResponse.json(recordsWithAudit);
}
