
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
  const { user, role } = useAuth();


  useEffect(() => {
    const fetchRequisitions = async () => {
        try {
            setLoading(true);
            let response = await fetch('/api/requisitions');
            if (!response.ok) {
                throw new Error('Failed to fetch requisitions');
            }
            let data: PurchaseRequisition[] = await response.json();
            
            let relevantRequisitions = data;

            if (role === 'Procurement Officer') {
               relevantRequisitions = data.filter(r => 
                r.status === 'Approved' || r.status === 'RFQ_In_Progress' || r.status === 'PO_Created'
              );
            } else if (role === 'Committee Member' && user) {
                relevantRequisitions = data.filter(r => 
                    ((r.financialCommitteeMemberIds?.includes(user.id)) ||
                    (r.technicalCommitteeMemberIds?.includes(user.id))) &&
                    r.status === 'RFQ_In_Progress' && r.deadline && isPast(new Date(r.deadline))
                );
            } else {
              relevantRequisitions = [];
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
  }, [user, role]);
  
  const totalPages = Math.ceil(requisitions.length / PAGE_SIZE);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return requisitions.slice(startIndex, startIndex + PAGE_SIZE);
  }, [requisitions, currentPage]);


  const handleRowClick = (reqId: string) => {
    router.push(`/quotations/${reqId}`);
  }

  const getStatusVariant = (status: string) => {
    if (status === 'Approved') return 'default';
    if (status === 'RFQ_In_Progress') return 'secondary';
    if (status === 'PO_Created') return 'outline';
    return 'default';
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (error) return <div className="text-destructive">Error: {error}</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Requisitions Ready for Quotation</CardTitle>
        <CardDescription>
          Select a requisition to view existing quotes or add a new one.
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
                <TableHead>Date Approved</TableHead>
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
                    <TableCell>{format(new Date(req.updatedAt), 'PP')}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(req.status)}>{req.status.replace(/_/g, ' ')}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       <Button variant="outline" size="sm">
                          Manage Quotes <ArrowRight className="ml-2 h-4 w-4" />
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
                        <p className="text-muted-foreground">There are no requisitions currently assigned to you for quotation or scoring.</p>
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
            Page {currentPage} of {totalPages} ({requisitions.length} total requisitions)
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
