

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
import { Button } from './ui/button';
import { PurchaseRequisition, BudgetStatus } from '@/lib/types';
import { format } from 'date-fns';
import { Badge } from './ui/badge';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleAlert,
  CircleCheck,
  Empty,
  Eye,
  Inbox,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Checkbox } from './ui/checkbox';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';
import { RequisitionDetailsDialog } from './requisition-details-dialog';


const PAGE_SIZE = 10;

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

function CollapsibleTableRow({ req, onAction, onToggle, onShowDetails, index }: { req: PurchaseRequisition, onAction: (req: PurchaseRequisition, type: 'approve' | 'reject') => void, onToggle: () => void, onShowDetails: () => void, index: number }) {
    return (
        <>
            <TableRow>
                <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="font-medium text-primary">{req.id}</TableCell>
                <TableCell>{req.title}</TableCell>
                <TableCell>{req.requesterName}</TableCell>
                <TableCell>
                <BudgetStatusBadge status={req.budgetStatus}/>
                </TableCell>
                <TableCell>{format(new Date(req.createdAt), 'PP')}</TableCell>
                <TableCell>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={onShowDetails}>
                        <Eye className="mr-2 h-4 w-4" /> View Details
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onAction(req, 'approve')}>
                        <Check className="mr-2 h-4 w-4" /> Approve
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => onAction(req, 'reject')}>
                        <X className="mr-2 h-4 w-4" /> Reject
                    </Button>
                </div>
                </TableCell>
            </TableRow>
        </>
    )
}

export function ApprovalsTable() {
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRequisition, setSelectedRequisition] = useState<PurchaseRequisition | null>(null);
  const [comment, setComment] = useState('');
  const [isActionDialogOpen, setActionDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [overrideBudget, setOverrideBudget] = useState(false);
  const [openRequisitionId, setOpenRequisitionId] = useState<string | null>(null);


  const fetchRequisitions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/requisitions');
      if (!response.ok) {
        throw new Error('Failed to fetch requisitions');
      }
      const data: PurchaseRequisition[] = await response.json();
      const pending = data.filter(req => req.status === 'Pending Approval');
      setRequisitions(pending);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequisitions();
  }, []);

  const handleAction = (req: PurchaseRequisition, type: 'approve' | 'reject') => {
    setSelectedRequisition(req);
    setActionType(type);
    setActionDialogOpen(true);
    setOverrideBudget(false);
  }

  const handleShowDetails = (req: PurchaseRequisition) => {
    setSelectedRequisition(req);
    setDetailsDialogOpen(true);
  }
  
  const submitAction = async () => {
    if (!selectedRequisition || !actionType || !user) return;
    
    const newStatus = actionType === 'approve' ? 'Approved' : 'Rejected';

    try {
      const response = await fetch(`/api/requisitions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedRequisition.id, status: newStatus, userId: user.id, comment, overrideBudget }),
      });
      if (!response.ok) throw new Error(`Failed to ${actionType} requisition`);
      toast({
        title: "Success",
        description: `Requisition ${selectedRequisition.id} has been ${actionType === 'approve' ? 'approved' : 'rejected'}.`,
      });
      fetchRequisitions(); // Re-fetch data to update the table
    } catch (error) {
      toast({
        variant: 'destructive',
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
      });
    } finally {
        setActionDialogOpen(false);
        setComment('');
        setSelectedRequisition(null);
        setActionType(null);
    }
  }

  const totalPages = Math.ceil(requisitions.length / PAGE_SIZE);
  const paginatedRequisitions = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return requisitions.slice(startIndex, startIndex + PAGE_SIZE);
  }, [requisitions, currentPage]);


  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (error) return <div className="text-destructive">Error: {error}</div>;

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Pending Approvals</CardTitle>
        <CardDescription>
          Review and act on requisitions waiting for your approval.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Req. ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRequisitions.length > 0 ? (
                paginatedRequisitions.map((req, index) => (
                  <CollapsibleTableRow 
                    key={req.id} 
                    req={req}
                    index={(currentPage - 1) * PAGE_SIZE + index}
                    onAction={handleAction} 
                    onShowDetails={() => handleShowDetails(req)}
                    onToggle={() => setOpenRequisitionId(openRequisitionId === req.id ? null : req.id)}
                  />
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Inbox className="h-16 w-16 text-muted-foreground/50" />
                      <div className="space-y-1">
                        <p className="font-semibold">All caught up!</p>
                        <p className="text-muted-foreground">No requisitions are currently pending your approval.</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {Math.min(1 + (currentPage - 1) * PAGE_SIZE, requisitions.length)} to {Math.min(currentPage * PAGE_SIZE, requisitions.length)} of {requisitions.length} requisitions.
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
       <Dialog open={isActionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve' : 'Reject'} Requisition: {selectedRequisition?.id}
            </DialogTitle>
            <DialogDescription>
                You are about to {actionType} this requisition. Please provide a comment for this action.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="comment">Comment</Label>
              <Textarea 
                id="comment" 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Type your comment here..."
              />
            </div>
            {selectedRequisition?.budgetStatus === 'Exceeded' && actionType === 'approve' && (
                <div className="flex items-center space-x-2 rounded-md border border-destructive/50 bg-destructive/10 p-4">
                    <Checkbox id="override" checked={overrideBudget} onCheckedChange={(checked) => setOverrideBudget(!!checked)} />
                    <Label htmlFor="override" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Override budget warning
                    </Label>
                </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setActionDialogOpen(false)}>Cancel</Button>
            <Button 
                onClick={submitAction} 
                variant={actionType === 'approve' ? 'default' : 'destructive'}
                disabled={actionType === 'approve' && selectedRequisition?.budgetStatus === 'Exceeded' && !overrideBudget}
            >
                Submit {actionType === 'approve' ? 'Approval' : 'Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
    {selectedRequisition && (
        <RequisitionDetailsDialog 
            reuisition={selectedRequisition} 
            isOpen={isDetailsDialogOpen} 
            onClose={() => setDetailsDialogOpen(false)} 
        />
    )}
    </>
  );
}
