

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
import { PurchaseRequisition } from '@/lib/types';
import { format, isPast } from 'date-fns';
import { Badge } from './ui/badge';
import { useRouter } from 'next/navigation';
import { ArrowRight, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, FileX2, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

const PAGE_SIZE = 10;

export function RequisitionsForQuotingTable() {
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();
  const { user, allUsers, role } = useAuth();


  useEffect(() => {
    const fetchRequisitions = async () => {
        if (!user) return;
        try {
            setLoading(true);
            
            // Fetch all requisitions that have passed the initial draft/pending approval stages.
            const allStatusesResponse = await fetch(`/api/requisitions`);
            if (!allStatusesResponse.ok) {
                throw new Error('Failed to fetch requisitions');
            }
            let allRequisitions: PurchaseRequisition[] = await allStatusesResponse.json();

            let relevantRequisitions: PurchaseRequisition[] = [];

            if (role === 'Committee Member') {
                const assignedReqs = allUsers.find(u => u.id === user.id)?.committeeAssignments?.map(a => a.requisitionId) || [];
                relevantRequisitions = allRequisitions.filter(r => assignedReqs.includes(r.id));
            } else if (role === 'Procurement Officer' || role === 'Committee') {
                // Show all requisitions that are approved or beyond.
                const excludedStatuses = ['Draft', 'Pending Approval', 'Rejected'];
                relevantRequisitions = allRequisitions.filter(r => !excludedStatuses.includes(r.status));
            }

            setRequisitions(relevantRequisitions);

        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred');
        } finally {
            setLoading(false);
        }
    };
    if (user) {
        fetchRequisitions();
    }
  }, [user, role, allUsers]);
  
  const totalPages = Math.ceil(requisitions.length / PAGE_SIZE);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return requisitions.slice(startIndex, startIndex + PAGE_SIZE);
  }, [requisitions, currentPage]);


  const handleRowClick = (reqId: string) => {
    router.push(`/quotations/${reqId}`);
  }

  const getStatusBadge = (req: PurchaseRequisition) => {
    const deadlinePassed = req.deadline ? isPast(new Date(req.deadline)) : false;
    const isAwarded = req.quotations?.some(q => q.status === 'Awarded');
    const isAccepted = req.quotations?.some(q => q.status === 'Accepted' || q.status === 'Partially_Awarded');
    const isPartiallyAwarded = req.quotations?.some(q => q.status === 'Partially_Awarded');
    
    // Convert status from underscore to space for easier matching
    const status = req.status.replace(/_/g, ' ');

    if (status.startsWith('Pending')) {
        return <Badge variant="destructive">{status}</Badge>;
    }
    if (isAccepted || status === 'PO Created') {
        return <Badge variant="default">PO Created</Badge>;
    }
     if (isAwarded || isPartiallyAwarded) {
        return <Badge variant="secondary">Vendor Awarded</Badge>;
    }
    if (status === 'RFQ In Progress' && !deadlinePassed) {
        return <Badge variant="outline">Accepting Quotes</Badge>;
    }
     if (status === 'RFQ In Progress' && deadlinePassed) {
        return <Badge variant="secondary">Scoring in Progress</Badge>;
    }
    if (status === 'Approved') {
        return <Badge variant="default" className="bg-blue-500 hover:bg-blue-600 text-white">Ready for RFQ</Badge>;
    }
    
    return <Badge variant="outline">{status}</Badge>;
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (error) return <div className="text-destructive">Error: {error}</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quotation Management</CardTitle>
        <CardDescription>
          {role === 'Committee Member' 
            ? 'Requisitions assigned to you for scoring.'
            : 'Manage the entire quotation lifecycle, from sending RFQs to finalizing awards.'
          }
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
                <TableHead>Department</TableHead>
                <TableHead>Quote Deadline</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length > 0 ? (
                paginatedData.map((req, index) => (
                  <TableRow key={req.id} className="cursor-pointer" onClick={() => handleRowClick(req.id)}>
                    <TableCell className="text-muted-foreground">{(currentPage - 1) * PAGE_SIZE + index + 1}</TableCell>
                    <TableCell className="font-medium text-primary">{req.id}</TableCell>
                    <TableCell>{req.title}</TableCell>
                    <TableCell>{req.department}</TableCell>
                    <TableCell>
                        {req.deadline ? format(new Date(req.deadline), 'PP') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(req)}
                    </TableCell>
                    <TableCell className="text-right">
                       <Button variant="outline" size="sm">
                          {role === 'Committee Member' ? 'View & Score' : 'Manage'} <ArrowRight className="ml-2 h-4 w-4" />
                       </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <FileX2 className="h-16 w-16 text-muted-foreground/50" />
                      <div className="space-y-1">
                        <p className="font-semibold">No Requisitions Found</p>
                        <p className="text-muted-foreground">
                            {role === 'Committee Member'
                                ? 'There are no requisitions currently assigned to you for scoring.'
                                : 'There are no requisitions currently in the RFQ process.'
                            }
                        </p>
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
            Page {currentPage} of {totalPages || 1} ({requisitions.length} total requisitions)
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}><ChevronsLeft /></Button>
            <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft /></Button>
            <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight /></Button>
            <Button variant="outline" size="icon" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}><ChevronsRight /></Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
