
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from './ui/dialog';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Award, XCircle, FileSignature } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { PurchaseRequisition, Quotation, Vendor } from '@/lib/types';
import { format, formatDistanceToNow } from 'date-fns';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { useAuth } from '@/contexts/auth-context';
import { Separator } from './ui/separator';

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

const contractFormSchema = z.object({
    fileName: z.string().min(3, "File name is required."),
    notes: z.string().min(10, "Negotiation notes are required.")
})

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
                <FormMessage>
                    For requisition: <span className="font-semibold text-primary">{requisition.title}</span>
                </FormMessage>
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

const ContractManagement = ({ requisition, onContractFinalized }: { requisition: PurchaseRequisition, onContractFinalized: () => void }) => {
    const [isSubmitting, setSubmitting] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();
    const [fileName, setFileName] = useState('');

    const form = useForm<z.infer<typeof contractFormSchema>>({
        resolver: zodResolver(contractFormSchema),
        defaultValues: {
            fileName: requisition.contract?.fileName || "",
            notes: requisition.negotiationNotes || "",
        }
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setFileName(file.name);
            form.setValue('fileName', file.name);
        }
    }

    const onSubmit = async (values: z.infer<typeof contractFormSchema>) => {
        if (!user) return;
        setSubmitting(true);
        try {
            const response = await fetch(`/api/requisitions/${requisition.id}/contract`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...values, userId: user.id }),
            });
            if (!response.ok) throw new Error("Failed to finalize contract.");
            toast({ title: "Contract Finalized!", description: "The contract has been attached and notes saved." });
            onContractFinalized();
        } catch (error) {
             toast({
                variant: 'destructive',
                title: 'Error',
                description: error instanceof Error ? error.message : 'An unknown error occurred.',
            });
        } finally {
            setSubmitting(false);
        }
    }

    const awardedQuote = requisition.quotations?.find(q => q.status === 'Awarded');

    return (
        <Card className="mt-6 border-primary/50">
            <CardHeader>
                <CardTitle>Contract Finalization</CardTitle>
                <CardDescription>
                    Finalize the contract for {requisition.id} with <span className="font-semibold">{awardedQuote?.vendorName}</span>.
                </CardDescription>
            </CardHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent className="space-y-4">
                        <FormField
                            control={form.control}
                            name="fileName"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Contract Document</FormLabel>
                                 <FormControl>
                                    <Input id="contract-file" type="file" onChange={handleFileChange} className="hidden" />
                                 </FormControl>
                                 <div className="flex items-center gap-2">
                                    <Button asChild variant="outline">
                                        <label htmlFor="contract-file">Upload File</label>
                                    </Button>
                                    {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
                                 </div>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Negotiation &amp; Finalization Notes</FormLabel>
                                <FormControl>
                                    <Textarea rows={5} placeholder="Record key negotiation points, final terms, and any other relevant contract details..." {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                    <CardFooter>
                         <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSignature className="mr-2 h-4 w-4" />}
                            Finalize and Create PO
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
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
  const isAwarded = quotations.some(q => q.status === 'Awarded');

  const fetchAllRequisitions = async () => {
    try {
      const response = await fetch('/api/requisitions');
      const data = await response.json();
      // We only care about approved requisitions for quotations
      setRequisitions(data);
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
    fetchAllRequisitions();
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
  
  const handleContractFinalized = () => {
    fetchAllRequisitions(); // To get the updated requisition status
    if(selectedReqId) fetchQuotations(selectedReqId);
  }

  const handleQuoteAction = async (quoteId: string, status: 'Awarded' | 'Rejected') => {
    if (!user || !selectedReqId) return;
    try {
        const response = await fetch(`/api/quotations/${quoteId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, userId: user.id, requisitionId: selectedReqId }),
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
        fetchAllRequisitions(); // to get updated req status and details
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: error instanceof Error ? error.message : 'An unknown error occurred.',
        });
    }
  }
  
  const availableRequisitions = requisitions.filter(r => 
      (r.status === 'Approved' || r.status === 'RFQ In Progress' || r.status === 'PO Created')
  );


  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Select Requisition</CardTitle>
                <CardDescription>Choose a requisition to manage quotations and contracts.</CardDescription>
            </CardHeader>
            <CardContent>
                <Select onValueChange={setSelectedReqId} value={selectedReqId}>
                    <SelectTrigger className="w-full md:w-1/2">
                        <SelectValue placeholder="Select an approved requisition..." />
                    </SelectTrigger>
                    <SelectContent>
                        {availableRequisitions.length > 0 ? availableRequisitions.map(req => (
                            <SelectItem key={req.id} value={req.id}>{req.id} - {req.title}</SelectItem>
                        )) : <div className="p-4 text-sm text-muted-foreground">No requisitions ready for quotation.</div>}
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
                            <Button disabled={isAwarded}><PlusCircle className="mr-2 h-4 w-4"/>Add Quotation</Button>
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

                {isAwarded && selectedRequisition.status !== 'PO Created' && (
                    <>
                        <Separator className="my-6"/>
                        <ContractManagement requisition={selectedRequisition} onContractFinalized={handleContractFinalized}/>
                    </>
                )}
            </Card>
        )}
    </div>
  );
}
