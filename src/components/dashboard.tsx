
'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  RefreshCw,
  Loader2,
  Banknote,
  AlertTriangle,
  FileWarning,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Progress } from './ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Invoice, PurchaseRequisition, MatchingResult, MatchingStatus } from '@/lib/types';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from './ui/table';
import { Badge } from './ui/badge';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface DashboardProps {
  setActiveView: (view: string) => void;
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


function ProcurementOfficerDashboard({ setActiveView }: { setActiveView: (view: string) => void }) {
    const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

     const fetchData = async () => {
        setLoading(true);
        try {
            const [reqResponse, invResponse] = await Promise.all([
                fetch('/api/requisitions'),
                fetch('/api/invoices')
            ]);
            const reqData = await reqResponse.json();
            const invData = await invResponse.json();
            setRequisitions(reqData);
            setInvoices(invData);
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const stats = useMemo(() => {
        const openRequisitions = requisitions.filter(r => r.status !== 'Closed' && r.status !== 'Fulfilled').length;
        const pendingApprovals = requisitions.filter(r => r.status === 'Pending Approval').length;
        const pendingPayments = invoices.filter(i => i.status === 'Approved for Payment').length;
        // Budget data is static for this example
        const budget = { spent: 156345, total: 250000 };

        return { openRequisitions, pendingApprovals, pendingPayments, budget };
    }, [requisitions, invoices]);
    
    const alerts = useMemo(() => {
        const budgetExceeded = requisitions.filter(r => r.budgetStatus === 'Exceeded' && r.status === 'Pending Approval');
        const mismatchedInvoices = invoices.filter(i => {
            // Simplified check, in a real app this would use the matching service result
            const po = { totalAmount: 1000, items: [{id: '1', quantity: 10}]};
            const grn = { items: [{poItemId: '1', quantityReceived: 9}]};
            return i.totalAmount !== po.totalAmount;
        });
        return { budgetExceeded, mismatchedInvoices };
    }, [requisitions, invoices]);

    const budgetPercentage = (stats.budget.spent / stats.budget.total) * 100;
    
    const recentRequisitions = useMemo(() => {
        return [...requisitions]
            .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5);
    }, [requisitions]);

    if (loading) {
        return <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                 <StatCard
                    title="Open Requisitions"
                    value={stats.openRequisitions.toString()}
                    description="Across all departments"
                    icon={<FileText className="h-4 w-4 text-muted-foreground" />}
                    onClick={() => router.push('/requisitions')}
                    cta="View Requisitions"
                />
                <StatCard
                    title="Pending Approvals"
                    value={stats.pendingApprovals.toString()}
                    description="Awaiting manager sign-off"
                    icon={<GanttChartSquare className="h-4 w-4 text-muted-foreground" />}
                     onClick={() => router.push('/approvals')}
                    cta="Review Approvals"
                />
                 <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Budget Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                        {stats.budget.spent.toLocaleString()} ETB
                        </div>
                        <p className="text-xs text-muted-foreground">
                         / {stats.budget.total.toLocaleString()} ETB total budget
                        </p>
                        <Progress value={budgetPercentage} className="mt-2" />
                    </CardContent>
                </Card>
                <StatCard
                    title="Pending Payments"
                    value={stats.pendingPayments.toString()}
                    description="Invoices approved for payment"
                    icon={<Banknote className="h-4 w-4 text-muted-foreground" />}
                    onClick={() => router.push('/invoices')}
                    cta="Process Payments"
                />
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-start">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Recent Requisitions</CardTitle>
                        <CardDescription>The 5 most recently created requisitions.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Requester</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentRequisitions.map(req => (
                                    <TableRow key={req.id} className="cursor-pointer" onClick={() => router.push(`/requisitions/${req.id}/edit`)}>
                                        <TableCell className="font-medium">{req.id}</TableCell>
                                        <TableCell>{req.title}</TableCell>
                                        <TableCell>{req.requesterName}</TableCell>
                                        <TableCell><Badge>{req.status}</Badge></TableCell>
                                        <TableCell>{format(new Date(req.createdAt), 'PP')}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                
                <Card>
                     <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="text-destructive"/>
                            Alerts & Actions
                        </CardTitle>
                        <CardDescription>Items needing immediate attention.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {alerts.budgetExceeded.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Budget Overruns</h4>
                                {alerts.budgetExceeded.map(req => (
                                    <Button key={req.id} variant="outline" size="sm" className="w-full justify-between h-auto py-2" onClick={() => router.push('/approvals')}>
                                        <div className="text-left">
                                            <p>{req.id}</p>
                                            <p className="text-xs text-muted-foreground">{req.title}</p>
                                        </div>
                                        <ArrowRight />
                                    </Button>
                                ))}
                            </div>
                        )}
                        {alerts.mismatchedInvoices.length > 0 && (
                             <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Mismatched Invoices</h4>
                                {alerts.mismatchedInvoices.map(inv => (
                                     <Button key={inv.id} variant="outline" size="sm" className="w-full justify-between h-auto py-2" onClick={() => router.push('/invoices')}>
                                        <div className="text-left">
                                            <p>{inv.id}</p>
                                            <p className="text-xs text-muted-foreground">PO: {inv.purchaseOrderId}</p>
                                        </div>
                                        <ArrowRight />
                                    </Button>
                                ))}
                            </div>
                        )}
                        {alerts.budgetExceeded.length === 0 && alerts.mismatchedInvoices.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-8">No urgent alerts.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export function Dashboard({ setActiveView }: DashboardProps) {
  const { role, user } = useAuth();
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();


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
      // Force a reload to refresh all data and states
      window.location.reload();
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


  const renderDashboard = () => {
    switch (role) {
      case 'Requester':
        return (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
             <Card className="col-span-full md:col-span-2">
              <CardHeader>
                <CardTitle>Start a New Procurement Request</CardTitle>
                <CardDescription>
                  Need something for your team? Start by creating a purchase
                  requisition.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button onClick={() => router.push('/new-requisition')}>
                  <FilePlus className="mr-2 h-4 w-4" /> Create New Requisition
                </Button>
              </CardFooter>
            </Card>
            <StatCard
              title="Your Requisitions"
              value="3"
              description="Your active and pending requests"
              icon={<FileText className="h-4 w-4 text-muted-foreground" />}
              onClick={() => router.push('requisitions')}
              cta="View History"
            />
          </div>
        );
      case 'Approver':
        return (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Pending Approvals"
              value="8"
              description="Requisitions awaiting your review"
              icon={
                <GanttChartSquare className="h-4 w-4 text-muted-foreground" />
              }
              cta="Review Now"
              onClick={() => router.push('approvals')}
            />
          </div>
        );
      case 'Procurement Officer':
        return <ProcurementOfficerDashboard setActiveView={setActiveView} />;
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

