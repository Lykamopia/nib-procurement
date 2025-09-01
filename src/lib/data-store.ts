
import type { PurchaseRequisition, AuditLog } from './types';

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
