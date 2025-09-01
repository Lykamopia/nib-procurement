
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from './ui/card';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Button } from './ui/button';
import { PurchaseRequisition, RequisitionStatus, BudgetStatus } from '@/lib/types';
import { format } from 'date-fns';
import { Badge } from './ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Send,
  CircleAlert,
  CircleCheck,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';


const PAGE_SIZE = 10;

export function RequisitionsTable() {
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequisitionStatus | 'all'>('all');
  const [requesterFilter, setRequesterFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchRequisitions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/requisitions');
      if (!response.ok) {
        throw new Error('Failed to fetch requisitions');
      }
      const data = await response.json();
      setRequisitions(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequisitions();
  }, []);
  
  const handleSubmitForApproval = async (id: string) => {
    try {
      const response = await fetch(`/api/requisitions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Pending Approval', userId: user?.id }),
      });
      if (!response.ok) throw new Error('Failed to submit for approval');
      toast({
        title: "Success",
        description: `Requisition ${id} submitted for approval.`,
      });
      fetchRequisitions(); // Re-fetch data to update the table
    } catch (error) {
      toast({
        variant: 'destructive',
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
      });
    }
  };

  const uniqueRequesters = useMemo(() => {
    const requesters = new Set(requisitions.map(r => r.requesterName).filter(Boolean));
    return ['all', ...Array.from(requesters as string[])];
  }, [requisitions]);

  const filteredRequisitions = useMemo(() => {
    return requisitions
      .filter(req => {
        const lowerCaseSearch = searchTerm.toLowerCase();
        return (
          req.title.toLowerCase().includes(lowerCaseSearch) ||
          req.id.toLowerCase().includes(lowerCaseSearch) ||
          (req.requesterName && req.requesterName.toLowerCase().includes(lowerCaseSearch))
        );
      })
      .filter(req => statusFilter === 'all' || req.status === statusFilter)
      .filter(req => requesterFilter === 'all' || req.requesterName === requesterFilter)
      .filter(req => !dateFilter || new Date(req.createdAt).toDateString() === dateFilter.toDateString());
  }, [requisitions, searchTerm, statusFilter, requesterFilter, dateFilter]);

  const totalPages = Math.ceil(filteredRequisitions.length / PAGE_SIZE);
  const paginatedRequisitions = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredRequisitions.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredRequisitions, currentPage]);


  const getStatusVariant = (status: RequisitionStatus) => {
    switch (status) {
      case 'Approved':
        return 'default';
      case 'Pending Approval':
        return 'secondary';
      case 'Rejected':
        return 'destructive';
      case 'Draft':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const BudgetStatusBadge = ({ status }: { status: BudgetStatus }) => {
    switch(status) {
      case 'OK':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <CircleCheck className="h-5 w-5 text-green-500" />
              </TooltipTrigger>
              <TooltipContent>Budget OK</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      case 'Exceeded':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <CircleAlert className="h-5 w-5 text-destructive" />
              </TooltipTrigger>
              <TooltipContent>Budget Exceeded</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      default:
        return null;
    }
  }

  if (loading) return <div>Loading requisitions...</div>;
  if (error) return <div className="text-destructive">Error: {error}</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Requisitions</CardTitle>
        <CardDescription>
          Browse and manage all purchase requisitions across the organization.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, ID, or requester..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={value => setStatusFilter(value as any)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Pending Approval">Pending Approval</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
              <SelectItem value="PO Created">PO Created</SelectItem>
            </SelectContent>
          </Select>
          <Select value={requesterFilter} onValueChange={setRequesterFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by requester" />
            </SelectTrigger>
            <SelectContent>
              {uniqueRequesters.map(r => <SelectItem key={r} value={r}>{r === 'all' ? 'All Requesters' : r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto justify-start text-left font-normal">
                {dateFilter ? format(dateFilter, 'PPP') : <span>Filter by date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dateFilter}
                onSelect={setDateFilter}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" onClick={() => { setSearchTerm(''); setStatusFilter('all'); setRequesterFilter('all'); setDateFilter(undefined); setCurrentPage(1); }}>
            Clear
          </Button>
        </div>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Req. ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total Price</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRequisitions.length > 0 ? (
                paginatedRequisitions.map(req => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium text-primary">{req.id}</TableCell>
                    <TableCell>{req.title}</TableCell>
                    <TableCell>{req.requesterName}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(req.status)}>{req.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">${req.totalPrice.toLocaleString()}</TableCell>
                    <TableCell>{format(new Date(req.createdAt), 'PP')}</TableCell>
                    <TableCell>
                      <BudgetStatusBadge status={req.budgetStatus}/>
                    </TableCell>
                    <TableCell>
                      {req.status === 'Draft' && (
                        <Button variant="outline" size="sm" onClick={() => handleSubmitForApproval(req.id)}>
                          <Send className="mr-2 h-4 w-4" />
                          Submit for Approval
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    No results found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {Math.min(1 + (currentPage - 1) * PAGE_SIZE, filteredRequisitions.length)} to {Math.min(currentPage * PAGE_SIZE, filteredRequisitions.length)} of {filteredRequisitions.length} requisitions.
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(p => p - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
