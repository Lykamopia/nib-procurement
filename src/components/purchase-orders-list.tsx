
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
import { PurchaseOrder } from '@/lib/types';
import { format } from 'date-fns';
import { Button } from './ui/button';
import Link from 'next/link';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';

const PAGE_SIZE = 10;

export function PurchaseOrdersList() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchPOs = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/purchase-orders');
        const data: PurchaseOrder[] = await response.json();
        setPurchaseOrders(data);
      } catch (error) {
        console.error("Failed to fetch purchase orders", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPOs();
  }, []);

  const totalPages = Math.ceil(purchaseOrders.length / PAGE_SIZE);
  const paginatedPOs = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return purchaseOrders.slice(startIndex, startIndex + PAGE_SIZE);
  }, [purchaseOrders, currentPage]);

  if (loading) {
    return <p>Loading purchase orders...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchase Orders</CardTitle>
        <CardDescription>
          View all issued purchase orders.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>PO Number</TableHead>
                <TableHead>Requisition</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPOs.length > 0 ? (
                paginatedPOs.map((po, index) => (
                  <TableRow key={po.id}>
                    <TableCell className="text-muted-foreground">{(currentPage - 1) * PAGE_SIZE + index + 1}</TableCell>
                    <TableCell className="font-medium text-primary">{po.id}</TableCell>
                    <TableCell>{po.requisitionTitle}</TableCell>
                    <TableCell>{po.vendor.name}</TableCell>
                    <TableCell>{format(new Date(po.createdAt), 'PP')}</TableCell>
                    <TableCell className="text-right">{po.totalAmount.toLocaleString()} ETB</TableCell>
                    <TableCell>
                      <Badge>{po.status}</Badge>
                    </TableCell>
                    <TableCell>
                        <Button variant="outline" size="sm" asChild>
                           <Link href={`/purchase-orders/${po.id}`}>View PO</Link>
                        </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    No purchase orders found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
         <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
             Page {currentPage} of {totalPages} ({purchaseOrders.length} total POs)
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
