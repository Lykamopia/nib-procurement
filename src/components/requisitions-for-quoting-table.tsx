
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
  const { user, allUsers, role, token } = useAuth();


  useEffect(() => {
    const fetchRequisitions = async () => {
        if (!user || !token) return;
        try {
            setLoading(true);
            const response = await fetch(`/api/requisitions?forQuoting=true`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch requisitions');
            }
            const data: PurchaseRequisition[] = await response.json();
            setRequisitions(data);

        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred');
        } finally {
            setLoading(false);
        }
    };
    if (user) {
        fetchRequisitions();
    }
  }, [user, role, allUsers, token]);
  
  const totalPages = Math.ceil(requisitions.length / PAGE_SIZE);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return requisitions.slice(startIndex, startIndex + PAGE_SIZE);
  }, [requisitions, currentPage]);


  const handleRowClick = (reqId: string) => {
    router.push(`/quotations/${reqId}`);
  }

  const getStatusBadge = (req: PurchaseRequisition) => {
    if (req.status === 'Approved') {
        return <Badge variant="default" className="bg-blue-500 text-white">Ready for RFQ</Badge>;
    }
    
    if (req.status === 'RFQ In Progress') {
        const deadlinePassed = req.deadline ? isPast(new Date(req.deadline)) : false;
        if (!deadlinePassed) {
            return <Badge variant="outline">Accepting Quotes</Badge>;
        }

        const hasCommittee = (req.financialCommitteeMemberIds?.length || 0) > 0 || (req.technicalCommitteeMemberIds?.length || 0) > 0;
        if (!hasCommittee) {
            return <Badge variant="destructive">Ready for Committee Assignment</Badge>;
        }
        
        const assignedMemberIds = new Set([...(req.financialCommitteeMemberIds || []), ...(req.technicalCommitteeMemberIds || [])]);
        const submittedMemberIds = new Set(req.committeeAssignments?.filter(a => a.scoresSubmitted).map(a => a.userId));
        const allHaveScored = assignedMemberIds.size > 0 && [...assignedMemberIds].every(id => submittedMemberIds.has(id));

        if (allHaveScored) {
             return <Badge variant="default" className="bg-green-600">Ready to Award</Badge>;
        }

        return <Badge variant="secondary">Scoring in Progress</Badge>;
    }
    
    // For pending review statuses
    if (req.status.startsWith('Pending ')) {
        return <Badge variant="outline" className="border-amber-500 text-amber-600">{req.status}</Badge>;
    }
    
    return <Badge variant="outline">{req.status}</Badge>;
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (error) return <div className="text-destructive">Error: {error}</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Requisitions in Quotation</CardTitle>
        <CardDescription>
          {role === 'Committee_Member' 
            ? 'Requisitions assigned to you for scoring.'
            : 'Manage requisitions that are ready for the RFQ process, are in scoring, or have been awarded.'
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
                      {getStatusBadge(req)}
                    </TableCell>
                    <TableCell className="text-right">
                       <Button variant="outline" size="sm">
                          {role === 'Committee_Member' ? 'View & Score' : 'Manage'} <ArrowRight className="ml-2 h-4 w-4" />
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
                            {role === 'Committee_Member'
                                ? 'There are no requisitions currently assigned to you for scoring.'
                                : 'There are no requisitions assigned to you in the RFQ process.'
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
