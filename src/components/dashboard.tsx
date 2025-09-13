

'use client';

import React, { useState, useEffect } from 'react';
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
  Banknote,
  CircleDollarSign,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Progress } from './ui/progress';
import { useToast } from '@/hooks/use-toast';

interface DashboardProps {
  setActiveView: (view: string) => void;
}

interface DashboardStats {
  openRequisitions: number;
  pendingApprovals: number;
  budgetStatus: {
    spent: number;
    total: number;
  };
  pendingPayments: number;
}

const StatCard = ({
  title,
  value,
  description,
  icon,
  onClick,
  cta,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  onClick?: () => void;
  cta?: string;
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
    {onClick && cta && (
      <CardFooter>
        <Button variant="outline" size="sm" onClick={onClick}>
          {cta} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    )}
  </Card>
);

export function Dashboard({ setActiveView }: DashboardProps) {
  const { role, user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/dashboard');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleResetData = async () => {
    setIsResetting(true);
    try {
      const response = await fetch('/api/reset-data', {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to reset data');
      toast({
        title: 'Demo Data Reset',
        description: 'The application data has been reset to its initial state.',
      });
      // Optionally, refresh dashboard stats or reload the page
      fetchStats();
      // Or simply window.location.reload();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Could not reset demo data.',
      });
    } finally {
      setIsResetting(false);
    }
  };

  const budgetPercentage = stats
    ? (stats.budgetStatus.spent / stats.budgetStatus.total) * 100
    : 0;

  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderDashboard = () => {
    switch (role) {
      case 'Requester':
        return (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Open Requisitions"
              value={stats?.openRequisitions.toString() || '0'}
              description="Your active and pending requests"
              icon={<FileText className="h-4 w-4 text-muted-foreground" />}
              onClick={() => setActiveView('audit-log')}
              cta="View History"
            />
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
        );
      case 'Approver':
        return (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Pending Approvals"
              value={stats?.pendingApprovals.toString() || '0'}
              description="Requisitions awaiting your review"
              icon={
                <GanttChartSquare className="h-4 w-4 text-muted-foreground" />
              }
              cta="Review Now"
              onClick={() => setActiveView('approvals')}
            />
          </div>
        );
      case 'Procurement Officer':
        return (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Open Requisitions"
              value={stats?.openRequisitions.toString() || '0'}
              description="Across all departments"
              icon={<FileText className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard
              title="Pending Approvals"
              value={stats?.pendingApprovals.toString() || '0'}
              description="Awaiting manager sign-off"
              icon={
                <GanttChartSquare className="h-4 w-4 text-muted-foreground" />
              }
            />
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Budget Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.budgetStatus.spent.toLocaleString()} ETB / 
                  {stats?.budgetStatus.total.toLocaleString()} ETB
                </div>
                <p className="text-xs text-muted-foreground">
                  {budgetPercentage.toFixed(1)}% of budget utilized
                </p>
                <Progress value={budgetPercentage} className="mt-2" />
              </CardContent>
            </Card>
            <StatCard
              title="Pending Payments"
              value={stats?.pendingPayments.toString() || '0'}
              description="Invoices awaiting payment"
              icon={<Banknote className="h-4 w-4 text-muted-foreground" />}
            />
          </div>
        );
      default:
        return <p>No dashboard available for this role.</p>;
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-bold">Welcome back, {user?.name}!</h1>
            <p className="text-muted-foreground">
            Here's a summary of procurement activities for your role as a{' '}
            <strong>{role}</strong>.
            </p>
        </div>
        <Button variant="outline" onClick={handleResetData} disabled={isResetting}>
            {isResetting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Reset Demo Data
        </Button>
      </div>
      {renderDashboard()}
    </div>
  );
}
