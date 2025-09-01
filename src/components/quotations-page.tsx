
'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from './ui/card';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from './ui/dialog';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Award, XCircle, CheckCircle2, ShieldX } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { PurchaseRequisition, Quotation, Vendor } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { format, formatDistanceToNow } from 'date-fns';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { useAuth } from '@/contexts/auth-context';

const quoteFormSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required."),
  notes: z.string().optional(),
  items: z.array(z.object({
    requisitionItemId: z.string(),
    name: z.string(),
    quantity: z.number(),
    unitPrice: z.coerce.number().min(0.01, "Price is required."),
    leadTimeDays: z.coerce.number().min(0, "Lead time is required."),
  })),
});

function AddQuoteForm({ requisition, vendors, onQuoteAdded }: { requisition: PurchaseRequisition; vendors: Vendor[], onQuoteAdded: () => void }) {
    const [isSubmitting, setSubmitting] = useState(false);
    const { toast } = useToast();
    const form = useForm<z.infer<typeof quoteFormSchema>>({
        resolver: zodResolver(quoteFormSchema),
        defaultValues: {
            vendorId: "",
            notes: "",
            items: requisition.items.map(item => ({
                requisitionItemId: item.id,
                name: item.name,
                quantity: item.quantity,
                unitPrice: 0,
                leadTimeDays: 0,
            })),
        },
    });

    const { fields } = useFieldArray({
        control: form.control,
        name: "items",
    });

    const onSubmit = async (values: z.infer<typeof quoteFormSchema>) => {
        setSubmitting(true);
        try {
            const response = await fetch('/api/quotations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...values, requisitionId: requisition.id }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to add quote.');
            }

            toast({
                title: 'Success!',
                description: 'New quotation has been added.',
            });
            onQuoteAdded();
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
        <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
                <DialogTitle>Add New Quotation</DialogTitle>
                <DialogDescription>
                    For requisition: <span className="font-semibold text-primary">{requisition.title}</span>
                </DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="vendorId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Vendor</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a vendor" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                     <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Overall Notes</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Any overall notes for this quote..." {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                        {fields.map((field, index) => (
                            <Card key={field.id} className="p-4">
                                <p className="font-semibold mb-2">{field.name} (Qty: {field.quantity})</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name={`items.${index}.unitPrice`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Unit Price ($)</FormLabel>
                                                <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`items.${index}.leadTimeDays`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Lead Time (Days)</FormLabel>
                                                <FormControl><Input type="number" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </Card>
                        ))}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Add Quotation
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    );
}

const QuoteComparison = ({ quotes, onAction }: { quotes: Quotation[], onAction: (quoteId: string, status: 'Awarded' | 'Rejected') => void }) => {
    if (quotes.length === 0) {
        return (
            <div className="h-24 flex items-center justify-center text-muted-foreground">
                No quotations submitted for this requisition yet.
            </div>
        );
    }
    
    const isAnyAwarded = quotes.some(q => q.status === 'Awarded');
    
    const getStatusVariant = (status: 'Submitted' | 'Awarded' | 'Rejected') => {
        switch (status) {
            case 'Awarded': return 'default';
            case 'Submitted': return 'secondary';
            case 'Rejected': return 'destructive';
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quotes.map(quote => (
                <Card key={quote.id} className="flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex justify-between items-start">
                           <span>{quote.vendorName}</span>
                           <Badge variant={getStatusVariant(quote.status)}>{quote.status}</Badge>
                        </CardTitle>
                        <CardDescription>Submitted {formatDistanceToNow(new Date(quote.createdAt), { addSuffix: true })}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-4">
                        <div className="text-3xl font-bold text-center">${quote.totalPrice.toLocaleString()}</div>
                        <div className="text-center text-muted-foreground">Est. Delivery: {format(new Date(quote.deliveryDate), 'PP')}</div>
                        
                        <div className="text-sm space-y-2">
                           <h4 className="font-semibold">Items:</h4>
                            {quote.items.map(item => (
                                <div key={item.requisitionItemId} className="flex justify-between items-center text-muted-foreground">
                                    <span>{item.name} x {item.quantity}</span>
                                    <span className="font-mono">${item.unitPrice.toFixed(2)} ea.</span>
                                </div>
                            ))}
                        </div>
                        {quote.notes && (
                            <div className="text-sm space-y-1 pt-2 border-t">
                                <h4 className="font-semibold">Notes:</h4>
                                <p className="text-muted-foreground text-xs italic">{quote.notes}</p>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex gap-2">
                        <Button 
                            className="w-full"
                            onClick={() => onAction(quote.id, 'Awarded')}
                            disabled={isAnyAwarded || quote.status !== 'Submitted'}>
                            <Award className="mr-2 h-4 w-4"/>
                            {quote.status === 'Awarded' ? 'Awarded' : 'Award'}
                        </Button>
                        <Button 
                            className="w-full"
                            variant="outline"
                             onClick={() => onAction(quote.id, 'Rejected')}
                            disabled={isAnyAwarded || quote.status !== 'Submitted'}>
                            <XCircle className="mr-2 h-4 w-4"/>
                            Reject
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    )
}


export function QuotationsPage() {
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedReqId, setSelectedReqId] = useState<string>('');
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setFormOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();


  const selectedRequisition = requisitions.find(r => r.id === selectedReqId);

  const fetchRequisitions = async () => {
    try {
      const response = await fetch('/api/requisitions');
      const data = await response.json();
      // We only care about approved requisitions for quotations
      setRequisitions(data.filter((r: PurchaseRequisition) => r.status === 'Approved' || r.status === 'RFQ In Progress' || r.status === 'PO Created'));
    } catch (error) {
      console.error("Failed to fetch requisitions", error);
    }
  };
  
  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/vendors');
      const data = await response.json();
      setVendors(data);
    } catch (error) {
      console.error("Failed to fetch vendors", error);
    }
  };

  const fetchQuotations = async (requisitionId: string) => {
    if (!requisitionId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/quotations?requisitionId=${requisitionId}`);
      const data = await response.json();
      setQuotations(data);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch quotations.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequisitions();
    fetchVendors();
  }, []);

  useEffect(() => {
    if (selectedReqId) {
      fetchQuotations(selectedReqId);
    } else {
        setQuotations([]);
    }
  }, [selectedReqId]);

  const handleQuoteAdded = () => {
    setFormOpen(false);
    if(selectedReqId) fetchQuotations(selectedReqId);
  }
  
  const handleQuoteAction = async (quoteId: string, status: 'Awarded' | 'Rejected') => {
    try {
        const response = await fetch(`/api/quotations/${quoteId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, userId: user?.id, requisitionId: selectedReqId }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update quote status.');
        }
        toast({
            title: `Quote ${status}`,
            description: `The quotation has been successfully ${status.toLowerCase()}.`
        });
        if(selectedReqId) fetchQuotations(selectedReqId);
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: error instanceof Error ? error.message : 'An unknown error occurred.',
        });
    }
  }


  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Select Requisition</CardTitle>
                <CardDescription>Choose a requisition to view and compare quotations.</CardDescription>
            </CardHeader>
            <CardContent>
                <Select onValueChange={setSelectedReqId} value={selectedReqId}>
                    <SelectTrigger className="w-full md:w-1/2">
                        <SelectValue placeholder="Select an approved requisition..." />
                    </SelectTrigger>
                    <SelectContent>
                        {requisitions.map(req => (
                            <SelectItem key={req.id} value={req.id}>{req.id} - {req.title}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </CardContent>
        </Card>
    
        {selectedRequisition && (
            <Card>
                <CardHeader className="flex flex-row items-start sm:items-center justify-between">
                    <div>
                        <CardTitle>Quotations for {selectedRequisition.id}</CardTitle>
                        <CardDescription>
                            Compare submitted quotes side-by-side or add a new one.
                        </CardDescription>
                    </div>
                     <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
                        <DialogTrigger asChild>
                            <Button><PlusCircle className="mr-2 h-4 w-4"/>Add Quotation</Button>
                        </DialogTrigger>
                        <AddQuoteForm requisition={selectedRequisition} vendors={vendors} onQuoteAdded={handleQuoteAdded} />
                    </Dialog>
                </CardHeader>
                <CardContent>
                   {loading ? (
                       <div className="h-24 flex items-center justify-center">
                           <Loader2 className="h-8 w-8 animate-spin text-primary" />
                       </div>
                   ) : (
                       <QuoteComparison quotes={quotations} onAction={handleQuoteAction} />
                   )}
                </CardContent>
            </Card>
        )}
    </div>
  );
}
