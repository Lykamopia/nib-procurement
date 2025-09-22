
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
import { Invoice, InvoiceStatus, PurchaseOrder, MatchingResult, MatchingStatus } from '@/lib/types';
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
import { Loader2, PlusCircle, ThumbsUp, ThumbsDown, FileUp, FileText, Banknote, CheckCircle, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, CheckCircle2, AlertTriangle, Clock, List } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { useAuth } from '@/contexts/auth-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';


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

const MatchDetailRow = ({ label, value, isMismatch = false }: { label: string, value: React.ReactNode, isMismatch?: boolean}) => (
    <div className={cn("flex justify-between py-1", isMismatch && "text-destructive font-bold")}>
        <span className="text-muted-foreground">{label}</span>
        <span>{value}</span>
    </div>
)

function MatchDetailsDialog({ result, onResolve, onCancel }: { result: MatchingResult, onResolve: () => void, onCancel: () => void }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isResolving, setResolving] = useState(false);

    const handleResolve = async () => {
        if (!user) return;
        setResolving(true);
        try {
            const response = await fetch('/api/matching', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ poId: result.poId, userId: user.id })
            });
            if (!response.ok) throw new Error("Failed to resolve mismatch.");
            toast({ title: "Mismatch Resolved", description: `PO ${result.poId} has been manually marked as matched.` });
            onResolve();
        } catch (error) {
             toast({
                variant: 'destructive',
                title: 'Error',
                description: error instanceof Error ? error.message : 'An unknown error occurred.',
            });
        } finally {
            setResolving(false);
            onCancel();
        }
    }
    
  return (
     <DialogContent className="max-w-4xl">
        <DialogHeader>
            <DialogTitle>Matching Details for PO: {result.poId}</DialogTitle>
        </DialogHeader>
        <div className="py-4 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
            <CardHeader><CardTitle className="text-base">Totals</CardTitle></CardHeader>
            <CardContent className="text-sm">
                <MatchDetailRow label="PO Total" value={`${result.details.poTotal?.toFixed(2) ?? 'N/A'} ETB`} />
                <MatchDetailRow label="Invoice Total" value={`${result.details.invoiceTotal?.toFixed(2) ?? 'N/A'} ETB`} isMismatch={result.details.poTotal !== result.details.invoiceTotal}/>
                <MatchDetailRow label="PO Quantity" value={result.details.items?.reduce((acc, i) => acc + i.poQuantity, 0) ?? 'N/A'} />
                <MatchDetailRow label="GRN Quantity" value={result.details.grnTotalQuantity ?? 'N/A'} isMismatch={result.details.items?.reduce((acc, i) => acc + i.poQuantity, 0) !== result.details.grnTotalQuantity} />
                <MatchDetailRow label="Invoice Quantity" value={result.details.invoiceTotalQuantity ?? 'N/A'} isMismatch={result.details.items?.reduce((acc, i) => acc + i.poQuantity, 0) !== result.details.invoiceTotalQuantity} />
            </CardContent>
            </Card>
            <Card className="md:col-span-2">
                <CardHeader><CardTitle className="text-base">Item Breakdown</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead>PO Qty</TableHead>
                                <TableHead>GRN Qty</TableHead>
                                <TableHead>Inv Qty</TableHead>
                                <TableHead>PO Price</TableHead>
                                <TableHead>Inv Price</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {result.details.items?.map(item => (
                                <TableRow key={item.itemId}>
                                    <TableCell>{item.itemName}</TableCell>
                                    <TableCell>{item.poQuantity}</TableCell>
                                    <TableCell className={cn(!item.quantityMatch && "text-destructive font-bold")}>{item.grnQuantity}</TableCell>
                                    <TableCell className={cn(!item.quantityMatch && "text-destructive font-bold")}>{item.invoiceQuantity}</TableCell>
                                    <TableCell>{item.poUnitPrice.toFixed(2)} ETB</TableCell>
                                    <TableCell className={cn(!item.priceMatch && "text-destructive font-bold")}>{item.invoiceUnitPrice.toFixed(2)} ETB</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
        {result.status === 'Mismatched' && (
            <DialogFooter>
                <Button onClick={onCancel} variant="ghost">Close</Button>
                <Button onClick={handleResolve} disabled={isResolving}>
                    {isResolving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Manually Resolve Mismatch
                </Button>
            </DialogFooter>
      )}
    </DialogContent>
  );
}

const MatchStatus = ({ po, grn, invoice }: { po: boolean, grn: boolean, invoice: boolean }) => {
  const StatusItem = ({ complete, label }: { complete: boolean, label: string }) => (
    <div className={cn("flex items-center gap-2", complete ? "text-green-600" : "text-amber-600")}>
      {complete ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
      <span className="font-medium">{label}:</span>
      <span>{complete ? "Submitted" : "Waiting"}</span>
    </div>
  );

  return (
    <div className="p-2 space-y-2">
        <h4 className="font-semibold text-foreground flex items-center gap-2"><List className="h-4 w-4"/>Match Status</h4>
        <StatusItem complete={po} label="Purchase Order" />
        <StatusItem complete={grn} label="Goods Receipt" />
        <StatusItem complete={invoice} label="Invoice" />
    </div>
  );
};

const MatchingStatusBadge = ({ result, onRefresh }: { result: MatchingResult | 'loading' | null, onRefresh: () => void }) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    if (result === 'loading' || !result) {
        return <Badge variant="outline"><Loader2 className="mr-2 h-3 w-3 animate-spin"/>Checking</Badge>;
    }
    
    if (result.status === 'Pending') {
        const poExists = result.details.poTotal > 0;
        const grnExists = result.details.grnTotalQuantity > 0;
        const invExists = result.details.invoiceTotal > 0;
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>
                        <Badge variant="secondary"><Clock className="mr-2 h-3 w-3" />Pending</Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                        <MatchStatus po={poExists} grn={grnExists} invoice={invExists} />
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }
    
    const isClickable = result.status === 'Mismatched' || result.status === 'Matched';
    
    const BadgeComponent = (
        <Badge 
            variant={result.status === 'Matched' ? 'default' : 'destructive'}
            className={cn(isClickable && "cursor-pointer")}
        >
            {result.status === 'Matched' && <CheckCircle2 className="mr-2 h-3 w-3" />}
            {result.status === 'Mismatched' && <AlertTriangle className="mr-2 h-3 w-3" />}
            {result.status}
        </Badge>
    );

    return isClickable ? (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                {BadgeComponent}
            </DialogTrigger>
            {result && (
                <MatchDetailsDialog
                    result={result}
                    onResolve={() => {
                        setIsDialogOpen(false);
                        onRefresh();
                    }}
                    onCancel={() => setIsDialogOpen(false)}
                />
            )}
        </Dialog>
    ) : BadgeComponent;
}

export function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [matchResults, setMatchResults] = useState<Record<string, MatchingResult | 'loading' | null>>({});
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setFormOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const { toast } = useToast();
  const { user } = useAuth();

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const invResponse = await fetch('/api/invoices');
      if (!invResponse.ok) throw new Error('Failed to fetch invoices');
      const invData: Invoice[] = await invResponse.json();
      setInvoices(invData);
      
      setMatchResults(prev => {
        const newResults = {...prev};
        invData.forEach(inv => {
            if (!newResults[inv.id]) {
                newResults[inv.id] = 'loading';
            }
        });
        return newResults;
      });

      const matchPromises = invData.map(inv =>
        fetch(`/api/matching?invoiceId=${inv.id}`)
          .then(res => res.ok ? res.json() : null)
          .then(data => ({ id: inv.id, data }))
      );

      const results = await Promise.all(matchPromises);
      setMatchResults(prev => {
        const newResults = {...prev};
        results.forEach(res => {
          if (res) {
            newResults[res.id] = res.data;
          }
        });
        return newResults;
      });

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
    fetchAllData();
  }, []);
  
  const totalPages = Math.ceil(invoices.length / PAGE_SIZE);
  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return invoices.slice(startIndex, startIndex + PAGE_SIZE);
  }, [invoices, currentPage]);

  const handleInvoiceAdded = () => {
    setFormOpen(false);
    fetchAllData();
  }
  
  const handleAction = async (invoiceId: string, status: 'Approved for Payment' | 'Disputed') => {
      if (!user) return;
      setActiveAction(invoiceId);
      try {
          const response = await fetch(`/api/invoices/${invoiceId}/status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status, userId: user.id })
          });
          if (!response.ok) throw new Error(`Failed to mark invoice as ${status}.`);
          toast({ title: "Success", description: `Invoice has been marked as ${status}.`});
          fetchAllData();
      } catch (error) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: error instanceof Error ? error.message : 'An unknown error occurred.',
        });
      } finally {
        setActiveAction(null);
      }
  }

  const handlePayment = async (invoiceId: string) => {
    if (!user) return;
     setActiveAction(invoiceId);
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
        fetchAllData();
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: error instanceof Error ? error.message : 'An unknown error occurred.',
        });
    } finally {
        setActiveAction(null);
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Paid': return 'default';
      case 'Pending': return 'secondary';
      case 'Approved_for_Payment': return 'secondary';
      case 'Disputed': return 'destructive';
      default: return 'outline';
    }
  };


  if (loading && invoices.length === 0) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Invoices & Matching</CardTitle>
          <CardDescription>
            Manage vendor invoices and their three-way matching status.
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
                <TableHead className="w-10">#</TableHead>
                <TableHead>Invoice ID</TableHead>
                <TableHead>PO Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Matching</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedInvoices.length > 0 ? (
                paginatedInvoices.map((invoice, index) => {
                  const matchResult = matchResults[invoice.id] ?? 'loading';
                  const isActionDisabled = !matchResult || matchResult === 'loading' || matchResult.status !== 'Matched';
                  const isActionLoading = activeAction === invoice.id;
                  
                  return (
                  <TableRow key={invoice.id}>
                    <TableCell className="text-muted-foreground">{(currentPage - 1) * PAGE_SIZE + index + 1}</TableCell>
                    <TableCell className="font-medium text-primary">{invoice.id}</TableCell>
                    <TableCell>{invoice.purchaseOrderId}</TableCell>
                    <TableCell>{format(new Date(invoice.invoiceDate), 'PP')}</TableCell>
                     <TableCell>
                        <MatchingStatusBadge result={matchResult} onRefresh={fetchAllData} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={getStatusVariant(invoice.status)}>{invoice.status.replace(/_/g, ' ')}</Badge>
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
                                    disabled={isActionDisabled || isActionLoading}
                                >
                                {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ThumbsUp className="mr-2 h-4 w-4" />} Approve
                                </Button>
                                <Button 
                                    variant="destructive" 
                                    size="sm"
                                    onClick={() => handleAction(invoice.id, 'Disputed')}
                                    disabled={isActionLoading}
                                >
                                {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ThumbsDown className="mr-2 h-4 w-4" />} Dispute
                                </Button>
                            </>
                        )}
                        {invoice.status === 'Approved_for_Payment' && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button size="sm" disabled={isActionLoading}>
                                         {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Banknote className="mr-2 h-4 w-4" />} Pay Invoice
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
                         {invoice.status === 'Paid' && invoice.paymentDate && (
                             <div className="flex items-center text-sm text-green-600">
                                 <CheckCircle className="mr-2 h-4 w-4"/> Paid on {format(new Date(invoice.paymentDate), 'PP')}
                             </div>
                         )}
                      </div>
                    </TableCell>
                  </TableRow>
                )})
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
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
    </>
  );
}
