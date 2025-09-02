
import type { PurchaseRequisition, AuditLog, DepartmentBudget, Vendor, Quotation, PurchaseOrder, GoodsReceiptNote, Invoice } from './types';
import { getInitialData, AppData } from './seed-data';

let data: AppData = getInitialData();

export function resetData() {
  data = getInitialData();
  // We need to re-link the quotations to the requisitions after reset
  data.requisitions.forEach(req => {
    req.quotations = data.quotations.filter(q => q.requisitionId === req.id);
  });
   // Also re-link vendor users to vendors
  const vendorUsers = data.users.filter(u => u.role === 'Vendor');
  vendorUsers.forEach(user => {
    const vendor = data.vendors.find(v => v.userId === user.id);
    if (vendor) {
        (user as any).vendorId = vendor.id;
    }
  });
}

// Initial load
data.requisitions.forEach(req => {
  req.quotations = data.quotations.filter(q => q.requisitionId === req.id);
});


export const departmentBudgets: DepartmentBudget[] = data.departmentBudgets;
export const vendors: Vendor[] = data.vendors;
export const requisitions: PurchaseRequisition[] = data.requisitions;
export const auditLogs: AuditLog[] = data.auditLogs;
export const quotations: Quotation[] = data.quotations;
export const purchaseOrders: PurchaseOrder[] = data.purchaseOrders;
export const goodsReceipts: GoodsReceiptNote[] = data.goodsReceipts;
export const invoices: Invoice[] = data.invoices;
