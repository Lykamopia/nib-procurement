
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
import { PurchaseOrder } from '@/lib/types';
import { format } from 'date-fns';
import { Button } from './ui/button';
import Link from 'next/link';

export function PurchaseOrdersList() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

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
              {purchaseOrders.length > 0 ? (
                purchaseOrders.map((po) => (
                  <TableRow key={po.id}>
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
                  <TableCell colSpan={7} className="h-24 text-center">
                    No purchase orders found.
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

