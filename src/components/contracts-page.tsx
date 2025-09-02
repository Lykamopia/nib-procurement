
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
import { Badge } from './ui/badge';
import { PurchaseRequisition } from '@/lib/types';
import { format } from 'date-fns';
import { FileText, CircleCheck, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { Button } from './ui/button';

const PAGE_SIZE = 10;

export function ContractsPage() {
  const [contractedReqs, setContractedReqs] = useState<PurchaseRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  
  useEffect(() => {
    const fetchRequisitions = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/requisitions');
        const data: PurchaseRequisition[] = await response.json();
        // Filter for requisitions that have a contract
        const withContracts = data.filter(req => req.contract);
        setContractedReqs(withContracts);
      } catch (error) {
        console.error("Failed to fetch requisitions", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRequisitions();
  }, []);

  const totalPages = Math.ceil(contractedReqs.length / PAGE_SIZE);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return contractedReqs.slice(startIndex, startIndex + PAGE_SIZE);
  }, [contractedReqs, currentPage]);

  if (loading) {
    return <p>Loading contracts...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contract Management</CardTitle>
        <CardDescription>
          View all requisitions with finalized contracts.
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
                <TableHead>Contract</TableHead>
                <TableHead>Finalized At</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length > 0 ? (
                paginatedData.map((req, index) => (
                  <TableRow key={req.id}>
                    <TableCell className="text-muted-foreground">{(currentPage - 1) * PAGE_SIZE + index + 1}</TableCell>
                    <TableCell className="font-medium text-primary">{req.id}</TableCell>
                    <TableCell>{req.title}</TableCell>
                    <TableCell>{req.department}</TableCell>
                    <TableCell className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground"/> 
                        <span>{req.contract?.fileName}</span>
                    </TableCell>
                    <TableCell>
                      {req.contract?.uploadDate ? format(new Date(req.contract.uploadDate), 'PP') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge><CircleCheck className="mr-2 h-3 w-3"/>{req.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No contracts found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
         <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages} ({contractedReqs.length} total contracts)
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
