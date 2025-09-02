
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
import { Button } from './ui/button';
import { PurchaseRequisition } from '@/lib/types';
import { format } from 'date-fns';
import { Badge } from './ui/badge';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';


export function RequisitionsForQuotingTable() {
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();


  useEffect(() => {
    const fetchRequisitions = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/requisitions');
            if (!response.ok) {
                throw new Error('Failed to fetch requisitions');
            }
            const data: PurchaseRequisition[] = await response.json();
            const availableForQuoting = data.filter(r => 
                r.status === 'Approved' || r.status === 'RFQ In Progress' || r.status === 'PO Created'
            );
            setRequisitions(availableForQuoting);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred');
        } finally {
            setLoading(false);
        }
    };
    fetchRequisitions();
  }, []);
  

  const handleRowClick = (reqId: string) => {
    router.push(`/quotations/${reqId}`);
  }

  const getStatusVariant = (status: string) => {
    if (status === 'Approved') return 'default';
    if (status === 'RFQ In Progress') return 'secondary';
    if (status === 'PO Created') return 'outline';
    return 'default';
  }

  if (loading) return <div>Loading requisitions...</div>;
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
                <TableHead>Req. ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Date Approved</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requisitions.length > 0 ? (
                requisitions.map(req => (
                  <TableRow key={req.id} className="cursor-pointer" onClick={() => handleRowClick(req.id)}>
                    <TableCell className="font-medium text-primary">{req.id}</TableCell>
                    <TableCell>{req.title}</TableCell>
                    <TableCell>{req.department}</TableCell>
                    <TableCell>{format(new Date(req.updatedAt), 'PP')}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(req.status)}>{req.status}</Badge>
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
                  <TableCell colSpan={6} className="h-24 text-center">
                    No requisitions are currently ready for quotation.
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
