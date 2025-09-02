
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Award, XCircle, FileSignature, FileText, Bot, Lightbulb, ArrowLeft, Star, Undo, Check } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PurchaseOrder, PurchaseRequisition, Quotation, Vendor } from '@/lib/types';
import { format, formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/auth-context';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { analyzeQuotes } from '@/ai/flows/quote-analysis';
import type { QuoteAnalysisInput, QuoteAnalysisOutput } from '@/ai/flows/quote-analysis.types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


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
                                                <FormLabel>Unit Price (ETB)</FormLabel>
                                                <FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} /></FormControl>
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

const QuoteComparison = ({ quotes, onAction, onConfirmAward, recommendation, onReject }: { quotes: Quotation[], onAction: (quoteId: string, status: 'Awarded' | 'Rejected') => void, onConfirmAward: (quote: Quotation) => void, recommendation?: QuoteAnalysisOutput | null, onReject: (quoteId: string) => void }) => {
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

    const getRecommendationRank = (quoteId: string) => {
        return recommendation?.recommendations.findIndex(r => r.quoteId === quoteId);
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quotes.map(quote => {
                const rank = getRecommendationRank(quote.id);
                const isRecommended = rank !== undefined && rank > -1;
                return (
                    <Card key={quote.id} className={cn("flex flex-col", quote.status === 'Awarded' && 'border-primary ring-2 ring-primary', isRecommended && 'border-green-500 ring-2 ring-green-500')}>
                        {isRecommended && (
                            <div className="flex items-center gap-2 p-2 bg-green-500 text-white text-xs font-bold rounded-t-lg">
                               <Star className="h-4 w-4 fill-white"/> AI Recommendation #{rank! + 1}
                            </div>
                        )}
                        <CardHeader>
                            <CardTitle className="flex justify-between items-start">
                            <span>{quote.vendorName}</span>
                            <Badge variant={getStatusVariant(quote.status)}>{quote.status}</Badge>
                            </CardTitle>
                            <CardDescription>Submitted {formatDistanceToNow(new Date(quote.createdAt), { addSuffix: true })}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-4">
                            <div className="text-3xl font-bold text-center">{quote.totalPrice.toLocaleString()} ETB</div>
                            <div className="text-center text-muted-foreground">Est. Delivery: {format(new Date(quote.deliveryDate), 'PP')}</div>
                            
                            <div className="text-sm space-y-2">
                            <h4 className="font-semibold">Items:</h4>
                                {quote.items.map(item => (
                                    <div key={item.requisitionItemId} className="flex justify-between items-center text-muted-foreground">
                                        <span>{item.name} x {item.quantity}</span>
                                        <span className="font-mono">{item.unitPrice.toFixed(2)} ETB ea.</span>
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
                                onClick={() => onConfirmAward(quote)}
                                disabled={isAnyAwarded || quote.status !== 'Submitted'}>
                                <Award className="mr-2 h-4 w-4"/>
                                {quote.status === 'Awarded' ? 'Awarded' : 'Award'}
                            </Button>
                            <Button 
                                className="w-full"
                                variant="outline"
                                onClick={() => onReject(quote.id)}
                                disabled={isAnyAwarded || quote.status !== 'Submitted'}>
                                <XCircle className="mr-2 h-4 w-4"/>
                                Reject
                            </Button>
                        </CardFooter>
                    </Card>
                )
            })}
        </div>
    )
}

const AIQuoteAdvisor = ({ requisition, quotes, onRecommendation }: { requisition: PurchaseRequisition, quotes: Quotation[], onRecommendation: (rec: QuoteAnalysisOutput) => void }) => {
    const [metric, setMetric] = useState<"Lowest Price" | "Fastest Delivery" | "Best Balance">("Best Balance");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleAnalysis = async () => {
        setLoading(true);
        try {
            const analysisInput: QuoteAnalysisInput = {
                quotations: quotes.map(q => ({
                    ...q,
                    createdAt: new Date(q.createdAt).toISOString(),
                    deliveryDate: new Date(q.deliveryDate).toISOString(),
                })),
                decisionMetric: metric,
                requisitionDetails: `${requisition.title} - ${requisition.justification}`,
            };
            const result = await analyzeQuotes(analysisInput);
            onRecommendation(result);
        } catch (error) {
            console.error("AI Analysis failed:", error);
            toast({
                variant: 'destructive',
                title: 'AI Advisor Error',
                description: 'Could not get a recommendation at this time.'
            });
        } finally {
            setLoading(false);
        }
    }

    return (
         <Card className="bg-muted/50">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bot /> AI Quote Advisor</CardTitle>
                <CardDescription>Select a metric and let AI recommend the best quote.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
                 <Select value={metric} onValueChange={(v) => setMetric(v as any)}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select a metric" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Best Balance">Best Balance</SelectItem>
                        <SelectItem value="Lowest Price">Lowest Price</SelectItem>
                        <SelectItem value="Fastest Delivery">Fastest Delivery</SelectItem>
                    </SelectContent>
                </Select>
                <Button onClick={handleAnalysis} disabled={loading || quotes.length < 2}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Get AI Recommendation
                </Button>
            </CardContent>
        </Card>
    )
}


const ContractManagement = ({ requisition, onContractFinalized, onPOCreated }: { requisition: PurchaseRequisition, onContractFinalized: () => void, onPOCreated: (po: PurchaseOrder) => void }) => {
    const [isContractSubmitting, setContractSubmitting] = useState(false);
    const [isPOSubmitting, setPOSubmitting] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();
    const [fileName, setFileName] = useState(requisition.contract?.fileName || '');

    const contractForm = useForm<z.infer<typeof contractFormSchema>>({
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
            contractForm.setValue('fileName', file.name);
        }
    }

    const onContractSubmit = async (values: z.infer<typeof contractFormSchema>) => {
        if (!user) return;
        setContractSubmitting(true);
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
            setContractSubmitting(false);
        }
    }

    const handleCreatePO = async () => {
        if (!user) return;
        setPOSubmitting(true);
        try {
            const response = await fetch(`/api/purchase-orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requisitionId: requisition.id, userId: user.id }),
            });
            const newPO = await response.json();
            if (!response.ok) throw new Error(newPO.error || "Failed to create Purchase Order.");
            
            toast({ title: "Purchase Order Created!", description: `PO ${newPO.id} has been successfully created.` });
            onPOCreated(newPO);
        } catch (error) {
             toast({
                variant: 'destructive',
                title: 'Error',
                description: error instanceof Error ? error.message : 'An unknown error occurred.',
            });
        } finally {
            setPOSubmitting(false);
        }
    }

    const awardedQuote = requisition.quotations?.find(q => q.status === 'Awarded');

    return (
        <Card className="mt-6 border-primary/50">
            <CardHeader>
                <CardTitle>Contract & PO Finalization</CardTitle>
                <CardDescription>
                    Finalize the contract for {requisition.id} with <span className="font-semibold">{awardedQuote?.vendorName}</span> and generate the Purchase Order.
                </CardDescription>
            </CardHeader>
            <Form {...contractForm}>
                <form onSubmit={contractForm.handleSubmit(onContractSubmit)}>
                    <CardContent className="space-y-4">
                        <FormField
                            control={contractForm.control}
                            name="fileName"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Contract Document</FormLabel>
                                 <FormControl>
                                    <Input id="contract-file" type="file" onChange={handleFileChange} className="hidden" />
                                 </FormControl>
                                 <div className="flex items-center gap-2">
                                    <Button asChild variant="outline">
                                        <label htmlFor="contract-file" className={cn(!!field.value && "hidden")}>Upload File</label>
                                    </Button>
                                    {field.value && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 border rounded-md">
                                            <FileText className="h-4 w-4" />
                                            <span>{field.value}</span>
                                            <Button variant="ghost" size="sm" onClick={() => { setFileName(''); contractForm.setValue('fileName', '');}}>Change</Button>
                                        </div>
                                    )}
                                 </div>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={contractForm.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Negotiation & Finalization Notes</FormLabel>
                                <FormControl>
                                    <Textarea rows={5} placeholder="Record key negotiation points, final terms, and any other relevant contract details..." {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                    <CardFooter>
                         <Button type="submit" disabled={isContractSubmitting || !contractForm.formState.isDirty}>
                            {isContractSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSignature className="mr-2 h-4 w-4" />}
                            Save Contract Details
                        </Button>
                    </CardFooter>
                </form>
            </Form>
             <Separator className="my-4" />
             <CardContent>
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                        <h4 className="font-semibold">Generate Purchase Order</h4>
                        <p className="text-sm text-muted-foreground">Once contract details are saved, create the official PO.</p>
                    </div>
                    <Button onClick={handleCreatePO} disabled={isPOSubmitting || !requisition.contract}>
                        {isPOSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create PO
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

const WorkflowStepper = ({ step }: { step: 'award' | 'finalize' }) => (
    <div className="flex items-center justify-center space-x-2 sm:space-x-4">
        <div className="flex items-center gap-2">
            <div className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold", step === 'award' ? 'bg-primary text-primary-foreground' : 'bg-green-500 text-white')}>
                {step === 'award' ? '1' : <Check className="h-4 w-4"/>}
            </div>
            <span className={cn("font-medium", step === 'award' ? "text-primary" : "text-muted-foreground")}>Compare & Award</span>
        </div>
        <div className={cn("h-px w-16 bg-border transition-colors", step === 'finalize' && "bg-primary")}></div>
         <div className="flex items-center gap-2">
            <div className={cn("flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold", step === 'finalize' ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground')}>
                2
            </div>
            <span className={cn("font-medium", step === 'finalize' ? "text-primary" : "text-muted-foreground")}>Finalize Contract & PO</span>
        </div>
    </div>
);

export default function QuotationDetailsPage() {
  const [requisition, setRequisition] = useState<PurchaseRequisition | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setFormOpen] = useState(false);
  const [lastPOCreated, setLastPOCreated] = useState<PurchaseOrder | null>(null);
  const [aiRecommendation, setAiRecommendation] = useState<QuoteAnalysisOutput | null>(null);
  const [quoteToAward, setQuoteToAward] = useState<Quotation | null>(null);
  const [isChangingAward, setIsChangingAward] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const isAwarded = quotations.some(q => q.status === 'Awarded');

  const fetchRequisitionAndQuotes = async () => {
    if (!id) return;
    setLoading(true);
    setLastPOCreated(null);
    setAiRecommendation(null);
    try {
       const [reqResponse, venResponse, quoResponse] = await Promise.all([
        fetch('/api/requisitions'),
        fetch('/api/vendors'),
        fetch(`/api/quotations?requisitionId=${id}`)
      ]);
      const allReqs = await reqResponse.json();
      const venData = await venResponse.json();
      const quoData = await quoResponse.json();

      const currentReq = allReqs.find((r: PurchaseRequisition) => r.id === id);

      if (currentReq) {
        setRequisition(currentReq);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Requisition not found.' });
      }

      setVendors(venData);
      setQuotations(quoData);

    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
        fetchRequisitionAndQuotes();
    }
  }, [id]);

  const handleQuoteAdded = () => {
    setFormOpen(false);
    fetchRequisitionAndQuotes();
  }
  
  const handleContractFinalized = () => {
    fetchRequisitionAndQuotes();
  }
  
  const handlePOCreated = (po: PurchaseOrder) => {
    fetchRequisitionAndQuotes();
    setLastPOCreated(po);
  }
  
  const handleAwardConfirmation = (quote: Quotation) => {
    setQuoteToAward(quote);
  }

  const handleQuoteAction = async (quoteId: string, status: 'Awarded' | 'Rejected' | 'ChangeAward') => {
    if (!user || !id) return;
    
    if (status === 'ChangeAward') setIsChangingAward(true);

    try {
        const response = await fetch(`/api/quotations/${quoteId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, userId: user.id, requisitionId: id }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update quote status.');
        }

        let toastDescription = `The quotation has been successfully ${status.toLowerCase()}.`;
        if (status === 'ChangeAward') {
            toastDescription = 'The award has been reset. You can now select a new quote.'
        } else if (status === 'Awarded') {
             toastDescription = `The quotation has been successfully awarded.`
        }

        toast({
            title: `Quote Status Updated`,
            description: toastDescription
        });
        setQuoteToAward(null);
        fetchRequisitionAndQuotes();
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: error instanceof Error ? error.message : 'An unknown error occurred.',
        });
    } finally {
         if (status === 'ChangeAward') setIsChangingAward(false);
    }
  }

  if (loading) {
     return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  if (!requisition) {
     return <div className="text-center p-8">Requisition not found.</div>;
  }
  
  const currentStep = isAwarded ? 'finalize' : 'award';

  return (
    <div className="space-y-6">
        <Button variant="outline" onClick={() => router.push('/quotations')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to All Requisitions
        </Button>
        
        <Card className="p-4 sm:p-6">
            <WorkflowStepper step={currentStep} />
        </Card>

        <Card>
            <CardHeader className="flex flex-row items-start sm:items-center justify-between">
                <div>
                    <CardTitle>Quotations for {requisition.id}</CardTitle>
                    <CardDescription>
                        {requisition.title}
                    </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                     {isAwarded && (
                        <Button variant="outline" onClick={() => handleQuoteAction('', 'ChangeAward')} disabled={isChangingAward}>
                            {isChangingAward ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Undo className="mr-2 h-4 w-4"/>}
                            Change Award Decision
                        </Button>
                    )}
                     <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
                        <DialogTrigger asChild>
                            <Button disabled={isAwarded}><PlusCircle className="mr-2 h-4 w-4"/>Add Quotation</Button>
                        </DialogTrigger>
                        {requisition && <AddQuoteForm requisition={requisition} vendors={vendors} onQuoteAdded={handleQuoteAdded} />}
                    </Dialog>
                </div>
            </CardHeader>
             <CardContent>
                {quotations.length > 1 && !isAwarded && (
                    <AIQuoteAdvisor 
                        requisition={requisition} 
                        quotes={quotations} 
                        onRecommendation={setAiRecommendation}
                    />
                )}
             </CardContent>
              {aiRecommendation && (
                 <CardContent>
                    <Alert variant="default" className="border-green-500/50">
                        <Lightbulb className="h-4 w-4 text-green-500" />
                        <AlertTitle className="text-green-600">AI Recommendation: {aiRecommendation.summary}</AlertTitle>
                        <AlertDescription>
                            {aiRecommendation.justification}
                        </AlertDescription>
                    </Alert>
                </CardContent>
              )}
            <CardContent>
               {loading ? (
                   <div className="h-24 flex items-center justify-center">
                       <Loader2 className="h-8 w-8 animate-spin text-primary" />
                   </div>
               ) : (
                   <QuoteComparison 
                    quotes={quotations} 
                    onAction={handleQuoteAction}
                    onConfirmAward={handleAwardConfirmation}
                    recommendation={aiRecommendation}
                    onReject={(quoteId) => handleQuoteAction(quoteId, 'Rejected')}
                   />
               )}
            </CardContent>
            
             {lastPOCreated && (
                <CardContent>
                    <Alert>
                        <AlertTitle>Success!</AlertTitle>
                        <AlertDescription className="flex items-center justify-between">
                            <span>Purchase Order {lastPOCreated.id} was created.</span>
                            <Button asChild variant="link">
                                <Link href={`/purchase-orders/${lastPOCreated.id}`} target="_blank">View PO</Link>
                            </Button>
                        </AlertDescription>
                    </Alert>
                </CardContent>
             )}

            {isAwarded && requisition.status !== 'PO Created' && (
                <>
                    <Separator className="my-6"/>
                    <ContractManagement requisition={requisition} onContractFinalized={handleContractFinalized} onPOCreated={handlePOCreated}/>
                </>
            )}
        </Card>
        
        {quoteToAward && (
            <AlertDialog open={!!quoteToAward} onOpenChange={(open) => !open && setQuoteToAward(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Award Decision</AlertDialogTitle>
                        <AlertDialogDescription>
                            You are about to award this requisition to <span className="font-bold">{quoteToAward.vendorName}</span> for a total of <span className="font-bold">{quoteToAward.totalPrice.toLocaleString()} ETB</span>. This will reject all other quotes. Are you sure you want to proceed?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                     <div className="rounded-md border bg-muted/50 p-4 text-sm">
                        <h4 className="font-semibold mb-2">Key Information</h4>
                        <div className="grid grid-cols-2 gap-1">
                            <span className="text-muted-foreground">Vendor:</span><span>{quoteToAward.vendorName}</span>
                            <span className="text-muted-foreground">Total Price:</span><span>{quoteToAward.totalPrice.toLocaleString()} ETB</span>
                            <span className="text-muted-foreground">Delivery Date:</span><span>{format(new Date(quoteToAward.deliveryDate), 'PP')}</span>
                        </div>
                     </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setQuoteToAward(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleQuoteAction(quoteToAward.id, 'Awarded')}>
                            Confirm and Award
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )}
    </div>
  );
}
