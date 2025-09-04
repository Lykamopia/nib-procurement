

import type { PurchaseRequisition, AuditLog, DepartmentBudget, Vendor, Quotation, PurchaseOrder, GoodsReceiptNote, Invoice, User } from './types';
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


export const departmentBudgets: DepartmentBudget[] = data.departmentBudgets;
export const vendors: Vendor[] = data.vendors;
export const requisitions: PurchaseRequisition[] = data.requisitions;
export const auditLogs: AuditLog[] = data.auditLogs;
export const quotations: Quotation[] = data.quotations;
export const purchaseOrders: PurchaseOrder[] = data.purchaseOrders;
export const goodsReceipts: GoodsReceiptNote[] = data.goodsReceipts;
export const invoices: Invoice[] = data.invoices;
export const users: User[] = data.users;

