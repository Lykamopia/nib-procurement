
export type UserRole =
  | 'Requester'
  | 'Approver'
  | 'Procurement Officer'
  | 'Finance'
  | 'Admin';

export type User = {
  id: string;
  name: string;
  email: string;
  password?: string; // Should not be sent to client
  role: UserRole;
};

export type RequisitionStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Approved'
  | 'Rejected'
  | 'RFQ In Progress'
  | 'PO Created'
  | 'Fulfilled'
  | 'Closed';

export type BudgetStatus = 'Pending' | 'OK' | 'Exceeded';

export type RequisitionItem = {
  id: string; // Will be UUID
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

export type PurchaseRequisition = {
  id:string; // Will be UUID
  requesterId: string; // User ID
  requesterName?: string;
  title: string;
  department: string;
  items: RequisitionItem[];
  totalPrice: number;
  justification: string;
  status: RequisitionStatus;
  budgetStatus: BudgetStatus;
  createdAt: Date;
  updatedAt: Date;
  approverId?: string;
  approverComment?: string;
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

export type DepartmentBudget = {
  department: string;
  totalBudget: number;
  spentBudget: number;
}
