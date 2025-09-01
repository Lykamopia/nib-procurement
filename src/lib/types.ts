export type UserRole =
  | 'Requester'
  | 'Approver'
  | 'Procurement Officer'
  | 'Finance'
  | 'Admin';

export type RequisitionStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Approved'
  | 'Rejected'
  | 'RFQ In Progress'
  | 'PO Created'
  | 'Fulfilled'
  | 'Closed';

export type RequisitionItem = {
  id: string; // Will be UUID
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

export type PurchaseRequisition = {
  id: string; // Will be UUID
  requesterId: string; // User ID
  title: string;
  department: string;
  items: RequisitionItem[];
  totalPrice: number;
  justification: string;
  status: RequisitionStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type AuditLog = {
  id: string; // Will be UUID
  timestamp: Date;
  user: string;
  role: UserRole;
  action: string;
  entity: string; // e.g., 'Requisition', 'PurchaseOrder'
  entityId: string;
  details: string;
};
