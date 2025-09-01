



import type { PurchaseRequisition, AuditLog, DepartmentBudget, Vendor, Quotation, PurchaseOrder, GoodsReceiptNote, Invoice } from './types';

export const departmentBudgets: DepartmentBudget[] = [
    { department: 'Design', totalBudget: 50000, spentBudget: 25000 },
    { department: 'Operations', totalBudget: 20000, spentBudget: 5000 },
    { department: 'IT', totalBudget: 100000, spentBudget: 75000 },
    { department: 'Marketing', totalBudget: 30000, spentBudget: 10000 },
];

export const vendors: Vendor[] = [
    {
        id: 'VENDOR-001',
        name: 'Apple Inc.',
        contactPerson: 'Tim Cook',
        email: 'sales@apple.com',
        phone: '1-800-MY-APPLE',
        address: '1 Apple Park Way, Cupertino, CA 95014'
    },
    {
        id: 'VENDOR-002',
        name: 'Dell Technologies',
        contactPerson: 'Michael Dell',
        email: 'sales@dell.com',
        phone: '1-877-275-3355',
        address: '1 Dell Way, Round Rock, TX 78682'
    },
    {
        id: 'VENDOR-003',
        name: 'Office Depot',
        contactPerson: 'Sales Team',
        email: 'support@officedepot.com',
        phone: '1-800-GO-DEPOT',
        address: '6600 N Military Trl, Boca Raton, FL 33496'
    }
];


export const requisitions: PurchaseRequisition[] = [
    {
    id: `REQ-1672531200`,
    requesterId: '1',
    requesterName: 'Alice',
    title: 'New Laptops for Design Team',
    department: 'Design',
    items: [
        { id: 'ITEM-1', name: 'MacBook Pro 16-inch', quantity: 5, unitPrice: 2499, description: '' },
        { id: 'ITEM-2', name: '4K Monitor', quantity: 5, unitPrice: 799, description: '' }
    ],
    totalPrice: 16490,
    justification: 'Current laptops are over 5 years old and struggling with new design software.',
    status: 'Approved',
    budgetStatus: 'OK',
    createdAt: new Date('2023-10-01T10:00:00Z'),
    updatedAt: new Date('2023-10-05T11:30:00Z'),
    },
    {
    id: `REQ-1672617600`,
    requesterId: '2',
    requesterName: 'Bob',
    title: 'Office Supplies Replenishment',
    department: 'Operations',
    items: [
        { id: 'ITEM-3', name: 'Printer Paper (Case)', quantity: 10, unitPrice: 45, description: '' },
        { id: 'ITEM-4', name: 'Toner Cartridge', quantity: 4, unitPrice: 150, description: '' }
    ],
    totalPrice: 1050,
    justification: 'Standard quarterly replenishment of office supplies.',
    status: 'Pending Approval',
    budgetStatus: 'OK',
    createdAt: new Date('2023-10-02T14:00:00Z'),
    updatedAt: new Date('2023-10-02T14:00:00Z'),
  },
  {
    id: `REQ-1672704000`,
    requesterId: '3',
    requesterName: 'Charlie',
    title: 'Software License Renewals',
    department: 'IT',
    items: [
      { id: 'ITEM-5', name: 'Project Management Tool (Annual)', quantity: 20, unitPrice: 240, description: '' },
    ],
    totalPrice: 4800,
    justification: 'Annual renewal for critical project management software.',
    status: 'PO Created',
    budgetStatus: 'OK',
    createdAt: new Date('2023-09-15T09:20:00Z'),
    updatedAt: new Date('2023-09-25T16:00:00Z'),
  },
];


export const auditLogs: AuditLog[] = [
  {
    id: 'log-001',
    timestamp: new Date('2023-10-26T10:00:00Z'),
    user: 'Alice',
    role: 'Requester',
    action: 'CREATE',
    entity: 'Requisition',
    entityId: 'REQ-2023-08-001',
    details: 'Created new requisition for "New Laptops for Design Team"',
  },
  {
    id: 'log-002',
    timestamp: new Date('2023-10-26T10:05:00Z'),
    user: 'System',
    role: 'Admin',
    action: 'POLICY_CHECK',
    entity: 'Requisition',
    entityId: 'REQ-2023-08-001',
    details: 'Automated policy check passed',
  },
  {
    id: 'log-003',
    timestamp: new Date('2023-10-26T11:30:00Z'),
    user: 'Bob',
    role: 'Approver',
    action: 'APPROVE',
    entity: 'Requisition',
    entityId: 'REQ-2023-08-001',
    details: 'Approved requisition. Comment: "Urgent need, proceed."',
  },
  {
    id: 'log-004',
    timestamp: new Date('2023-10-27T09:00:00Z'),
    user: 'Charlie',
    role: 'Procurement Officer',
    action: 'GENERATE_RFQ',
    entity: 'RFQ',
    entityId: 'RFQ-2023-10-005',
    details: 'Generated RFQ for REQ-2023-08-001',
  },
  {
    id: 'log-005',
    timestamp: new Date('2023-10-28T14:20:00Z'),
    user: 'Charlie',
    role: 'Procurement Officer',
    action: 'CREATE_PO',
    entity: 'PurchaseOrder',
    entityId: 'PO-2023-10-112',
    details: 'Created Purchase Order from RFQ-2023-10-005',
  },
];


export const quotations: Quotation[] = [];

export const purchaseOrders: PurchaseOrder[] = [];

export const goodsReceipts: GoodsReceiptNote[] = [];

export const invoices: Invoice[] = [];
