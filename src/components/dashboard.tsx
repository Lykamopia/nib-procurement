'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  FilePlus,
  FileText,
  GanttChartSquare,
  History,
  MailQuestion,
} from 'lucide-react';
import { useRole } from '@/contexts/role-context';
import { Badge } from './ui/badge';

type View =
  | 'dashboard'
  | 'new-requisition'
  | 'policy-check'
  | 'rfq-generator'
  | 'audit-log';

interface DashboardProps {
  setActiveView: (view: View) => void;
}

const StatCard = ({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

const RequesterDashboard = ({
  setActiveView,
}: {
  setActiveView: (view: View) => void;
}) => (
  <div>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="My Requisitions"
        value="12"
        description="5 pending, 7 approved"
        icon={<FileText className="h-4 w-4 text-muted-foreground" />}
      />
      <StatCard
        title="Drafts"
        value="3"
        description="Requisitions not submitted"
        icon={<FileText className="h-4 w-4 text-muted-foreground" />}
      />
    </div>
    <div className="mt-8">
      <Card>
        <CardHeader>
          <CardTitle>Start a New Procurement Request</CardTitle>
          <CardDescription>
            Need something for your team? Start by creating a purchase
            requisition.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={() => setActiveView('new-requisition')}>
            <FilePlus className="mr-2 h-4 w-4" /> Create New Requisition
          </Button>
        </CardFooter>
      </Card>
    </div>
  </div>
);

const ApproverDashboard = () => (
  <div>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Pending Approvals"
        value="8"
        description="Requisitions awaiting your review"
        icon={<GanttChartSquare className="h-4 w-4 text-muted-foreground" />}
      />
      <StatCard
        title="Approved This Month"
        value="23"
        description="Total value: $45,210"
        icon={<FileText className="h-4 w-4 text-muted-foreground" />}
      />
      <StatCard
        title="Rejected This Month"
        value="2"
        description="Awaiting clarification"
        icon={<FileText className="h-4 w-4 text-muted-foreground" />}
      />
    </div>
    <div className="mt-8">
      <Card>
        <CardHeader>
          <CardTitle>Requisitions Awaiting Your Approval</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            <li className="flex items-center justify-between">
              <div>
                <p className="font-medium">REQ-2023-09-015: Office Chairs</p>
                <p className="text-sm text-muted-foreground">
                  Requester: David | Department: HR | Total: $2,500
                </p>
              </div>
              <Button variant="outline" size="sm">
                Review <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </li>
            <li className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  REQ-2023-09-014: Adobe Creative Cloud Licenses
                </p>
                <p className="text-sm text-muted-foreground">
                  Requester: Alice | Department: Design | Total: $1,800
                </p>
              </div>
              <Button variant="outline" size="sm">
                Review <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  </div>
);

const ProcurementDashboard = () => (
  <div>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Active RFQs"
        value="5"
        description="Awaiting vendor responses"
        icon={<MailQuestion className="h-4 w-4 text-muted-foreground" />}
      />
      <StatCard
        title="Purchase Orders"
        value="32"
        description="Issued this month"
        icon={<FileText className="h-4 w-4 text-muted-foreground" />}
      />
      <StatCard
        title="Pending Policy Checks"
        value="2"
        description="Requisitions to review with AI"
        icon={<GanttChartSquare className="h-4 w-4 text-muted-foreground" />}
      />
      <StatCard
        title="Vendors"
        value="89"
        description="Active vendors in the system"
        icon={<History className="h-4 w-4 text-muted-foreground" />}
      />
    </div>
    <div className="mt-8">
      <Card>
        <CardHeader>
          <CardTitle>Open Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            <li className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  REQ-2023-09-012: Onboarding Kits
                </p>
                <p className="text-sm text-muted-foreground">
                  Status: Approved | Next Step: Generate RFQ
                </p>
              </div>
              <Badge variant="secondary">RFQ Required</Badge>
            </li>
            <li className="flex items-center justify-between">
              <div>
                <p className="font-medium">PO-2023-09-088: Cloud Hosting</p>
                <p className="text-sm text-muted-foreground">
                  Status: Goods Received | Next Step: 3-Way Match
                </p>
              </div>
              <Badge variant="destructive">Invoice Pending</Badge>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  </div>
);

export function Dashboard({ setActiveView }: DashboardProps) {
  const { role } = useRole();

  const renderDashboard = () => {
    switch (role) {
      case 'Requester':
        return <RequesterDashboard setActiveView={setActiveView} />;
      case 'Approver':
        return <ApproverDashboard />;
      case 'Procurement Officer':
        return <ProcurementDashboard />;
      default:
        return <RequesterDashboard setActiveView={setActiveView} />;
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {role}!</h1>
        <p className="text-muted-foreground">
          Here's a summary of procurement activities.
        </p>
      </div>
      {renderDashboard()}
    </div>
  );
}
