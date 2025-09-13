
'use client';

import { PurchaseOrder } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Separator } from './ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { format } from 'date-fns';
import { Icons } from './icons';
import { Button } from './ui/button';
import { Printer, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

export function PurchaseOrderDocument({ po }: { po: PurchaseOrder }) {
    const handlePrint = () => {
        window.print();
    };
  return (
    <>
      <div className="flex items-center justify-between mb-4 print:hidden">
          <h1 className="text-2xl font-bold">Purchase Order: {po.id}</h1>
          <Button onClick={handlePrint} variant="outline">
              <Printer className="mr-2 h-4 w-4" /> Print PO
          </Button>
      </div>
      {po.status === 'On Hold' && (
        <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>This Purchase Order is On Hold</AlertTitle>
            <AlertDescription>
                No further actions (e.g., receiving goods, processing invoices) can be taken until the hold is lifted.
            </AlertDescription>
        </Alert>
      )}
      <Card className="p-4 sm:p-6 md:p-8">
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <Icons.logo className="size-10 text-primary" />
            <h2 className="text-2xl font-bold">Nib Procurement Inc.</h2>
            <p className="text-muted-foreground">123 Procurement Lane, Suite 456, BizTown, BT 54321</p>
          </div>
          <div className="text-right">
            <h1 className="text-4xl font-bold tracking-tight uppercase text-primary">Purchase Order</h1>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-sm">
                <span className="font-semibold text-muted-foreground">PO Number:</span>
                <span>{po.id}</span>
                <span className="font-semibold text-muted-foreground">Date:</span>
                <span>{format(new Date(po.createdAt), 'PP')}</span>
                 <span className="font-semibold text-muted-foreground">Requisition ID:</span>
                <span>{po.requisitionId}</span>
                <span className="font-semibold text-muted-foreground">Status:</span>
                <span className="font-bold">{po.status}</span>
            </div>
          </div>
        </CardHeader>
        <Separator className="my-8" />
        <CardContent>
          <div className="grid md:grid-cols-2 gap-8">
              <div>
                  <h3 className="font-semibold text-muted-foreground mb-2">VENDOR</h3>
                  <div className="not-italic text-card-foreground">
                      <p className="font-bold text-lg">{po.vendor.name}</p>
                      <p>{po.vendor.address}</p>
                      <p>Attn: {po.vendor.contactPerson}</p>
                      <p>{po.vendor.email} | {po.vendor.phone}</p>
                  </div>
              </div>
              <div>
                  <h3 className="font-semibold text-muted-foreground mb-2">SHIP TO</h3>
                   <div className="not-italic text-card-foreground">
                      <p className="font-bold text-lg">Nib Procurement Inc.</p>
                      <p>Receiving Department</p>
                      <p>123 Procurement Lane</p>
                      <p>BizTown, BT 54321</p>
                  </div>
              </div>
          </div>
        
          <div className="mt-8">
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead className="w-1/2">Item Description</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Total Price</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {po.items.map(item => (
                          <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.name}</TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right">{item.unitPrice.toFixed(2)} ETB</TableCell>
                              <TableCell className="text-right">{item.totalPrice.toFixed(2)} ETB</TableCell>
                          </TableRow>
                      ))}
                  </TableBody>
              </Table>
          </div>
          
           <div className="flex justify-end mt-4">
              <div className="w-full max-w-xs space-y-2">
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{po.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB</span>
                </div>
              </div>
            </div>

            {po.notes && (
                <div className="mt-8">
                    <h3 className="font-semibold text-muted-foreground mb-2">NOTES</h3>
                    <p className="text-sm text-card-foreground p-4 border rounded-md bg-muted/50 whitespace-pre-wrap">{po.notes}</p>
                </div>
            )}
        </CardContent>
        <Separator className="my-8" />
        <CardFooter className="flex justify-between items-end">
            <p className="text-xs text-muted-foreground max-w-md">
                This Purchase Order is subject to the terms and conditions agreed upon in the contract dated {po.contract ? format(new Date(po.contract.uploadDate), 'PP') : 'N/A'}. 
                Please contact our procurement department with any questions.
            </p>
            <div className="text-right">
                <p className="font-semibold">Authorized By: Charlie</p>
                <p className="text-sm text-muted-foreground">Procurement Officer</p>
            </div>
        </CardFooter>
      </Card>
    </>
  );
}

    