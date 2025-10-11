
import { UserRole } from './types';
import {
  LayoutDashboard,
  FilePlus,
  FileText,
  GanttChartSquare,
  Building2,
  ShieldCheck,
  FileBadge,
  FileSignature,
  FileStack,
  Landmark,
  PackageCheck,
  Archive,
  History,
  Settings,
  Wallet,
} from 'lucide-react';
import { ComponentType } from 'react';

export interface NavItem {
  path: string;
  label: string;
  icon: ComponentType<any>;
}

export const navItems: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/new-requisition', label: 'New Requisition', icon: FilePlus },
  { path: '/requisitions', label: 'Requisitions', icon: FileText },
  { path: '/approvals', label: 'Approvals', icon: GanttChartSquare },
  { path: '/vendors', label: 'Vendors', icon: Building2 },
  { path: '/vendor-verification', label: 'Vendor Verification', icon: ShieldCheck },
  { path: '/quotations', label: 'Quotations', icon: FileBadge },
  { path: '/contracts', label: 'Contracts', icon: FileSignature },
  { path: '/purchase-orders', label: 'Purchase Orders', icon: FileStack },
  { path: '/invoices', label: 'Invoices', icon: Landmark },
  { path: '/receive-goods', label: 'Receive Goods', icon: PackageCheck },
  { path: '/records', label: 'Records', icon: Archive },
  { path: '/audit-log', label: 'Audit Log', icon: History },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export const rolePermissions: Record<UserRole, string[]> = {
  Admin: navItems.map(item => item.path), // Admin has access to all pages
  'Procurement_Officer': [
    '/dashboard',
    '/new-requisition',
    '/requisitions',
    '/vendors',
    '/vendor-verification',
    '/quotations',
    '/contracts',
    '/purchase-orders',
    '/invoices',
    '/records',
    '/audit-log',
    '/settings',
  ],
  'Committee': [
    '/dashboard',
    '/quotations',
    '/records',
  ],
  Requester: [
    '/dashboard',
    '/new-requisition',
    '/requisitions',
    '/records'
  ],
  Approver: [
    '/dashboard',
    '/requisitions',
    '/approvals',
    '/records'
  ],
  Finance: [
    '/dashboard',
    '/invoices',
    '/records',
    '/purchase-orders'
  ],
  Receiving: [
    '/dashboard',
    '/receive-goods',
    '/records',
  ],
  Vendor: [], // Vendor has a separate layout, no access to the main app layout
  'Committee_Member': [
    '/dashboard',
    '/quotations',
    '/records'
  ],
  'Committee_A_Member': [
    '/dashboard',
    '/quotations', // or a new review page
    '/records',
  ],
  'Committee_B_Member': [
      '/dashboard',
      '/quotations', // or a new review page
      '/records',
  ],
};
