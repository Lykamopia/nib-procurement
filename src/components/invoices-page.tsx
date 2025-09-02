
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
  CardFooter,
} from './ui/card';
import { Button } from './ui/button';
import { Invoice, InvoiceStatus, PurchaseOrder, Vendor } from '@/lib/types';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from './ui/dialog';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, ThumbsUp, ThumbsDown, FileUp, FileText, Banknote, CheckCircle, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { useAuth } from '@/contexts/auth-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';


const invoiceSchema = z.object({
  purchaseOrderId: z.string().min(1, "Purchase Order is required."),
  invoiceDate: z.string().min(1, "Invoice date is required."),
  documentUrl: z.string().optional(),
  items: z.array(z.object({
    name: z.string(),
    quantity: z.coerce.number(),
    unitPrice: z.coerce.number(),
    totalPrice: z.coerce.number(),
  })),
});

const PAGE_SIZE = 10;

function AddInvoiceForm({ onInvoiceAdded }: { onInvoiceAdded: () => void }) {
    const [isSubmitting, setSubmitting] = useState(false);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const { user } = useAuth();
    const { toast } = useToast();

    const form = useForm<z.infer<typeof invoiceSchema>>({
        resolver: zodResolver(invoiceSchema),
        defaultValues: {
            purchaseOrderId: "",
            invoiceDate: new Date().toISOString().split('T')[0],
            items: [],
            documentUrl: "",
        },
    });
    
    useEffect(() => {
        const fetchData = async () => {
            const poResponse = await fetch('/api/purchase-orders');
            const poData = await poResponse.json();
            setPurchaseOrders(poData.filter((po: PurchaseOrder) => po.status !== 'Cancelled'));
            
            const vendorResponse = await fetch('/api/vendors');
            const vendorData = await vendorResponse.json();
            setVendors(vendorData);
        };
        fetchData();
    }, []);
    
    const { fields, replace } = useFieldArray({
        control: form.control,
        name: "items"
    });

    const handlePOChange = (poId: string) => {
        form.setValue('purchaseOrderId', poId);
        const po = purchaseOrders.find(p => p.id === poId);
        if (po) {
            const invoiceItems = po.items.map(item => ({
                name: item.name,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
            }));
            replace(invoiceItems);
        } else {
            replace([]);
        }
    }
    
    const totalAmount = form.watch('items').reduce((acc, item) => acc + item.totalPrice, 0);

    const onSubmit = async (values: z.infer<typeof invoiceSchema>) => {
        if (!user) return;
        
        const selectedPO = purchaseOrders.find(p => p.id === values.purchaseOrderId);
        if (!selectedPO) return;
        
        setSubmitting(true);
        try {
            const response = await fetch('/api/invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    ...values, 
                    userId: user.id, 
                    vendorId: selectedPO.vendor.id,
                    totalAmount
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to add invoice.');
            }

            toast({
                title: 'Success!',
                description: 'New invoice has been created and is pending review.',
            });
            onInvoiceAdded();
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error instanceof Error ? error.message : 'An unknown error occurred.',
            });
        } finally {
            setSubmitting(false);
        }
    };
    
    return (
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>Add New Invoice</DialogTitle>
                <DialogDescription>
                    Enter the details from the vendor invoice.
                </DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                         <FormField
                            control={form.control}
                            name="purchaseOrderId"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Purchase Order</FormLabel>
                                <Select onValueChange={handlePOChange} value={field.value}>
                                    <FormControl>
                                    <SelectTrigger><SelectValue placeholder="Select a PO" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {purchaseOrders.map(po => <SelectItem key={po.id} value={po.id}>{po.id} - {po.requisitionTitle}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="invoiceDate"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Invoice Date</FormLabel>
                                <FormControl><Input type="date" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                     <FormField
                        control={form.control}
                        name="documentUrl"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Invoice Document</FormLabel>
                                <FormControl>
                                    <div className="flex items-center gap-2">
                                        <Input id="invoice-file" type="file" className="hidden" />
                                        <label htmlFor="invoice-file" className={cn("flex-1", field.value && "hidden")}>
                                            <Button asChild variant="outline" className="w-full">
                                                <div><FileUp className="mr-2"/> Upload PDF</div>
                                            </Button>
                                        </label>
                                        {field.value && <p className="text-sm text-muted-foreground">{field.value}</p>}
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    
                    <h4 className="text-lg font-semibold pt-4">Invoice Items</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-2">
                         {fields.map((field, index) => (
                            <div key={field.id} className="grid grid-cols-4 gap-2 items-center">
                                <p className="col-span-2">{field.name}</p>
                                <p>x {field.quantity}</p>
                                <p className="text-right">{field.totalPrice.toFixed(2)} ETB</p>
                            </div>
                        ))}
                    </div>
                    <div className="text-right font-bold text-xl">Total: {totalAmount.toFixed(2)} ETB</div>
                    
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit Invoice
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    );
}


export function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setFormOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const { user } = useAuth();


  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/invoices');
      if (!response.ok) throw new Error('Failed to fetch invoices');
      const data = await response.json();
      setInvoices(data);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not fetch invoices.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);
  
  const totalPages = Math.ceil(invoices.length / PAGE_SIZE);
  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return invoices.slice(startIndex, startIndex + PAGE_SIZE);
  }, [invoices, currentPage]);

  const handleInvoiceAdded = () => {
    setFormOpen(false);
    fetchInvoices();
  }
  
  const handleAction = async (invoiceId: string, status: 'Approved for Payment' | 'Disputed') => {
      if (!user) return;
      try {
          const response = await fetch(`/api/invoices/${invoiceId}/status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status, userId: user.id })
          });
          if (!response.ok) throw new Error(`Failed to mark invoice as ${status}.`);
          toast({ title: "Success", description: `Invoice has been marked as ${status}.`});
          fetchInvoices();
      } catch (error) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: error instanceof Error ? error.message : 'An unknown error occurred.',
        });
      }
  }

  const handlePayment = async (invoiceId: string) => {
    if (!user) return;
     try {
        const response = await fetch(`/api/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invoiceId, userId: user.id })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to process payment.');
        }
        toast({ title: "Payment Processed", description: `Invoice ${invoiceId} has been paid.`});
        fetchInvoices();
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: error instanceof Error ? error.message : 'An unknown error occurred.',
        });
    }
  }

  const getStatusVariant = (status: InvoiceStatus) => {
    switch (status) {
      case 'Paid': return 'default';
      case 'Pending': return 'secondary';
      case 'Approved for Payment': return 'secondary';
      case 'Disputed': return 'destructive';
      default: return 'outline';
    }
  };


  if (loading) {
    return <p>Loading invoices...</p>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>
            Manage and process vendor invoices.
          </CardDescription>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Invoice
            </Button>
          </DialogTrigger>
          <AddInvoiceForm onInvoiceAdded={handleInvoiceAdded} />
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Invoice ID</TableHead>
                <TableHead>PO Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedInvoices.length > 0 ? (
                paginatedInvoices.map((invoice, index) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="text-muted-foreground">{(currentPage - 1) * PAGE_SIZE + index + 1}</TableCell>
                    <TableCell className="font-medium text-primary">{invoice.id}</TableCell>
                    <TableCell>{invoice.purchaseOrderId}</TableCell>
                    <TableCell>{format(new Date(invoice.invoiceDate), 'PP')}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={getStatusVariant(invoice.status)}>{invoice.status}</Badge>
                         {invoice.status === 'Paid' && invoice.paymentReference && (
                           <span className="text-xs text-muted-foreground">{invoice.paymentReference}</span>
                         )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{invoice.totalAmount.toLocaleString()} ETB</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {invoice.status === 'Pending' && (
                            <>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleAction(invoice.id, 'Approved for Payment')}
                                >
                                <ThumbsUp className="mr-2 h-4 w-4" /> Approve
                                </Button>
                                <Button 
                                    variant="destructive" 
                                    size="sm"
                                    onClick={() => handleAction(invoice.id, 'Disputed')}
                                >
                                <ThumbsDown className="mr-2 h-4 w-4" /> Dispute
                                </Button>
                            </>
                        )}
                        {invoice.status === 'Approved for Payment' && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button size="sm">
                                        <Banknote className="mr-2 h-4 w-4" /> Pay Invoice
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will simulate a payment for {invoice.totalAmount.toLocaleString()} ETB for invoice {invoice.id}. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handlePayment(invoice.id)}>
                                            Confirm Payment
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                         {invoice.status === 'Paid' && (
                             <div className="flex items-center text-sm text-green-600">
                                 <CheckCircle className="mr-2 h-4 w-4"/> Paid on {format(new Date(invoice.paymentDate!), 'PP')}
                             </div>
                         )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No invoices found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
         <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
             Page {currentPage} of {totalPages} ({invoices.length} total invoices)
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
