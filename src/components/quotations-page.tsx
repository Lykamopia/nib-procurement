'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Award, XCircle } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { PurchaseRequisition, Quotation, Vendor } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { format } from 'date-fns';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';

const quoteFormSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required."),
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


export function QuotationsPage() {
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedReqId, setSelectedReqId] = useState<string>('');
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setFormOpen] = useState(false);
  const { toast } = useToast();

  const selectedRequisition = requisitions.find(r => r.id === selectedReqId);

  const fetchRequisitions = async () => {
    try {
      const response = await fetch('/api/requisitions');
      const data = await response.json();
      // We only care about approved requisitions for quotations
      setRequisitions(data.filter((r: PurchaseRequisition) => r.status === 'Approved' || r.status === 'RFQ In Progress'));
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

  const getStatusVariant = (status: 'Submitted' | 'Awarded' | 'Rejected') => {
    switch (status) {
      case 'Awarded': return 'default';
      case 'Submitted': return 'secondary';
      case 'Rejected': return 'destructive';
    }
  }

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Select Requisition</CardTitle>
                <CardDescription>Choose a requisition to view or add quotations.</CardDescription>
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
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Quotations for {selectedRequisition.id}</CardTitle>
                        <CardDescription>
                            Compare submitted quotes or add a new one.
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
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Vendor</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Total Price</TableHead>
                                    <TableHead>Est. Delivery</TableHead>
                                    <TableHead>Submitted At</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={6} className="h-24 text-center">Loading quotations...</TableCell></TableRow>
                            ) : quotations.length > 0 ? (
                                quotations.map(quote => (
                                <TableRow key={quote.id}>
                                    <TableCell className="font-medium text-primary">{quote.vendorName}</TableCell>
                                    <TableCell><Badge variant={getStatusVariant(quote.status)}>{quote.status}</Badge></TableCell>
                                    <TableCell className="text-right">${quote.totalPrice.toLocaleString()}</TableCell>
                                    <TableCell>{format(new Date(quote.deliveryDate), 'PP')}</TableCell>
                                    <TableCell>{format(new Date(quote.createdAt), 'PPp')}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex gap-2 justify-end">
                                            <Button variant="outline" size="sm" disabled={quote.status !== 'Submitted'}>
                                                <Award className="mr-2 h-4 w-4" />
                                                Award
                                            </Button>
                                            <Button variant="destructive" size="sm" disabled={quote.status !== 'Submitted'}>
                                                <XCircle className="mr-2 h-4 w-4" />
                                                Reject
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        No quotations submitted for this requisition yet.
                                    </TableCell>
                                </TableRow>
                            )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        )}
    </div>
  );
}
