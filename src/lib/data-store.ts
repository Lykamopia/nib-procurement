

import type { PurchaseRequisition, AuditLog, Vendor, Quotation, PurchaseOrder, GoodsReceiptNote, Invoice, User, Department } from './types';
import { getInitialData, AppData } from './seed-data';

let data: AppData = getInitialData();

export function resetData() {
  data = getInitialData();
  // We need to re-link the quotations to the requisitions after reset
  data.requisitions.forEach(req => {
    req.quotations = data.quotations.filter(q => q.requisitionId === req.id);
  });
   // Also re-link vendor users to vendors
  data.vendors.forEach(vendor => {
    const user = data.users.find(u => u.id === vendor.userId);
    if (user) {
        user.vendorId = vendor.id;
    }
  });
}

// Initial load
data.requisitions.forEach(req => {
  req.quotations = data.quotations.filter(q => q.requisitionId === req.id);
});

// Also re-link vendor users to vendors on initial load
data.vendors.forEach(vendor => {
    const user = data.users.find(u => u.id === vendor.userId);
    if (user) {
        user.vendorId = vendor.id;
    }
});

// Seed committee assignments on initial load
data.users.forEach(user => {
    if (user.role === 'Committee Member') {
        user.committeeAssignments = [];
        data.requisitions.forEach(req => {
            if (req.financialCommitteeMemberIds?.includes(user.id) || req.technicalCommitteeMemberIds?.includes(user.id)) {
                // In a real app, you'd check if scores are actually submitted.
                // For demo, we'll assume they aren't finalized initially.
                user.committeeAssignments.push({ requisitionId: req.id, scoresSubmitted: false });
            }
        })
    }
})


export const vendors: Vendor[] = data.vendors;
export const requisitions: PurchaseRequisition[] = data.requisitions;
export const auditLogs: AuditLog[] = data.auditLogs;
export const quotations: Quotation[] = data.quotations;
export const purchaseOrders: PurchaseOrder[] = data.purchaseOrders;
export const goodsReceipts: GoodsReceiptNote[] = data.goodsReceipts;
export const invoices: Invoice[] = data.invoices;
export const users: User[] = data.users;
export const departments: Department[] = data.departments;
