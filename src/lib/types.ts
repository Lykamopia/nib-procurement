
export type UserRole =
  | 'Requester'
  | 'Approver'
  | 'Procurement Officer'
  | 'Finance'
  | 'Admin'
  | 'Receiving'
  | 'Vendor';

export type User = {
  id: string;
  name: string;
  email: string;
  password?: string; // Should not be sent to client
  role: UserRole;
  vendorId?: string;
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
  unitPrice?: number;
};

export type ContractDetails = {
    fileName: string;
    uploadDate: Date;
}

export type PurchaseRequisition = {
  id:string; // Will be UUID
  requesterId: string; // User ID
  requesterName?: string;
  title: string;
  department: string;
  items: RequisitionItem[];
  totalPrice?: number;
  justification: string;
  status: RequisitionStatus;
  budgetStatus: BudgetStatus;
  createdAt: Date;
  updatedAt: Date;
  approverId?: string;
  approverComment?: string;
  quotations?: Quotation[];
  contract?: ContractDetails;
  negotiationNotes?: string;
  purchaseOrderId?: string;
  allowedVendorIds?: 'all' | string[];
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

export type KycStatus = 'Pending' | 'Verified' | 'Rejected';

export type KycDocument = {
    name: string;
    url: string;
    submittedAt: Date;
}

export type Vendor = {
  id: string;
  userId: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  kycStatus: KycStatus;
  kycDocuments?: KycDocument[];
  rejectionReason?: string;
};

export type QuoteItem = {
    requisitionItemId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    leadTimeDays: number;
};

export type QuotationStatus = 'Submitted' | 'Awarded' | 'Rejected' | 'Standby' | 'Invoice Submitted' | 'Failed';


export type Quotation = {
    id: string;
    requisitionId: string;
    vendorId: string;
    vendorName: string;
    items: QuoteItem[];
    totalPrice: number;
    deliveryDate: Date;
    createdAt: Date;
    status: QuotationStatus;
    notes?: string;
    rank?: 1 | 2 | 3;
};

export type POItem = {
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    receivedQuantity: number;
};

export type PurchaseOrderStatus = 'Issued' | 'Acknowledged' | 'Shipped' | 'Partially Delivered' | 'Delivered' | 'Cancelled' | 'Matched' | 'Mismatched';

export type PurchaseOrder = {
    id: string;
    requisitionId: string;
    requisitionTitle: string;
    vendor: Vendor;
    items: POItem[];
    totalAmount: number;
    status: PurchaseOrderStatus;
    createdAt: Date;
    contract?: ContractDetails;
    notes?: string;
    receipts?: GoodsReceiptNote[];
    invoices?: Invoice[];
};


export type ReceiptItem = {
    poItemId: string;
    name: string;
    quantityOrdered: number;
    quantityReceived: number;
    condition: 'Good' | 'Damaged' | 'Incorrect';
    notes?: string;
}

export type GoodsReceiptNote = {
    id: string;
    purchaseOrderId: string;
    receivedBy: string; // User's name
    receivedById: string; // User's ID
    receivedDate: Date;
    items: ReceiptItem[];
    photos?: { name: string; url: string }[];
}

export type InvoiceItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type InvoiceStatus = 'Pending' | 'Approved for Payment' | 'Paid' | 'Disputed';

export type Invoice = {
  id: string;
  purchaseOrderId: string;
  vendorId: string;
  invoiceDate: Date;
  items: InvoiceItem[];
  totalAmount: number;
  status: InvoiceStatus;
  documentUrl?: string;
  paymentDate?: Date;
  paymentReference?: string;
};


export type MatchingStatus = 'Matched' | 'Mismatched' | 'Pending';

export type MatchingResult = {
  poId: string;
  status: MatchingStatus;
  quantityMatch: boolean;
  priceMatch: boolean;
  details: {
    poTotal: number;
    grnTotalQuantity: number;
    invoiceTotal: number;
    invoiceTotalQuantity: number;
    items: {
      itemId: string;
      itemName: string;
      poQuantity: number;
      grnQuantity: number;
      invoiceQuantity: number;
      poUnitPrice: number;
      invoiceUnitPrice: number;
      quantityMatch: boolean;
      priceMatch: boolean;
    }[];
  };
};

export type DocumentRecord = {
    id: string;
    type: 'Requisition' | 'Purchase Order' | 'Invoice' | 'Quotation' | 'Goods Receipt' | 'Contract';
    title: string;
    status: string;
    date: Date;
    amount: number;
    user: string;
    relatedTo: string[];
    auditTrail?: AuditLog[];
}
