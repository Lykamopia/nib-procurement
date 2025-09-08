

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
import { Loader2, PlusCircle, Award, XCircle, FileSignature, FileText, Bot, Lightbulb, ArrowLeft, Star, Undo, Check, Send, Search, BadgeHelp, BadgeCheck, BadgeX, Crown, Medal, Trophy, RefreshCw, TimerOff, ClipboardList, TrendingUp, Scale, Edit2, Users, GanttChart, Eye, CheckCircle, CalendarIcon, Timer } from 'lucide-react';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PurchaseOrder, PurchaseRequisition, Quotation, Vendor, QuotationStatus, EvaluationCriteria, User, CommitteeScoreSet } from '@/lib/types';
import { format, formatDistanceToNow, isBefore, isPast } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/auth-context';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { analyzeQuotes } from '@/ai/flows/quote-analysis';
import type { QuoteAnalysisInput, QuoteAnalysisOutput } from '@/ai/flows/quote-analysis.types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { RequisitionDetailsDialog } from '@/components/requisition-details-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

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

const QuoteComparison = ({ quotes, requisition, recommendation, onScore, user, isDeadlinePassed }: { quotes: Quotation[], requisition: PurchaseRequisition, recommendation?: QuoteAnalysisOutput | null, onScore: (quote: Quotation) => void, user: User, isDeadlinePassed: boolean }) => {
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
            case 'Accepted': return 'default';
            case 'Standby': return 'secondary';
            case 'Submitted': return 'outline';
            case 'Rejected': return 'destructive';
            case 'Declined': return 'destructive';
            case 'Failed': return 'destructive';
            case 'Invoice Submitted': return 'outline';
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
                const hasUserScored = quote.scores?.some(s => s.scorerId === user.id);
                return (
                    <Card key={quote.id} className={cn("flex flex-col", (quote.status === 'Awarded' || quote.status === 'Accepted') && 'border-primary ring-2 ring-primary')}>
                       <CardHeader>
                            <CardTitle className="flex justify-between items-start">
                               <div className="flex items-center gap-2">
                                 {isDeadlinePassed && getRankIcon(quote.rank)}
                                 <span>{quote.vendorName}</span>
                               </div>
                               <Badge variant={getStatusVariant(quote.status)}>{quote.status}</Badge>
                            </CardTitle>
                            <CardDescription>
                                {isDeadlinePassed && isRecommended && (
                                     <span className="flex items-center gap-1 text-xs text-green-600 font-semibold"><Star className="h-3 w-3 fill-green-500" /> AI Rec #{aiRank + 1}</span>
                                )}
                                <span className="text-xs">Submitted {formatDistanceToNow(new Date(quote.createdAt), { addSuffix: true })}</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-4">
                             {isDeadlinePassed ? (
                                <>
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
                                </>
                            ) : (
                                <div className="text-center py-8">
                                    <TimerOff className="h-8 w-8 mx-auto text-muted-foreground" />
                                    <p className="font-semibold mt-2">Details Masked</p>
                                    <p className="text-sm text-muted-foreground">Revealed after {format(new Date(requisition.deadline!), 'PP')}</p>
                                </div>
                            )}

                            {isDeadlinePassed && quote.notes && (
                                <div className="text-sm space-y-1 pt-2 border-t">
                                    <h4 className="font-semibold">Notes:</h4>
                                    <p className="text-muted-foreground text-xs italic">{quote.notes}</p>
                                </div>
                            )}
                             {isDeadlinePassed && quote.finalAverageScore !== undefined && (
                                 <div className="text-center pt-2 border-t">
                                    <h4 className="font-semibold text-sm">Final Score</h4>
                                    <p className="text-2xl font-bold text-primary">{quote.finalAverageScore.toFixed(2)}</p>
                                 </div>
                             )}
                        </CardContent>
                        {user.role === 'Committee Member' && (
                            <CardFooter>
                                <Button className="w-full" variant={hasUserScored ? "secondary" : "outline"} onClick={() => onScore(quote)} disabled={!isDeadlinePassed}>
                                    {hasUserScored ? <Check className="mr-2 h-4 w-4"/> : <Edit2 className="mr-2 h-4 w-4" />}
                                    {hasUserScored ? 'View Your Score' : 'Score this Quote'}
                                </Button>
                            </CardFooter>
                        )}
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
            <CardContent className="flex flex-col sm:flex-row items-center gap-4">
                 <Select value={metric} onValueChange={(v) => setMetric(v as any)}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Select a metric" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Best Balance">Best Balance</SelectItem>
                        <SelectItem value="Lowest Price">Lowest Price</SelectItem>
                        <SelectItem value="Fastest Delivery">Fastest Delivery</SelectItem>
                    </SelectContent>
                </Select>
                <Button onClick={handleAnalysis} disabled={loading || quotes.length < 2} className="w-full sm:w-auto">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Get AI Recommendation
                </Button>
            </CardContent>
        </Card>
    )
}


const ContractManagement = ({ requisition }: { requisition: PurchaseRequisition }) => {
    const [isSubmitting, setSubmitting] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();

    const awardedQuote = requisition.quotations?.find(q => q.status === 'Accepted');

    const onContractSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!user || !awardedQuote) return;
        setSubmitting(true);
        // This is a simplified submission. In a real app, you'd handle file uploads.
        const fileName = (event.target as any).fileName.value;
        const notes = (event.target as any).notes.value;

        try {
            const response = await fetch(`/api/requisitions/${requisition.id}/contract`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName, notes, userId: user.id }),
            });
            if (!response.ok) throw new Error("Failed to save contract details.");
            toast({ title: "Contract Details Saved!", description: "The PO can now be formally sent to the vendor." });
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
    
    if (!awardedQuote) return null;

    return (
        <Card className="mt-6 border-primary/50">
            <CardHeader>
                <CardTitle>Contract & PO Finalization</CardTitle>
                <CardDescription>
                    The vendor <span className="font-semibold">{awardedQuote?.vendorName}</span> has accepted the award. 
                    A PO (<span className="font-mono">{requisition.purchaseOrderId}</span>) has been generated. Please finalize and send the documents.
                </CardDescription>
            </CardHeader>
            <form onSubmit={onContractSubmit}>
                <CardContent className="space-y-4">
                     <div>
                        <Label htmlFor="fileName">Final Contract Document</Label>
                        <Input id="fileName" name="fileName" type="file" />
                    </div>
                    <div>
                        <Label htmlFor="notes">Negotiation & Finalization Notes</Label>
                        <Textarea id="notes" name="notes" rows={5} placeholder="Record key negotiation points, final terms, etc." />
                    </div>
                </CardContent>
                <CardFooter className="flex-col sm:flex-row justify-between gap-2">
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSignature className="mr-2 h-4 w-4" />}
                        Save Contract Details
                    </Button>
                    <Button asChild variant="secondary">
                        <Link href={`/purchase-orders/${requisition.purchaseOrderId}`} target="_blank">View Purchase Order</Link>
                    </Button>
                </CardFooter>
            </form>
        </Card>
    )
}

const committeeFormSchema = z.object({
  committeeName: z.string().min(3, "Committee name is required."),
  committeePurpose: z.string().min(10, "Purpose is required."),
  committeeMemberIds: z.array(z.string()).min(1, "At least one member is required."),
  scoringDeadline: z.date().optional(),
});

type CommitteeFormValues = z.infer<typeof committeeFormSchema>;

const CommitteeManagement = ({ requisition, onCommitteeUpdated }: { requisition: PurchaseRequisition; onCommitteeUpdated: () => void; }) => {
    const { user, allUsers } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setSubmitting] = useState(false);
    const [isCommitteeDialogOpen, setCommitteeDialogOpen] = useState(false);
    const [committeeSearch, setCommitteeSearch] = useState("");

    const form = useForm<CommitteeFormValues>({
        resolver: zodResolver(committeeFormSchema),
        defaultValues: {
            committeeName: requisition.committeeName || "",
            committeePurpose: requisition.committeePurpose || "",
            committeeMemberIds: requisition.committeeMemberIds || [],
            scoringDeadline: requisition.scoringDeadline ? new Date(requisition.scoringDeadline) : undefined,
        },
    });

    useEffect(() => {
        form.reset({
            committeeName: requisition.committeeName || "",
            committeePurpose: requisition.committeePurpose || "",
            committeeMemberIds: requisition.committeeMemberIds || [],
            scoringDeadline: requisition.scoringDeadline ? new Date(requisition.scoringDeadline) : undefined,
        });
    }, [requisition, form]);

    const handleSaveCommittee = async (values: CommitteeFormValues) => {
        if (!user) return;
        setSubmitting(true);
        try {
            const response = await fetch(`/api/requisitions/${requisition.id}/assign-committee`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId: user.id, 
                    ...values
                }),
            });
            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.error || 'Failed to assign committee.');
            }

            toast({ title: 'Committee Updated!', description: 'The evaluation committee has been updated.' });
            setCommitteeDialogOpen(false);
            onCommitteeUpdated();
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
    
    const committeeMembers = allUsers.filter(u => u.role === 'Committee Member');
    const assignedMembers = allUsers.filter(u => requisition.committeeMemberIds?.includes(u.id));

     const filteredCommitteeMembers = useMemo(() => {
        if (!committeeSearch) {
            return committeeMembers;
        }
        const lowercasedSearch = committeeSearch.toLowerCase();
        return committeeMembers.filter(member =>
            member.name.toLowerCase().includes(lowercasedSearch) ||
            member.email.toLowerCase().includes(lowercasedSearch)
        );
    }, [committeeMembers, committeeSearch]);

    const selectedCommittee = form.watch('committeeMemberIds');


    return (
        <Card className="border-dashed">
            <CardHeader className="flex flex-col sm:flex-row items-start justify-between gap-2">
                <div>
                    <CardTitle>Evaluation Committee</CardTitle>
                     <CardDescription>
                         {requisition.scoringDeadline ? `Scoring Deadline: ${format(new Date(requisition.scoringDeadline), 'PP')}` : 'Assign a committee to evaluate quotations.'}
                    </CardDescription>
                </div>
                 <Dialog open={isCommitteeDialogOpen} onOpenChange={setCommitteeDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="w-full sm:w-auto">
                            {requisition.committeeMemberIds && requisition.committeeMemberIds.length > 0 ? (
                                <><Edit2 className="mr-2 h-4 w-4" /> Edit Committee</>
                            ) : (
                                <><Users className="mr-2 h-4 w-4" /> Assign Committee</>
                            )}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Evaluation Committee</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSaveCommittee)} className="space-y-4">
                             <div className="grid md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="committeeName"
                                    render={({ field }) => (
                                        <FormItem><FormLabel>Committee Name</FormLabel><FormControl><Input {...field} placeholder="e.g., Q4 Laptop Procurement Committee" /></FormControl><FormMessage /></FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="scoringDeadline"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col pt-2">
                                            <FormLabel>Committee Scoring Deadline</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                        "w-full pl-3 text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value ? (
                                                        format(field.value, "PPP")
                                                        ) : (
                                                        <span>Set a scoring deadline</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    disabled={(date) => date < new Date()}
                                                    initialFocus
                                                />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="committeePurpose"
                                render={({ field }) => (
                                    <FormItem><FormLabel>Purpose / Mandate</FormLabel><FormControl><Textarea {...field} placeholder="e.g., To evaluate vendor submissions for REQ-..." /></FormControl><FormMessage /></FormItem>
                                )}
                            />

                             <div className="relative pt-2">
                                <FormLabel>Members</FormLabel>
                                <Search className="absolute left-2.5 top-11 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Search members by name or email..." 
                                    className="pl-8 w-full mt-2"
                                    value={committeeSearch}
                                    onChange={(e) => setCommitteeSearch(e.target.value)}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="committeeMemberIds"
                                render={() => (
                                <FormItem>
                                    <ScrollArea className="h-60 rounded-md border">
                                        <div className="space-y-2 p-1">
                                        {filteredCommitteeMembers.map(member => (
                                            <FormField
                                                key={member.id}
                                                control={form.control}
                                                name="committeeMemberIds"
                                                render={({ field }) => (
                                                    <FormItem className="flex items-start space-x-4 rounded-md border p-3 has-[:checked]:bg-muted">
                                                         <FormControl>
                                                            <Checkbox
                                                                checked={field.value?.includes(member.id)}
                                                                onCheckedChange={(checked) => {
                                                                    return checked
                                                                    ? field.onChange([...field.value, member.id])
                                                                    : field.onChange(field.value?.filter((id) => id !== member.id))
                                                                }}
                                                            />
                                                        </FormControl>
                                                        <div className="flex items-start gap-3 flex-1">
                                                            <Avatar>
                                                                <AvatarImage src={`https://picsum.photos/seed/${member.id}/40/40`} data-ai-hint="profile picture" />
                                                                <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="grid gap-0.5">
                                                                <Label className="font-normal cursor-pointer">{member.name}</Label>
                                                                <p className="text-xs text-muted-foreground">{member.email}</p>
                                                            </div>
                                                        </div>
                                                    </FormItem>
                                                )}
                                            />
                                        ))}
                                        {filteredCommitteeMembers.length === 0 && (
                                                <div className="text-center text-muted-foreground py-10">No committee members found.</div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                    <FormMessage />
                                </FormItem>
                                )}
                             />
                            <DialogFooter>
                                <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    Save Committee
                                </Button>
                            </DialogFooter>
                        </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            {requisition.committeeMemberIds && requisition.committeeMemberIds.length > 0 && (
                <CardContent>
                    <p className="text-sm text-muted-foreground italic mb-4">"{requisition.committeePurpose}"</p>
                    <div className="flex flex-wrap gap-4">
                        {assignedMembers.map(member => (
                            <div key={member.id} className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={`https://picsum.photos/seed/${member.id}/40/40`} data-ai-hint="profile picture" />
                                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium">{member.name}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            )}
        </Card>
    );
};


const RFQDistribution = ({ requisition, vendors, onRfqSent }: { requisition: PurchaseRequisition; vendors: Vendor[]; onRfqSent: () => void; }) => {
    const [distributionType, setDistributionType] = useState<'all' | 'select'>('all');
    const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
    const [vendorSearch, setVendorSearch] = useState('');
    const [isSubmitting, setSubmitting] = useState(false);
    const [deadline, setDeadline] = useState<Date | undefined>(requisition.deadline ? new Date(requisition.deadline) : undefined);
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
                    vendorIds: distributionType === 'all' ? 'all' : selectedVendors,
                    deadline
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
        <Card className="mt-6">
            <CardHeader>
                <CardTitle>RFQ Distribution</CardTitle>
                <CardDescription>
                    Send the Request for Quotation to vendors to begin receiving bids.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>Distribution Type</Label>
                        <Select value={distributionType} onValueChange={(v) => setDistributionType(v as any)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Send to all verified vendors</SelectItem>
                                <SelectItem value="select">Send to selected vendors</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label>Quotation Submission Deadline</Label>
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !deadline && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {deadline ? format(deadline, "PPP") : <span>Set a deadline</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={deadline}
                                    onSelect={setDeadline}
                                    disabled={(date) => date < new Date()}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

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
                <Button onClick={handleSendRFQ} disabled={isSubmitting || !requisition.committeeMemberIds || requisition.committeeMemberIds.length === 0}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Send RFQ
                </Button>
                 {!requisition.committeeMemberIds || requisition.committeeMemberIds.length === 0 && (
                    <p className="text-xs text-muted-foreground ml-4">An evaluation committee must be assigned before sending the RFQ.</p>
                )}
            </CardFooter>
        </Card>
    );
};

const WorkflowStepper = ({ step }: { step: 'committee' | 'rfq' | 'award' | 'finalize' | 'completed' }) => {
     const getStepClass = (currentStep: string, targetStep: string) => {
        const stepOrder = ['committee', 'rfq', 'award', 'finalize', 'completed'];
        const currentIndex = stepOrder.indexOf(currentStep);
        const targetIndex = stepOrder.indexOf(targetStep);
        if (currentIndex > targetIndex) return 'completed';
        if (currentIndex === targetIndex) return 'active';
        return 'inactive';
    };

    const committeeState = getStepClass(step, 'committee');
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
        <div className="flex items-center justify-center space-x-1 sm:space-x-2 flex-wrap">
            <div className="flex items-center gap-2">
                <div className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold", stateClasses[committeeState])}>
                    {committeeState === 'completed' ? <Check className="h-4 w-4"/> : '1'}
                </div>
                <span className={cn("font-medium", textClasses[committeeState])}>Assign Committee</span>
            </div>
             <div className={cn("h-px flex-1 bg-border transition-colors", (rfqState === 'active' || rfqState === 'completed') && "bg-primary")}></div>

            <div className="flex items-center gap-2">
                <div className={cn("flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold", stateClasses[rfqState])}>
                    {rfqState === 'completed' ? <Check className="h-4 w-4"/> : '2'}
                </div>
                <span className={cn("font-medium", textClasses[rfqState])}>Send RFQ</span>
            </div>
             <div className={cn("h-px flex-1 bg-border transition-colors", (awardState === 'active' || awardState === 'completed') && "bg-primary")}></div>

            <div className="flex items-center gap-2">
                <div className={cn("flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold", stateClasses[awardState])}>
                    {awardState === 'completed' ? <Check className="h-4 w-4"/> : '3'}
                </div>
                <span className={cn("font-medium", textClasses[awardState])}>Score & Award</span>
            </div>
            <div className={cn("h-px flex-1 bg-border transition-colors", (finalizeState === 'active' || finalizeState === 'completed') && "bg-primary")}></div>
             <div className="flex items-center gap-2">
                <div className={cn("flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold", stateClasses[finalizeState])}>
                    {finalizeState === 'completed' ? <Check className="h-4 w-4"/> : '4'}
                </div>
                <span className={cn("font-medium", textClasses[finalizeState])}>Finalize</span>
            </div>
        </div>
    );
};

const scoreFormSchema = z.object({
  committeeComment: z.string().optional(),
  financialScores: z.array(z.object({
      criterionId: z.string(),
      score: z.coerce.number().min(0, "Min score is 0").max(100, "Max score is 100"),
      comment: z.string().optional()
  })),
  technicalScores: z.array(z.object({
      criterionId: z.string(),
      score: z.coerce.number().min(0, "Min score is 0").max(100, "Max score is 100"),
      comment: z.string().optional()
  })),
});
type ScoreFormValues = z.infer<typeof scoreFormSchema>;


const clientSideScoreCalculator = (scores: ScoreFormValues, criteria: EvaluationCriteria): number => {
    if (!criteria) return 0;
    
    let totalFinancialScore = 0;
    let totalTechnicalScore = 0;

    criteria.financialCriteria.forEach((c) => {
        const score = scores.financialScores.find(s => s.criterionId === c.id)?.score || 0;
        totalFinancialScore += score * (c.weight / 100);
    });

    criteria.technicalCriteria.forEach((c) => {
        const score = scores.technicalScores.find(s => s.criterionId === c.id)?.score || 0;
        totalTechnicalScore += score * (c.weight / 100);
    });

    const finalScore = (totalFinancialScore * (criteria.financialWeight / 100)) + 
                       (totalTechnicalScore * (criteria.technicalWeight / 100));

    return finalScore;
}


const ScoringDialog = ({ 
    quote, 
    requisition, 
    user, 
    onScoreSubmitted 
}: { 
    quote: Quotation; 
    requisition: PurchaseRequisition; 
    user: User; 
    onScoreSubmitted: () => void;
}) => {
    const { toast } = useToast();
    const [isSubmitting, setSubmitting] = useState(false);
    const existingScore = useMemo(() => quote.scores?.find(s => s.scorerId === user.id), [quote.scores, user.id]);

    const form = useForm<ScoreFormValues>({
        resolver: zodResolver(scoreFormSchema),
        defaultValues: {
            committeeComment: existingScore?.committeeComment || "",
            financialScores: requisition.evaluationCriteria?.financialCriteria.map(c => {
                const existing = existingScore?.financialScores.find(s => s.criterionId === c.id);
                return { criterionId: c.id, score: existing?.score || 0, comment: existing?.comment || "" };
            }) || [],
            technicalScores: requisition.evaluationCriteria?.technicalCriteria.map(c => {
                const existing = existingScore?.technicalScores.find(s => s.criterionId === c.id);
                return { criterionId: c.id, score: existing?.score || 0, comment: existing?.comment || "" };
            }) || [],
        },
    });

    const onSubmit = async (values: ScoreFormValues) => {
        setSubmitting(true);
        try {
            const response = await fetch(`/api/quotations/${quote.id}/score`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scores: values, userId: user.id }),
            });
             if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to submit scores.');
            }

            toast({ title: "Scores Submitted", description: "Your evaluation has been recorded." });
            onScoreSubmitted();

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
    
    if (!requisition.evaluationCriteria) return null;

    const renderCriteria = (type: 'financial' | 'technical') => {
        const criteria = type === 'financial' ? requisition.evaluationCriteria!.financialCriteria : requisition.evaluationCriteria!.technicalCriteria;
        return criteria.map((criterion, index) => (
            <div key={criterion.id} className="space-y-2 rounded-md border p-4">
                <div className="flex justify-between items-center">
                    <FormLabel>{criterion.name}</FormLabel>
                    <Badge variant="secondary">Weight: {criterion.weight}%</Badge>
                </div>
                 <FormField
                    control={form.control}
                    name={`${type}Scores.${index}.score`}
                    render={({ field }) => (
                         <FormItem>
                            <FormControl>
                                <div className="flex items-center gap-4">
                                <Slider
                                    defaultValue={[field.value]}
                                    max={100}
                                    step={5}
                                    onValueChange={(v) => field.onChange(v[0])}
                                    disabled={!!existingScore}
                                />
                                <Input type="number" {...field} className="w-24" disabled={!!existingScore} />
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                 />
                 <FormField
                    control={form.control}
                    name={`${type}Scores.${index}.comment`}
                    render={({ field }) => (
                         <FormItem>
                             <FormControl>
                                <Textarea placeholder="Optional comment for this criterion..." {...field} rows={2} disabled={!!existingScore} />
                             </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                 />
            </div>
        ));
    };
    
    const currentValues = form.watch();
    const calculatedScore = clientSideScoreCalculator(currentValues, requisition.evaluationCriteria);

    return (
         <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Score Quotation from {quote.vendorName}</DialogTitle>
                <DialogDescription>Evaluate this quote against the requester's criteria. Your scores will be combined with other committee members' to determine the final ranking.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="h-[60vh] p-1">
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Scale /> Financial Evaluation ({requisition.evaluationCriteria.financialWeight}%)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             {renderCriteria('financial')}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <TrendingUp /> Technical Evaluation ({requisition.evaluationCriteria.technicalWeight}%)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {renderCriteria('technical')}
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader><CardTitle className="text-xl">Overall Comment</CardTitle></CardHeader>
                        <CardContent>
                             <FormField
                                control={form.control}
                                name="committeeComment"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Textarea placeholder="Provide an overall summary or justification for your scores..." {...field} rows={4} disabled={!!existingScore} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                             />
                        </CardContent>
                    </Card>
                </div>
            </ScrollArea>
             <DialogFooter className="pt-4 flex items-center justify-between">
                <Button type="button" onClick={() => form.reset()} variant="ghost">Reset Form</Button>
                 {existingScore ? (
                    <p className="text-sm text-muted-foreground">You have already scored this quote.</p>
                 ) : (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button type="button">
                                Submit Score
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Your Score</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Please review your evaluation before submitting. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <Card className="my-4">
                                <CardContent className="pt-6 space-y-2">
                                    <div className="flex justify-between items-center text-lg">
                                        <span className="font-semibold">Calculated Final Score:</span>
                                        <span className="text-2xl font-bold text-primary">{calculatedScore.toFixed(2)} / 100</span>
                                    </div>
                                     <div className="text-sm text-muted-foreground italic">
                                        <p className="font-semibold">Your Comment:</p>
                                        <p>"{currentValues.committeeComment || 'No comment provided.'}"</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Go Back & Edit</AlertDialogCancel>
                                <AlertDialogAction onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
                                     {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Confirm & Submit
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                 )}
            </DialogFooter>
            </form>
            </Form>
        </DialogContent>
    );
};

const ScoringProgressTracker = ({
  requisition,
  quotations,
  allUsers,
  onFinalize,
  isFinalizing
}: {
  requisition: PurchaseRequisition;
  quotations: Quotation[];
  allUsers: User[];
  onFinalize: (awardResponseDeadline?: Date) => void;
  isFinalizing: boolean;
}) => {
    const [awardResponseDeadline, setAwardResponseDeadline] = useState<Date | undefined>();

    const assignedCommitteeMembers = useMemo(() => {
        return allUsers.filter(u => requisition.committeeMemberIds?.includes(u.id));
    }, [allUsers, requisition.committeeMemberIds]);

    const scoringStatus = useMemo(() => {
        return assignedCommitteeMembers.map(member => {
            const hasScoredAll = quotations.every(quote => quote.scores?.some(score => score.scorerId === member.id));
            const firstScore = quotations
                .flatMap(q => q.scores || [])
                .filter(s => s.scorerId === member.id)
                .sort((a,b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime())[0];

            return {
                ...member,
                hasScoredAll,
                submittedAt: hasScoredAll ? firstScore?.submittedAt : null,
            };
        }).sort((a, b) => {
             if (a.submittedAt && b.submittedAt) return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
             if (a.submittedAt) return -1;
             if (b.submittedAt) return 1;
             return 0;
        });
    }, [assignedCommitteeMembers, quotations]);

    const allHaveScored = scoringStatus.every(s => s.hasScoredAll);

    return (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><GanttChart /> Scoring Progress</CardTitle>
                <CardDescription>Track the committee's scoring progress. The award can be finalized once all members have submitted their scores for all quotations.</CardDescription>
            </CardHeader>
            <CardContent>
                <ul className="space-y-3">
                    {scoringStatus.map(member => (
                        <li key={member.id} className="flex items-center justify-between p-3 rounded-md border">
                           <div className="flex items-center gap-3">
                                <Avatar>
                                    <AvatarImage src={`https://picsum.photos/seed/${member.id}/40/40`} data-ai-hint="profile picture" />
                                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold">{member.name}</p>
                                    <p className="text-xs text-muted-foreground">{member.email}</p>
                                </div>
                           </div>
                            {member.hasScoredAll && member.submittedAt ? (
                                <div className="text-right">
                                    <Badge variant="default" className="bg-green-600"><Check className="mr-1 h-3 w-3" /> Submitted</Badge>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {formatDistanceToNow(new Date(member.submittedAt), { addSuffix: true })}
                                    </p>
                                </div>
                            ) : (
                                 <Badge variant="secondary">Pending</Badge>
                            )}
                        </li>
                    ))}
                </ul>
            </CardContent>
            <CardFooter>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button disabled={!allHaveScored || isFinalizing}>
                            {isFinalizing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Finalize Scores & Award
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Finalize Awards?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will tally all scores and automatically assign statuses. Set a deadline for the winning vendor to respond.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                         <div className="py-4">
                            <Label htmlFor='award-response-deadline'>Award Response Deadline</Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="award-response-deadline"
                                        variant={"outline"}
                                        className={cn(
                                        "w-full justify-start text-left font-normal mt-2",
                                        !awardResponseDeadline && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {awardResponseDeadline ? format(awardResponseDeadline, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={awardResponseDeadline}
                                        onSelect={setAwardResponseDeadline}
                                        disabled={(date) => date < new Date()}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onFinalize(awardResponseDeadline)} disabled={!awardResponseDeadline}>
                                Proceed
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
        </Card>
    );
}

export default function QuotationDetailsPage() {
  const [requisition, setRequisition] = useState<PurchaseRequisition | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddFormOpen, setAddFormOpen] = useState(false);
  const [isScoringFormOpen, setScoringFormOpen] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [selectedQuoteForScoring, setSelectedQuoteForScoring] = useState<Quotation | null>(null);
  const [lastPOCreated, setLastPOCreated] = useState<PurchaseOrder | null>(null);
  const [aiRecommendation, setAiRecommendation] = useState<QuoteAnalysisOutput | null>(null);
  const [isChangingAward, setIsChangingAward] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const { toast } = useToast();
  const { user, allUsers } = useAuth();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const isAwarded = quotations.some(q => q.status === 'Awarded' || q.status === 'Accepted' || q.status === 'Declined');
  const isAccepted = quotations.some(q => q.status === 'Accepted');
  const secondStandby = useMemo(() => quotations.find(q => q.rank === 2), [quotations]);
  const thirdStandby = useMemo(() => quotations.find(q => q.rank === 3), [quotations]);

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
  }, [id, toast]);

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
  
   const handleFinalizeScores = async (awardResponseDeadline?: Date) => {
        if (!user || !requisition) return;
        setIsFinalizing(true);
        try {
             const response = await fetch(`/api/requisitions/${requisition.id}/finalize-scores`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, awardResponseDeadline }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to finalize scores.');
            }
            toast({ title: 'Success', description: 'Scores have been finalized and awards distributed.' });
            fetchRequisitionAndQuotes();
        } catch(error) {
             toast({
                variant: 'destructive',
                title: 'Error',
                description: error instanceof Error ? error.message : 'An unknown error occurred.',
            });
        } finally {
            setIsFinalizing(false);
        }
    }


  const handleAwardChange = async (action: 'promote_second' | 'promote_third' | 'restart_rfq') => {
    if (!user || !id) return;
    setIsChangingAward(true);
    try {
        const response = await fetch(`/api/requisitions/${id}/handle-award-change`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, action }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to handle award change.' }));
            throw new Error(errorData.error);
        }

        toast({
            title: `Action Successful`,
            description: `The award status has been updated.`
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

  const handleScoreButtonClick = (quote: Quotation) => {
    setSelectedQuoteForScoring(quote);
    setScoringFormOpen(true);
  }
  
  const handleScoreSubmitted = () => {
      setScoringFormOpen(false);
      setSelectedQuoteForScoring(null);
      fetchRequisitionAndQuotes();
  }

  if (loading || !user) {
     return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  if (!requisition) {
     return <div className="text-center p-8">Requisition not found.</div>;
  }
  
  const getCurrentStep = (): 'committee' | 'rfq' | 'award' | 'finalize' | 'completed' => {
      if (requisition.status === 'Approved') {
        if (!requisition.committeeMemberIds || requisition.committeeMemberIds.length === 0) {
            return 'committee';
        }
        return 'rfq';
    }
    if (isAccepted) {
        if (requisition.status === 'PO Created') return 'completed';
        return 'finalize';
    }
    return 'award';
  };
  const currentStep = getCurrentStep();
  
  const isDeadlinePassed = requisition.deadline ? !isBefore(new Date(), new Date(requisition.deadline)) : true;
  
    const formatEvaluationCriteria = (criteria?: EvaluationCriteria) => {
        if (!criteria) return "No specific criteria defined.";

        const formatSection = (title: string, weight: number, items: any[]) => {
            if (!items || items.length === 0) return `${title} (Overall Weight: ${weight}%):\n- No criteria defined.`;
            const itemDetails = items.map(item => `- ${item.name} (${item.weight}%)`).join('\n');
            return `${title} (Overall Weight: ${weight}%):\n${itemDetails}`;
        };

        const financialPart = formatSection(
            'Financial Criteria',
            criteria.financialWeight,
            criteria.financialCriteria
        );

        const technicalPart = formatSection(
            'Technical Criteria',
            criteria.technicalWeight,
            criteria.technicalCriteria
        );

        return `${financialPart}\n\n${technicalPart}`;
    };


  return (
    <div className="space-y-6">
        <Button variant="outline" onClick={() => router.push('/quotations')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to All Requisitions
        </Button>
        
        <Card className="p-4 sm:p-6">
            <WorkflowStepper step={currentStep} />
        </Card>
        
        {requisition.evaluationCriteria && (
            <Card>
                 <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2"><ClipboardList /> Evaluation Criteria</CardTitle>
                        <CardDescription>The following criteria were set by the requester to guide quote evaluation.</CardDescription>
                    </div>
                     <Button variant="outline" onClick={() => setIsDetailsOpen(true)} className="w-full sm:w-auto">
                        <Eye className="mr-2 h-4 w-4" />
                        View Requisition Details
                    </Button>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-md whitespace-pre-wrap">{formatEvaluationCriteria(requisition.evaluationCriteria)}</p>
                </CardContent>
            </Card>
        )}

        {currentStep === 'committee' && (user.role === 'Procurement Officer' || user.role === 'Committee') && (
             <CommitteeManagement
                    requisition={requisition} 
                    onCommitteeUpdated={fetchRequisitionAndQuotes}
                />
        )}


        {currentStep === 'rfq' && (user.role === 'Procurement Officer' || user.role === 'Committee') && (
            <div className="grid md:grid-cols-2 gap-6 items-start">
                 <CommitteeManagement
                    requisition={requisition} 
                    onCommitteeUpdated={fetchRequisitionAndQuotes}
                />
                <RFQDistribution 
                    requisition={requisition} 
                    vendors={vendors} 
                    onRfqSent={fetchRequisitionAndQuotes}
                />
            </div>
        )}

        {(currentStep === 'award' || currentStep === 'finalize' || currentStep === 'completed') && (
            <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Quotations for {requisition.id}</CardTitle>
                        <CardDescription>{requisition.title}</CardDescription>
                         <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                             {requisition.deadline && (
                                <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-muted-foreground">QUOTE DEADLINE:</span>
                                    <span className="font-medium text-foreground">{format(new Date(requisition.deadline), 'PP')}</span>
                                </div>
                            )}
                             {requisition.scoringDeadline && (
                                <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-muted-foreground">SCORING DEADLINE:</span>
                                    <span className="font-medium text-foreground">{format(new Date(requisition.scoringDeadline), 'PP')}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        {isAwarded && requisition.status !== 'PO Created' && user.role === 'Procurement Officer' && (
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" disabled={isChangingAward} className="w-full">
                                        {isChangingAward ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Undo className="mr-2 h-4 w-4"/>}
                                        Change Award Decision
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Change Award Decision</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            The primary awarded vendor may have failed to deliver. Choose how to proceed. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <div className="flex flex-col gap-4 py-4">
                                        <Button onClick={() => handleAwardChange('promote_second')} disabled={!secondStandby}>
                                            Award to 2nd Vendor ({secondStandby?.vendorName})
                                        </Button>
                                        <Button onClick={() => handleAwardChange('promote_third')} disabled={!thirdStandby}>
                                            Award to 3rd Vendor ({thirdStandby?.vendorName})
                                        </Button>
                                        <Button onClick={() => handleAwardChange('restart_rfq')} variant="destructive">
                                            <RefreshCw className="mr-2 h-4 w-4"/>
                                            Restart RFQ Process
                                        </Button>
                                    </div>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                        {user.role !== 'Committee Member' && (
                             <Dialog open={isAddFormOpen} onOpenChange={setAddFormOpen}>
                                <DialogTrigger asChild>
                                    <Button disabled={isAwarded} variant="outline" className="w-full"><PlusCircle className="mr-2 h-4 w-4"/>Add Quote</Button>
                                </DialogTrigger>
                                {requisition && <AddQuoteForm requisition={requisition} vendors={vendors} onQuoteAdded={handleQuoteAdded} />}
                            </Dialog>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {isDeadlinePassed && quotations.length > 1 && !isAwarded && (
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
                        requisition={requisition}
                        recommendation={aiRecommendation}
                        onScore={handleScoreButtonClick}
                        user={user}
                        isDeadlinePassed={isDeadlinePassed}
                    />
                )}
                </CardContent>
                 <Dialog open={isScoringFormOpen} onOpenChange={setScoringFormOpen}>
                    {selectedQuoteForScoring && requisition && user && (
                        <ScoringDialog 
                            quote={selectedQuoteForScoring} 
                            requisition={requisition} 
                            user={user} 
                            onScoreSubmitted={handleScoreSubmitted} 
                        />
                    )}
                </Dialog>
                 {isAccepted && (
                    <CardFooter>
                         <Alert variant="default" className="w-full border-green-600">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertTitle>Award Accepted</AlertTitle>
                            <AlertDescription>
                                The vendor has accepted the award. The PO has been generated.
                            </AlertDescription>
                        </Alert>
                    </CardFooter>
                )}
            </Card>
        )}
        
        {isDeadlinePassed && !isAwarded && (user.role === 'Procurement Officer' || user.role === 'Committee') && quotations.length > 0 && (
             <ScoringProgressTracker 
                requisition={requisition}
                quotations={quotations}
                allUsers={allUsers}
                onFinalize={handleFinalizeScores}
                isFinalizing={isFinalizing}
            />
        )}

        {isAccepted && requisition.status !== 'PO Created' && user.role !== 'Committee Member' && (
            <ContractManagement requisition={requisition} />
        )}
         {requisition && (
            <RequisitionDetailsDialog 
                reuisition={requisition} 
                isOpen={isDetailsOpen} 
                onClose={() => setIsDetailsOpen(false)} 
            />
        )}
    </div>
  );
}
