import type { PurchaseRequisition, AuditLog, DepartmentBudget, Vendor, Quotation, PurchaseOrder, GoodsReceiptNote, Invoice } from './types';

export interface AppData {
    departmentBudgets: DepartmentBudget[];
    vendors: Vendor[];
    requisitions: PurchaseRequisition[];
    auditLogs: AuditLog[];
    quotations: Quotation[];
    purchaseOrders: PurchaseOrder[];
    goodsReceipts: GoodsReceiptNote[];
    invoices: Invoice[];
}

export function getInitialData(): AppData {
  // Use structuredClone for a deep copy to ensure the original seed data is never mutated.
  return structuredClone(seedData);
}

const seedData: AppData = {
    departmentBudgets: [
        { department: 'Design', totalBudget: 50000, spentBudget: 16490 },
        { department: 'Operations', totalBudget: 20000, spentBudget: 1050 },
        { department: 'IT', totalBudget: 100000, spentBudget: 4800 },
        { department: 'Marketing', totalBudget: 30000, spentBudget: 0 },
    ],

    vendors: [
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
    ],

    requisitions: [
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
            quotations: [],
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
            quotations: [],
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
            purchaseOrderId: 'PO-SEED-001',
            quotations: [],
        },
    ],

    auditLogs: [
        {
            id: 'log-001',
            timestamp: new Date('2023-10-26T10:00:00Z'),
            user: 'Alice',
            role: 'Requester',
            action: 'CREATE',
            entity: 'Requisition',
            entityId: 'REQ-1672531200',
            details: 'Created new requisition for "New Laptops for Design Team"',
        },
        {
            id: 'log-002',
            timestamp: new Date('2023-10-26T10:05:00Z'),
            user: 'System',
            role: 'Admin',
            action: 'POLICY_CHECK',
            entity: 'Requisition',
            entityId: 'REQ-1672531200',
            details: 'Automated policy check passed',
        },
        {
            id: 'log-003',
            timestamp: new Date('2023-10-26T11:30:00Z'),
            user: 'Bob',
            role: 'Approver',
            action: 'APPROVE',
            entity: 'Requisition',
            entityId: 'REQ-1672531200',
            details: 'Approved requisition. Comment: "Urgent need, proceed."',
        },
    ],

    quotations: [],
    purchaseOrders: [],
    goodsReceipts: [],
    invoices: [],
};
