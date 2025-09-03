
'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import { Loader2, PlusCircle, Award, XCircle, FileSignature, FileText, Bot, Lightbulb, ArrowLeft, Star, Undo, Check, Send, Search, BadgeHelp, BadgeCheck, BadgeX, Crown, Medal, Trophy } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PurchaseOrder, PurchaseRequisition, Quotation, Vendor, QuotationStatus } from '@/lib/types';
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
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
    
    // Filter for only verified vendors
    const verifiedVendors = vendors.filter(v => v.kycStatus === 'Verified');

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
                                    <SelectValue placeholder="Select a verified vendor" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {verifiedVendors.length > 0 ? (
                                        verifiedVendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)
                                    ) : (
                                        <div className="p-4 text-center text-sm text-muted-foreground">No verified vendors available.</div>
                                    )}
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
                        <Button type="submit" disabled={isSubmitting || verifiedVendors.length === 0}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Add Quotation
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    );
}

const QuoteComparison = ({ quotes, recommendation }: { quotes: Quotation[], recommendation?: QuoteAnalysisOutput | null }) => {
    if (quotes.length === 0) {
        return (
            <div className="h-24 flex items-center justify-center text-muted-foreground">
                No quotations submitted for this requisition yet.
            </div>
        );
    }
    
    const getStatusVariant = (status: QuotationStatus) => {
        switch (status) {
            case 'Awarded': return 'default';
            case 'Standby': return 'secondary';
            case 'Submitted': return 'outline';
            case 'Rejected': return 'destructive';
        }
    }

    const getRankIcon = (rank?: number) => {
        switch (rank) {
            case 1: return <Crown className="h-5 w-5 text-amber-400" />;
            case 2: return <Trophy className="h-5 w-5 text-slate-400" />;
            case 3: return <Medal className="h-5 w-5 text-amber-600" />;
            default: return null;
        }
    }

    const getRecommendationRank = (quoteId: string) => {
        if (!recommendation) return -1;
        return recommendation.recommendations.findIndex(r => r.quoteId === quoteId);
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quotes.sort((a, b) => (a.rank || 4) - (b.rank || 4)).map(quote => {
                const aiRank = getRecommendationRank(quote.id);
                const isRecommended = aiRank > -1;
                return (
                    <Card key={quote.id} className={cn("flex flex-col", quote.status === 'Awarded' && 'border-primary ring-2 ring-primary')}>
                       <CardHeader>
                            <CardTitle className="flex justify-between items-start">
                               <div className="flex items-center gap-2">
                                 {getRankIcon(quote.rank)}
                                 <span>{quote.vendorName}</span>
                               </div>
                               <Badge variant={getStatusVariant(quote.status)}>{quote.status}</Badge>
                            </CardTitle>
                            <CardDescription>
                                {isRecommended && (
                                     <span className="flex items-center gap-1 text-xs text-green-600 font-semibold"><Star className="h-3 w-3 fill-green-500" /> AI Rec #{aiRank + 1}</span>
                                )}
                                <span className="text-xs">Submitted {formatDistanceToNow(new Date(quote.createdAt), { addSuffix: true })}</span>
                            </CardDescription>
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

const RFQDistribution = ({ requisition, vendors, onRfqSent }: { requisition: PurchaseRequisition; vendors: Vendor[]; onRfqSent: () => void; }) => {
    const [distributionType, setDistributionType] = useState<'all' | 'select'>('all');
    const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
    const [vendorSearch, setVendorSearch] = useState('');
    const [isSubmitting, setSubmitting] = useState(false);
    const { user } = useAuth();
    const { toast } = useToast();

    const handleSendRFQ = async () => {
        if (!user) return;
        if (distributionType === 'select' && selectedVendors.length === 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select at least one vendor.' });
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch(`/api/requisitions/${requisition.id}/send-rfq`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId: user.id, 
                    vendorIds: distributionType === 'all' ? 'all' : selectedVendors 
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to send RFQ.');
            }

            toast({ title: 'RFQ Sent!', description: 'The requisition is now open for quotations from the selected vendors.' });
            onRfqSent();
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
    
    const filteredVendors = useMemo(() => {
        const verifiedVendors = vendors.filter(v => v.kycStatus === 'Verified');
        if (!vendorSearch) {
            return verifiedVendors;
        }
        const lowercasedSearch = vendorSearch.toLowerCase();
        return verifiedVendors.filter(vendor =>
            vendor.name.toLowerCase().includes(lowercasedSearch) ||
            vendor.email.toLowerCase().includes(lowercasedSearch) ||
            vendor.contactPerson.toLowerCase().includes(lowercasedSearch)
        );
    }, [vendors, vendorSearch]);


    return (
        <Card className="mt-6 border-dashed">
            <CardHeader>
                <CardTitle>RFQ Distribution</CardTitle>
                <CardDescription>
                    This requisition is approved. Send the Request for Quotation to vendors to begin receiving bids.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Select value={distributionType} onValueChange={(v) => setDistributionType(v as any)}>
                    <SelectTrigger className="w-[300px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Send to all verified vendors</SelectItem>
                        <SelectItem value="select">Send to selected vendors</SelectItem>
                    </SelectContent>
                </Select>

                {distributionType === 'select' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Select Vendors</CardTitle>
                            <div className="relative mt-2">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Search vendors..." 
                                    className="pl-8 w-full"
                                    value={vendorSearch}
                                    onChange={(e) => setVendorSearch(e.target.value)}
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-60">
                                <div className="space-y-4">
                                {filteredVendors.map(vendor => (
                                    <div key={vendor.id} className="flex items-start space-x-4 rounded-md border p-4 has-[:checked]:bg-muted">
                                        <Checkbox 
                                            id={`vendor-${vendor.id}`} 
                                            checked={selectedVendors.includes(vendor.id)}
                                            onCheckedChange={(checked) => {
                                                setSelectedVendors(prev => 
                                                    checked ? [...prev, vendor.id] : prev.filter(id => id !== vendor.id)
                                                )
                                            }}
                                            className="mt-1"
                                        />
                                        <div className="flex items-start gap-4 flex-1">
                                            <Avatar>
                                                <AvatarImage src={`https://picsum.photos/seed/${vendor.id}/40/40`} data-ai-hint="logo" />
                                                <AvatarFallback>{vendor.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="grid gap-1">
                                                <Label htmlFor={`vendor-${vendor.id}`} className="font-semibold cursor-pointer">
                                                    {vendor.name}
                                                </Label>
                                                <p className="text-xs text-muted-foreground">{vendor.email}</p>
                                                <p className="text-xs text-muted-foreground">Contact: {vendor.contactPerson}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {filteredVendors.length === 0 && (
                                    <div className="text-center text-muted-foreground py-10">
                                        No vendors found matching your search.
                                    </div>
                                )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                )}
            </CardContent>
            <CardFooter>
                <Button onClick={handleSendRFQ} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Send RFQ
                </Button>
            </CardFooter>
        </Card>
    );
};

const WorkflowStepper = ({ step }: { step: 'rfq' | 'award' | 'finalize' | 'completed' }) => {
     const getStepClass = (currentStep: string, targetStep: string) => {
        const stepOrder = ['rfq', 'award', 'finalize', 'completed'];
        const currentIndex = stepOrder.indexOf(currentStep);
        const targetIndex = stepOrder.indexOf(targetStep);
        if (currentIndex > targetIndex) return 'completed';
        if (currentIndex === targetIndex) return 'active';
        return 'inactive';
    };

    const rfqState = getStepClass(step, 'rfq');
    const awardState = getStepClass(step, 'award');
    const finalizeState = getStepClass(step, 'finalize');

    const stateClasses = {
        active: 'bg-primary text-primary-foreground border-primary',
        completed: 'bg-green-500 text-white border-green-500',
        inactive: 'border-border text-muted-foreground'
    };

    const textClasses = {
        active: 'text-primary',
        completed: 'text-muted-foreground',
        inactive: 'text-muted-foreground'
    }

    return (
        <div className="flex items-center justify-center space-x-2 sm:space-x-4">
            <div className="flex items-center gap-2">
                <div className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold", stateClasses[rfqState])}>
                    {rfqState === 'completed' ? <Check className="h-4 w-4"/> : '1'}
                </div>
                <span className={cn("font-medium", textClasses[rfqState])}>Send RFQ</span>
            </div>
            <div className={cn("h-px w-16 bg-border transition-colors", (awardState === 'active' || awardState === 'completed' || step === 'finalize') && "bg-primary")}></div>
            <div className="flex items-center gap-2">
                <div className={cn("flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold", stateClasses[awardState])}>
                    {awardState === 'completed' ? <Check className="h-4 w-4"/> : '2'}
                </div>
                <span className={cn("font-medium", textClasses[awardState])}>Compare & Award</span>
            </div>
            <div className={cn("h-px w-16 bg-border transition-colors", (finalizeState === 'active' || finalizeState === 'completed' || step === 'completed') && "bg-primary")}></div>
             <div className="flex items-center gap-2">
                <div className={cn("flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold", stateClasses[finalizeState])}>
                    {finalizeState === 'completed' ? <Check className="h-4 w-4"/> : '3'}
                </div>
                <span className={cn("font-medium", textClasses[finalizeState])}>Finalize Contract & PO</span>
            </div>
        </div>
    );
};

type AwardRanking = {
    quoteId: string;
    rank: 1 | 2 | 3;
    status: 'Awarded' | 'Standby';
}

const ManageAwardsDialog = ({ quotes, onAwardsConfirmed, onCancel }: { quotes: Quotation[], onAwardsConfirmed: (updates: any[]) => void, onCancel: () => void }) => {
    const [first, setFirst] = useState<string | undefined>(quotes.find(q => q.rank === 1)?.id);
    const [second, setSecond] = useState<string | undefined>(quotes.find(q => q.rank === 2)?.id);
    const [third, setThird] = useState<string | undefined>(quotes.find(q => q.rank === 3)?.id);

    const availableForSecond = useMemo(() => quotes.filter(q => q.id !== first), [first, quotes]);
    const availableForThird = useMemo(() => quotes.filter(q => q.id !== first && q.id !== second), [first, second, quotes]);

    const handleConfirm = () => {
        const updates = [];
        if (first) updates.push({ quoteId: first, rank: 1, status: 'Awarded' });
        if (second) updates.push({ quoteId: second, rank: 2, status: 'Standby' });
        if (third) updates.push({ quoteId: third, rank: 3, status: 'Standby' });
        
        onAwardsConfirmed(updates);
    }
    
    const isAnyAwarded = quotes.some(q => q.status === 'Awarded');
    
    // Simplified logic for this component: focus on initial award setting.
    // The "reset" flow handles re-awarding.
    if (isAnyAwarded) {
        return (
             <DialogContent>
                 <DialogHeader>
                     <DialogTitle>Awards Managed</DialogTitle>
                     <DialogDescription>An award has already been made for this requisition. To change it, use the "Reset Awards" button.</DialogDescription>
                 </DialogHeader>
                 <DialogFooter>
                    <Button onClick={onCancel}>Close</Button>
                </DialogFooter>
             </DialogContent>
        )
    }

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Manage Quote Awards</DialogTitle>
                <DialogDescription>Select up to 3 vendors for the award and standby positions. Unselected quotes will be rejected.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="grid grid-cols-3 gap-4 items-center">
                    <Label className="text-right">1st Choice (Awarded)</Label>
                    <Select value={first} onValueChange={setFirst}>
                        <SelectTrigger className="col-span-2"><SelectValue placeholder="Select primary vendor"/></SelectTrigger>
                        <SelectContent>
                            {quotes.map(q => <SelectItem key={q.id} value={q.id}>{q.vendorName} ({q.totalPrice.toLocaleString()} ETB)</SelectItem>)}
                        </SelectContent>
                    </Select>

                    {quotes.length > 1 && (
                        <>
                            <Label className="text-right">2nd Choice (Standby)</Label>
                            <Select value={second} onValueChange={setSecond} disabled={!first}>
                                <SelectTrigger className="col-span-2"><SelectValue placeholder="Select backup vendor"/></SelectTrigger>
                                <SelectContent>
                                {availableForSecond.map(q => <SelectItem key={q.id} value={q.id}>{q.vendorName} ({q.totalPrice.toLocaleString()} ETB)</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </>
                    )}
                    
                    {quotes.length > 2 && (
                        <>
                            <Label className="text-right">3rd Choice (Standby)</Label>
                            <Select value={third} onValueChange={setThird} disabled={!first || !second}>
                                <SelectTrigger className="col-span-2"><SelectValue placeholder="Select second backup"/></SelectTrigger>
                                <SelectContent>
                                    {availableForThird.map(q => <SelectItem key={q.id} value={q.id}>{q.vendorName} ({q.totalPrice.toLocaleString()} ETB)</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </>
                    )}
                </div>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                <Button onClick={handleConfirm} disabled={!first}>Confirm Awards</Button>
            </DialogFooter>
        </DialogContent>
    );
};


export default function QuotationDetailsPage() {
  const [requisition, setRequisition] = useState<PurchaseRequisition | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddFormOpen, setAddFormOpen] = useState(false);
  const [isAwardFormOpen, setAwardFormOpen] = useState(false);
  const [lastPOCreated, setLastPOCreated] = useState<PurchaseOrder | null>(null);
  const [aiRecommendation, setAiRecommendation] = useState<QuoteAnalysisOutput | null>(null);
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

  const handleRfqSent = () => {
    fetchRequisitionAndQuotes();
  }

  const handleQuoteAdded = () => {
    setAddFormOpen(false);
    fetchRequisitionAndQuotes();
  }
  
  const handleContractFinalized = () => {
    fetchRequisitionAndQuotes();
  }
  
  const handlePOCreated = (po: PurchaseOrder) => {
    fetchRequisitionAndQuotes();
    setLastPOCreated(po);
  }

  const handleResetAward = async () => {
    if (!user || !id) return;
    setIsChangingAward(true);
    try {
        const response = await fetch(`/api/requisitions/${id}/reset-award`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to reset award.' }));
            throw new Error(errorData.error);
        }

        toast({
            title: `Award Reset`,
            description: 'The award has been reset. You can now select a new quote.'
        });
        fetchRequisitionAndQuotes();
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: error instanceof Error ? error.message : 'An unknown error occurred.',
        });
    } finally {
        setIsChangingAward(false);
    }
  }
  
  const handleAwardsConfirmed = async (updates: any[]) => {
     if (!user || !id) return;
     
     try {
        const response = await fetch(`/api/quotations/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updates, userId: user.id }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update quote statuses.');
        }
        
        toast({
            title: 'Awards Updated',
            description: 'The quote statuses have been successfully updated.'
        });
        setAwardFormOpen(false);
        fetchRequisitionAndQuotes();

     } catch (error) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: error instanceof Error ? error.message : 'An unknown error occurred.',
        });
     }
  }

  if (loading) {
     return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  if (!requisition) {
     return <div className="text-center p-8">Requisition not found.</div>;
  }
  
  const getCurrentStep = (): 'rfq' | 'award' | 'finalize' | 'completed' => {
    if (requisition.status === 'Approved') return 'rfq';
    if (isAwarded) {
        if (requisition.status === 'PO Created') return 'completed';
        return 'finalize';
    }
    return 'award';
  };
  const currentStep = getCurrentStep();

  return (
    <div className="space-y-6">
        <Button variant="outline" onClick={() => router.push('/quotations')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to All Requisitions
        </Button>
        
        <Card className="p-4 sm:p-6">
            <WorkflowStepper step={currentStep} />
        </Card>

        {requisition.status === 'Approved' && (
            <RFQDistribution requisition={requisition} vendors={vendors} onRfqSent={handleRfqSent} />
        )}

        {(currentStep === 'award' || currentStep === 'finalize' || currentStep === 'completed') && (
            <Card>
                <CardHeader className="flex flex-row items-start sm:items-center justify-between">
                    <div>
                        <CardTitle>Quotations for {requisition.id}</CardTitle>
                        <CardDescription>
                            {requisition.title}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        {isAwarded && requisition.status !== 'PO Created' && (
                            <Button variant="outline" onClick={handleResetAward} disabled={isChangingAward}>
                                {isChangingAward ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Undo className="mr-2 h-4 w-4"/>}
                                Reset Awards
                            </Button>
                        )}
                         <Dialog open={isAwardFormOpen} onOpenChange={setAwardFormOpen}>
                            <DialogTrigger asChild>
                                 <Button disabled={requisition.status === 'PO Created' || isAwarded}>
                                    <Award className="mr-2 h-4 w-4" />
                                    Manage Awards
                                </Button>
                            </DialogTrigger>
                            <ManageAwardsDialog quotes={quotations} onAwardsConfirmed={handleAwardsConfirmed} onCancel={() => setAwardFormOpen(false)} />
                         </Dialog>
                        <Dialog open={isAddFormOpen} onOpenChange={setAddFormOpen}>
                            <DialogTrigger asChild>
                                <Button disabled={isAwarded} variant="outline"><PlusCircle className="mr-2 h-4 w-4"/>Add Quote</Button>
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
                        recommendation={aiRecommendation}
                    />
                )}
                </CardContent>
            </Card>
        )}
        
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

    </div>
  );
}
