
'use client';

import React, { useState, useEffect } from 'react';
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
import { FileText, CircleCheck } from 'lucide-react';

export function ContractsPage() {
  const [contractedReqs, setContractedReqs] = useState<PurchaseRequisition[]>([]);
  const [loading, setLoading] = useState(true);

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
                <TableHead>Req. ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Contract</TableHead>
                <TableHead>Finalized At</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contractedReqs.length > 0 ? (
                contractedReqs.map((req) => (
                  <TableRow key={req.id}>
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
                  <TableCell colSpan={6} className="h-24 text-center">
                    No contracts found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
