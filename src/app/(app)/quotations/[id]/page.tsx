

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
import { Loader2, PlusCircle, Award, XCircle, FileSignature, FileText, Bot, Lightbulb, ArrowLeft, Star, Undo, Check, Send, Search, BadgeHelp, BadgeCheck, BadgeX, Crown, Medal, Trophy, RefreshCw, TimerOff, ClipboardList, TrendingUp, Scale, Edit2, Users, GanttChart, Eye, CheckCircle, CalendarIcon, Timer, Landmark, Settings2, Ban, Printer, FileBarChart2 } from 'lucide-react';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PurchaseOrder, PurchaseRequisition, Quotation, Vendor, QuotationStatus, EvaluationCriteria, User, CommitteeScoreSet } from '@/lib/types';
import { format, formatDistanceToNow, isBefore, isPast, setHours, setMinutes } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/auth-context';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
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
import Image from 'next/image';

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

const QuoteComparison = ({ quotes, requisition, onScore, user, isDeadlinePassed }: { quotes: Quotation[], requisition: PurchaseRequisition, onScore: (quote: Quotation) => void, user: User, isDeadlinePassed: boolean }) => {

    if (quotes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg bg-muted/30">
                <BadgeHelp className="h-16 w-16 text-muted-foreground/50" />
                <h3 className="mt-6 text-xl font-semibold">No Quotes Yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">No vendors have submitted a quotation for this requisition.</p>
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

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quotes.sort((a, b) => (a.rank || 4) - (b.rank || 4)).map(quote => {
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
                                    <p className="text-sm text-muted-foreground">Revealed after {format(new Date(requisition.deadline!), 'PPp')}</p>
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
                        <CardFooter className="flex flex-col gap-2">
                            {user.role === 'Committee Member' && (
                                <Button className="w-full" variant={hasUserScored ? "secondary" : "outline"} onClick={() => onScore(quote)} disabled={!isDeadlinePassed}>
                                    {hasUserScored ? <Check className="mr-2 h-4 w-4"/> : <Edit2 className="mr-2 h-4 w-4" />}
                                    {hasUserScored ? 'View Your Score' : 'Score this Quote'}
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                )
            })}
        </div>
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
                <CardTitle>Contract &amp; PO Finalization</CardTitle>
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
                        <Label htmlFor="notes">Negotiation &amp; Finalization Notes</Label>
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
});

type CommitteeFormValues = z.infer<typeof committeeFormSchema>;

const CommitteeManagement = ({ requisition, onCommitteeUpdated }: { requisition: PurchaseRequisition; onCommitteeUpdated: () => void; }) => {
    const { user, allUsers } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setSubmitting] = useState(false);
    const [isCommitteeDialogOpen, setCommitteeDialogOpen] = useState(false);
    const [committeeSearch, setCommitteeSearch] = useState("");
    const [deadlineDate, setDeadlineDate] = useState<Date|undefined>(
        requisition.scoringDeadline ? new Date(requisition.scoringDeadline) : undefined
    );
    const [deadlineTime, setDeadlineTime] = useState(
        requisition.scoringDeadline ? format(new Date(requisition.scoringDeadline), 'HH:mm') : '17:00'
    );
    
    const form = useForm<CommitteeFormValues>({
        resolver: zodResolver(committeeFormSchema),
        defaultValues: {
            committeeName: requisition.committeeName || "",
            committeePurpose: requisition.committeePurpose || "",
            committeeMemberIds: requisition.committeeMemberIds || [],
        },
    });

    const finalDeadline = useMemo(() => {
        if (!deadlineDate) return undefined;
        const [hours, minutes] = deadlineTime.split(':').map(Number);
        return setMinutes(setHours(deadlineDate, hours), minutes);
    }, [deadlineDate, deadlineTime]);
    
    useEffect(() => {
        form.reset({
            committeeName: requisition.committeeName || "",
            committeePurpose: requisition.committeePurpose || "",
            committeeMemberIds: requisition.committeeMemberIds || [],
        });
        if (requisition.scoringDeadline) {
            setDeadlineDate(new Date(requisition.scoringDeadline));
            setDeadlineTime(format(new Date(requisition.scoringDeadline), 'HH:mm'));
        }
    }, [requisition, form]);

    const handleSaveCommittee = async (values: CommitteeFormValues) => {
        if (!user || !finalDeadline) {
             toast({
                variant: 'destructive',
                title: 'Invalid Deadline',
                description: 'A scoring deadline must be set.',
            });
            return;
        }

        if (isBefore(finalDeadline, new Date())) {
            toast({
                variant: 'destructive',
                title: 'Invalid Deadline',
                description: 'The scoring deadline must be in the future.',
            });
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch(`/api/requisitions/${requisition.id}/assign-committee`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId: user.id, 
                    ...values,
                    scoringDeadline: finalDeadline
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


    return (
        <Card className="border-dashed">
            <CardHeader className="flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                    <CardTitle>Evaluation Committee</CardTitle>
                     <CardDescription>
                         {requisition.committeePurpose ? `Purpose: ${requisition.committeePurpose}` : 'Assign a committee to evaluate quotations.'}
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
                    <DialogContent className="max-w-2xl flex flex-col max-h-[90vh]">
                         <Form {...form}>
                         <form onSubmit={form.handleSubmit(handleSaveCommittee)} className="flex flex-col flex-1 min-h-0">
                        <DialogHeader>
                            <DialogTitle>Evaluation Committee</DialogTitle>
                        </DialogHeader>
                        <div className="flex-1 overflow-y-auto space-y-4 p-1 -mx-1">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="committeeName"
                                        render={({ field }) => (
                                            <FormItem><FormLabel>Committee Name</FormLabel><FormControl><Input {...field} placeholder="e.g., Q4 Laptop Procurement Committee" /></FormControl><FormMessage /></FormItem>
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

                                <div className="space-y-2">
                                    <FormLabel>Committee Scoring Deadline</FormLabel>
                                    <div className="flex gap-2">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn("flex-1", !deadlineDate && "text-muted-foreground")}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {deadlineDate ? format(deadlineDate, "PPP") : <span>Pick a date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={deadlineDate}
                                                    onSelect={setDeadlineDate}
                                                    disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <Input 
                                            type="time" 
                                            className="w-32"
                                            value={deadlineTime}
                                            onChange={(e) => setDeadlineTime(e.target.value)}
                                        />
                                    </div>
                                </div>


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
                                    <FormItem className="flex-1 flex flex-col min-h-0">
                                        <ScrollArea className="flex-1 rounded-md border">
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
                                                                        ? field.onChange([...(field.value || []), member.id])
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
                        </div>
                        <DialogFooter className="pt-4 border-t mt-4">
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
            <CardContent>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                    {assignedMembers.length > 0 ? (
                        assignedMembers.map(member => (
                            <div key={member.id} className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={`https://picsum.photos/seed/${member.id}/40/40`} data-ai-hint="profile picture" />
                                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium">{member.name}</span>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground">No committee members assigned.</p>
                    )}
                </div>
                 {requisition.scoringDeadline && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground border-t pt-4">
                        <Timer className="h-4 w-4"/>
                        <span className="font-semibold">Scoring Deadline:</span>
                        <span>{format(new Date(requisition.scoringDeadline), 'PPpp')}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const RFQActionDialog = ({
    action,
    requisition,
    isOpen,
    onClose,
    onSuccess
}: {
    action: 'update' | 'cancel',
    requisition: PurchaseRequisition,
    isOpen: boolean,
    onClose: () => void,
    onSuccess: () => void
}) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [reason, setReason] = useState('');
    const [newDeadline, setNewDeadline] = useState<Date | undefined>(requisition.deadline ? new Date(requisition.deadline) : undefined);
    const [newDeadlineTime, setNewDeadlineTime] = useState<string>(requisition.deadline ? format(new Date(requisition.deadline), 'HH:mm') : '17:00');

    const finalNewDeadline = useMemo(() => {
        if (!newDeadline) return undefined;
        const [hours, minutes] = newDeadlineTime.split(':').map(Number);
        return setMinutes(setHours(newDeadline, hours), minutes);
    }, [newDeadline, newDeadlineTime]);
    
    const handleSubmit = async () => {
        if (!user) return;
        if (!reason.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'A reason must be provided.'});
            return;
        }
        if (action === 'update' && (!finalNewDeadline || isBefore(finalNewDeadline, new Date()))) {
            toast({ variant: 'destructive', title: 'Error', description: 'The new deadline must be in the future.'});
            return;
        }

        setIsSubmitting(true);
        try {
             const response = await fetch(`/api/requisitions/${requisition.id}/manage-rfq`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId: user.id, 
                    action,
                    reason,
                    newDeadline: action === 'update' ? finalNewDeadline : undefined
                }),
            });
            if (!response.ok) {
                 const errorData = await response.json();
                throw new Error(errorData.error || `Failed to ${action} RFQ.`);
            }
            toast({ title: 'Success', description: `The RFQ has been successfully ${action === 'update' ? 'updated' : 'cancelled'}.`});
            onSuccess();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: error instanceof Error ? error.message : 'An unknown error occurred.'});
        } finally {
            setIsSubmitting(false);
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{action === 'update' ? 'Update RFQ Deadline' : 'Cancel RFQ'}</DialogTitle>
                    <DialogDescription>
                        {action === 'update' 
                            ? "Provide a reason and set a new deadline for this RFQ. Vendors will be notified."
                            : "Provide a reason for cancelling this RFQ. This will revert the requisition to 'Approved' status and reject all submitted quotes."
                        }
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    {action === 'update' && (
                        <div className="space-y-2">
                            <Label>New Quotation Submission Deadline</Label>
                             <div className="flex gap-2">
                                 <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !newDeadline && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {newDeadline ? format(newDeadline, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={newDeadline}
                                            onSelect={setNewDeadline}
                                            disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <Input 
                                    type="time" 
                                    className="w-32"
                                    value={newDeadlineTime}
                                    onChange={(e) => setNewDeadlineTime(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                     <div>
                        <Label htmlFor="reason">Reason for {action === 'update' ? 'Update' : 'Cancellation'}</Label>
                        <Textarea id="reason" value={reason} onChange={e => setReason(e.target.value)} className="mt-2" />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="ghost">Close</Button></DialogClose>
                    <Button onClick={handleSubmit} disabled={isSubmitting} variant={action === 'cancel' ? 'destructive' : 'default'}>
                         {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Confirm {action === 'update' ? 'Update' : 'Cancellation'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const RFQDistribution = ({ requisition, vendors, onRfqSent }: { requisition: PurchaseRequisition; vendors: Vendor[]; onRfqSent: () => void; }) => {
    const [distributionType, setDistributionType] = useState('all');
    const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
    const [vendorSearch, setVendorSearch] = useState("");
    const [isSubmitting, setSubmitting] = useState(false);
    const [deadlineDate, setDeadlineDate] = useState<Date|undefined>();
    const [deadlineTime, setDeadlineTime] = useState('17:00');
    const [cpoAmount, setCpoAmount] = useState<number | undefined>(requisition.cpoAmount);
    const [actionDialog, setActionDialog] = useState<{isOpen: boolean, type: 'update' | 'cancel'}>({isOpen: false, type: 'update'});
    const { user } = useAuth();
    const { toast } = useToast();
    
    const isSent = requisition.status === 'RFQ In Progress' || requisition.status === 'PO Created';

     useEffect(() => {
        if (requisition.deadline) {
            setDeadlineDate(new Date(requisition.deadline));
            setDeadlineTime(format(new Date(requisition.deadline), 'HH:mm'));
        } else {
            setDeadlineDate(undefined);
            setDeadlineTime('17:00');
        }
        setCpoAmount(requisition.cpoAmount);
    }, [requisition]);

    const deadline = useMemo(() => {
        if (!deadlineDate || !deadlineTime) return undefined;
        const [hours, minutes] = deadlineTime.split(':').map(Number);
        return setMinutes(setHours(deadlineDate, hours), minutes);
    }, [deadlineDate, deadlineTime]);


    const handleSendRFQ = async () => {
        if (!user || !deadline) return;

        if (isBefore(deadline, new Date())) {
            toast({
                variant: 'destructive',
                title: 'Invalid Deadline',
                description: 'The quotation submission deadline must be in the future.',
            });
            return;
        }
        
        if (requisition.scoringDeadline && !isBefore(deadline, new Date(requisition.scoringDeadline))) {
            toast({
                variant: 'destructive',
                title: 'Invalid Deadline',
                description: 'The quotation submission deadline must be earlier than the committee scoring deadline.',
            });
            return;
        }

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
                    deadline,
                    cpoAmount
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
        <>
        <Card className={cn(isSent && "bg-muted/30")}>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>RFQ Distribution</CardTitle>
                    <CardDescription>
                        {isSent
                        ? "The RFQ has been distributed to vendors."
                        : "Send the Request for Quotation to vendors to begin receiving bids."
                        }
                    </CardDescription>
                </div>
                 {isSent && requisition.status !== 'PO Created' && user?.role === 'Procurement Officer' && (
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setActionDialog({isOpen: true, type: 'update'})}><Settings2 className="mr-2"/> Update RFQ</Button>
                        <Button variant="destructive" size="sm" onClick={() => setActionDialog({isOpen: true, type: 'cancel'})}><Ban className="mr-2"/> Cancel RFQ</Button>
                    </div>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Label>Quotation Submission Deadline</Label>
                     <div className="flex gap-2">
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    disabled={isSent}
                                    className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !deadlineDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {deadlineDate ? format(deadlineDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={deadlineDate}
                                    onSelect={setDeadlineDate}
                                    disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) || isSent}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        <Input 
                            type="time" 
                            className="w-32"
                            value={deadlineTime}
                            onChange={(e) => setDeadlineTime(e.target.value)}
                            disabled={isSent}
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Distribution Type</Label>
                    <Select value={distributionType} onValueChange={(v) => setDistributionType(v as any)} disabled={isSent}>
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
                    <Label htmlFor="cpoAmount">CPO Amount (ETB)</Label>
                     <div className="relative">
                        <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            id="cpoAmount"
                            type="number"
                            placeholder="Enter required CPO amount" 
                            className="pl-10"
                            value={cpoAmount || ''}
                            onChange={(e) => setCpoAmount(Number(e.target.value))}
                            disabled={isSent}
                        />
                     </div>
                    <p className="text-xs text-muted-foreground">Optional. If set, vendors must submit a CPO of this amount to qualify.</p>
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
                                    disabled={isSent}
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
                                            disabled={isSent}
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
                 {isSent ? (
                    <Badge variant="default" className="gap-2">
                        <CheckCircle className="h-4 w-4" />
                        RFQ Distributed on {format(new Date(requisition.updatedAt), 'PP')}
                    </Badge>
                ) : (
                    <>
                    <Button onClick={handleSendRFQ} disabled={isSubmitting || !deadline}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Send RFQ
                    </Button>
                    {!deadline && (
                        <p className="text-xs text-muted-foreground ml-4">A quotation deadline must be set before sending the RFQ.</p>
                    )}
                    </>
                )}
            </CardFooter>
        </Card>
        {isSent && (
             <RFQActionDialog 
                action={actionDialog.type}
                requisition={requisition}
                isOpen={actionDialog.isOpen}
                onClose={() => setActionDialog({isOpen: false, type: 'update'})}
                onSuccess={onRfqSent}
            />
        )}
        </>
    );
};

const WorkflowStepper = ({ step }: { step: 'rfq' | 'committee' | 'award' | 'finalize' | 'completed' }) => {
     const getStepClass = (currentStep: string, targetStep: string) => {
        const stepOrder = ['rfq', 'committee', 'award', 'finalize', 'completed'];
        const currentIndex = stepOrder.indexOf(currentStep);
        const targetIndex = stepOrder.indexOf(targetStep);
        if (currentIndex > targetIndex) return 'completed';
        if (currentIndex === targetStep) return 'active';
        return 'inactive';
    };

    const rfqState = getStepClass(step, 'rfq');
    const committeeState = getStepClass(step, 'committee');
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
                <div className={cn("flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold", stateClasses[rfqState])}>
                    {rfqState === 'completed' ? <Check className="h-4 w-4"/> : '1'}
                </div>
                <span className={cn("font-medium", textClasses[rfqState])}>Send RFQ</span>
            </div>
             <div className={cn("h-px flex-1 bg-border transition-colors", (committeeState === 'active' || committeeState === 'completed') && "bg-primary")}></div>

            <div className="flex items-center gap-2">
                <div className={cn("flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold", stateClasses[committeeState])}>
                    {committeeState === 'completed' ? <Check className="h-4 w-4"/> : '2'}
                </div>
                <span className={cn("font-medium", textClasses[committeeState])}>Assign Committee &amp; Score</span>
            </div>
             <div className={cn("h-px flex-1 bg-border transition-colors", (awardState === 'active' || awardState === 'completed') && "bg-primary")}></div>

            <div className="flex items-center gap-2">
                <div className={cn("flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold", stateClasses[awardState])}>
                    {awardState === 'completed' ? <Check className="h-4 w-4"/> : '3'}
                </div>
                <span className={cn("font-medium", textClasses[awardState])}>Award</span>
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
    if (!criteria || !scores) return 0;
    
    let totalFinancialScore = 0;
    let totalTechnicalScore = 0;

    if (scores.financialScores) {
        criteria.financialCriteria.forEach((c) => {
            const score = scores.financialScores.find(s => s.criterionId === c.id)?.score || 0;
            totalFinancialScore += score * (c.weight / 100);
        });
    }

    if (scores.technicalScores) {
        criteria.technicalCriteria.forEach((c) => {
            const score = scores.technicalScores.find(s => s.criterionId === c.id)?.score || 0;
            totalTechnicalScore += score * (c.weight / 100);
        });
    }

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
    
    const form = useForm<ScoreFormValues>({
        resolver: zodResolver(scoreFormSchema),
    });

    useEffect(() => {
        if (quote && requisition) {
            const existingScore = quote.scores?.find(s => s.scorerId === user.id);
            form.reset({
                committeeComment: existingScore?.committeeComment || "",
                financialScores: requisition.evaluationCriteria?.financialCriteria.map(c => {
                    const existing = existingScore?.financialScores.find(s => s.criterionId === c.id);
                    return { criterionId: c.id, score: existing?.score || 0, comment: existing?.comment || "" };
                }) || [],
                technicalScores: requisition.evaluationCriteria?.technicalCriteria.map(c => {
                    const existing = existingScore?.technicalScores.find(s => s.criterionId === c.id);
                    return { criterionId: c.id, score: existing?.score || 0, comment: existing?.comment || "" };
                }) || [],
            });
        }
    }, [quote, requisition, user, form]);

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
    const existingScore = quote.scores?.find(s => s.scorerId === user.id);

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
    const calculatedScore = (requisition.evaluationCriteria && currentValues.financialScores && currentValues.technicalScores)
    ? clientSideScoreCalculator(currentValues, requisition.evaluationCriteria)
    : 0;

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
                                <AlertDialogCancel>Go Back &amp; Edit</AlertDialogCancel>
                                <AlertDialogAction onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
                                     {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Confirm &amp; Submit
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
  isFinalizing,
  isAwarded,
}: {
  requisition: PurchaseRequisition;
  quotations: Quotation[];
  allUsers: User[];
  onFinalize: (awardResponseDeadline?: Date) => void;
  isFinalizing: boolean;
  isAwarded: boolean;
}) => {
    const [awardResponseDeadline, setAwardResponseDeadline] = useState<Date | undefined>();
    const { toast } = useToast();

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

    const handleFinalizeClick = () => {
        if (awardResponseDeadline && isBefore(awardResponseDeadline, new Date())) {
            toast({
                variant: 'destructive',
                title: 'Invalid Deadline',
                description: 'The award response deadline must be in the future.',
            });
            return;
        }
        onFinalize(awardResponseDeadline);
    }

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
                        <Button disabled={!allHaveScored || isFinalizing || isAwarded}>
                            {isFinalizing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isAwarded ? 'Scores Finalized' : 'Finalize Scores &amp; Award'}
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
                                        {awardResponseDeadline ? format(awardResponseDeadline, "PPP p") : <span>Pick a date and time</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={awardResponseDeadline}
                                        onSelect={setAwardResponseDeadline}
                                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                        initialFocus
                                    />
                                    <div className="p-2 border-t border-border">
                                        <p className="text-xs text-muted-foreground text-center mb-2">Set Time</p>
                                        <div className="flex gap-2">
                                        <Input
                                            type="time"
                                            defaultValue={awardResponseDeadline ? format(awardResponseDeadline, 'HH:mm') : '17:00'}
                                            onChange={(e) => {
                                                const [hours, minutes] = e.target.value.split(':').map(Number);
                                                setAwardResponseDeadline(d => setMinutes(setHours(d || new Date(), hours), minutes));
                                            }}
                                        />
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleFinalizeClick} disabled={!awardResponseDeadline}>
                                Proceed
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
        </Card>
    );
};

const CumulativeScoringReportDialog = ({ requisition, quotations, isOpen, onClose }: { requisition: PurchaseRequisition; quotations: Quotation[], isOpen: boolean, onClose: () => void }) => {
    
    const handlePrint = () => {
        window.print();
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl h-[90vh] flex flex-col print:h-auto print:max-w-full print:border-none print:shadow-none">
                <DialogHeader className="print:hidden">
                    <DialogTitle>Cumulative Scoring Report</DialogTitle>
                    <DialogDescription>
                        A detailed breakdown of committee scores for all quotations on requisition {requisition.id}.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-grow overflow-y-auto" id="print-content">
                    <div className="p-1 space-y-6">
                        <div className="text-center hidden print:block mb-8">
                            <h1 className="text-3xl font-bold">Cumulative Scoring Report</h1>
                            <p className="text-muted-foreground">{requisition.title}</p>
                            <p className="text-sm text-muted-foreground">{requisition.id}</p>
                        </div>
                        {quotations.sort((a,b) => (a.rank || 99) - (b.rank || 99)).map(quote => (
                            <Card key={quote.id} className="break-inside-avoid">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-lg">{quote.vendorName}</CardTitle>
                                            <CardDescription>Final Score: <span className="font-bold text-primary">{quote.finalAverageScore?.toFixed(2)}</span> | Rank: {quote.rank || 'N/A'}</CardDescription>
                                        </div>
                                        <Badge variant={quote.status === 'Awarded' ? 'default' : 'secondary'}>{quote.status}</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                     {quote.scores && quote.scores.length > 0 ? (
                                        quote.scores.map(scoreSet => (
                                            <div key={scoreSet.scorerId} className="p-3 border rounded-md">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                         <Avatar className="h-6 w-6">
                                                            <AvatarImage src={`https://picsum.photos/seed/${scoreSet.scorerId}/24/24`} />
                                                            <AvatarFallback>{scoreSet.scorerName.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <span className="font-semibold">{scoreSet.scorerName}</span>
                                                    </div>
                                                    <span className="font-bold text-primary">{scoreSet.finalScore.toFixed(2)}</span>
                                                </div>
                                                {scoreSet.committeeComment && <p className="text-xs italic text-muted-foreground mt-2 p-2 bg-muted/50 rounded-md">"{scoreSet.committeeComment}"</p>}
                                            </div>
                                        ))
                                     ) : <p className="text-sm text-muted-foreground text-center">No scores submitted.</p>}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
                <DialogFooter className="print:hidden">
                    <Button variant="outline" onClick={onClose}>Close</Button>
                    <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4"/>Print</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default function QuotationDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { user, allUsers } = useAuth();
  const id = params.id as string;
  
  const [requisition, setRequisition] = useState<PurchaseRequisition | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddFormOpen, setAddFormOpen] = useState(false);
  const [isScoringFormOpen, setScoringFormOpen] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [selectedQuoteForScoring, setSelectedQuoteForScoring] = useState<Quotation | null>(null);
  const [lastPOCreated, setLastPOCreated] = useState<PurchaseOrder | null>(null);
  const [isChangingAward, setIsChangingAward] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isReportOpen, setReportOpen] = useState(false);

  const isAwarded = useMemo(() => quotations.some(q => q.status === 'Awarded' || q.status === 'Accepted' || q.status === 'Declined'), [quotations]);
  const isAccepted = useMemo(() => quotations.some(q => q.status === 'Accepted'), [quotations]);
  const secondStandby = useMemo(() => quotations.find(q => q.rank === 2), [quotations]);
  const thirdStandby = useMemo(() => quotations.find(q => q.rank === 3), [quotations]);
  
  const isDeadlinePassed = useMemo(() => {
    if (!requisition) return false;
    return requisition.deadline ? isPast(new Date(requisition.deadline)) : false;
  }, [requisition]);

  const isScoringComplete = useMemo(() => {
    if (!requisition || !requisition.committeeMemberIds || requisition.committeeMemberIds.length === 0) return false;
    if (quotations.length === 0) return false;
    return requisition.committeeMemberIds.every(memberId => 
        quotations.every(quote => quote.scores?.some(score => score.scorerId === memberId))
    );
  }, [requisition, quotations]);

  useEffect(() => {
    if (id) {
        fetchRequisitionAndQuotes();
    }
  }, [id]);

  const fetchRequisitionAndQuotes = async () => {
    if (!id) return;
    setLoading(true);
    setLastPOCreated(null);
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

        if (awardResponseDeadline && isBefore(awardResponseDeadline, new Date())) {
            toast({
                variant: 'destructive',
                title: 'Invalid Deadline',
                description: 'The award response deadline must be in the future.',
            });
            return;
        }
        
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

  const getCurrentStep = (): 'rfq' | 'committee' | 'award' | 'finalize' | 'completed' => {
    if (!requisition) return 'rfq';
    if (requisition.status === 'Approved') {
        return 'rfq';
    }
    if (requisition.status === 'RFQ In Progress' && !isDeadlinePassed) {
        return 'rfq';
    }
     if (requisition.status === 'RFQ In Progress' && isDeadlinePassed) {
        if (!requisition.committeeMemberIds || requisition.committeeMemberIds.length === 0) {
            return 'committee';
        }
        return 'award';
    }
    if (isAccepted) {
        if (requisition.status === 'PO Created') return 'completed';
        return 'finalize';
    }
    if (isAwarded) {
        return 'award';
    }
    return 'award';
  };
  const currentStep = getCurrentStep();
  
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

  if (loading || !user) {
     return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  if (!requisition) {
     return <div className="text-center p-8">Requisition not found.</div>;
  }
  
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
                 <CardHeader className="flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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

        {currentStep === 'rfq' && (user.role === 'Procurement Officer' || user.role === 'Committee') && (
            <div className="grid md:grid-cols-2 gap-6 items-start">
                <RFQDistribution 
                    requisition={requisition} 
                    vendors={vendors} 
                    onRfqSent={fetchRequisitionAndQuotes}
                />
                 <Card className="border-dashed h-full">
                    <CardHeader>
                        <CardTitle>Committee Selection</CardTitle>
                        <CardDescription>Committee assignment will be available after the quotation deadline has passed.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center text-center text-muted-foreground h-4/5">
                        <Users className="h-12 w-12 mb-4" />
                        <p>Waiting for vendor quotes...</p>
                    </CardContent>
                </Card>
            </div>
        )}
        
        {currentStep === 'committee' && (user.role === 'Procurement Officer' || user.role === 'Committee') && (
            <CommitteeManagement
                requisition={requisition} 
                onCommitteeUpdated={fetchRequisitionAndQuotes}
            />
        )}


        {(currentStep === 'award' || currentStep === 'finalize' || currentStep === 'completed') && (
            <Card>
                <CardHeader className="flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Quotations for {requisition.id}</CardTitle>
                        <CardDescription>{requisition.title}</CardDescription>
                         <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                            {requisition.deadline && (
                                <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
                                    <CalendarIcon className="h-4 w-4"/>
                                    <span>Quote Deadline:</span>
                                    <span className="font-semibold text-foreground">{format(new Date(requisition.deadline), 'PPpp')}</span>
                                </div>
                            )}
                             {requisition.scoringDeadline && (
                                <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
                                    <Timer className="h-4 w-4"/>
                                    <span>Scoring Deadline:</span>
                                    <span className="font-semibold text-foreground">{format(new Date(requisition.scoringDeadline), 'PPpp')}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        {isAwarded && isScoringComplete && user.role === 'Procurement Officer' && (
                            <Button variant="secondary" onClick={() => setReportOpen(true)}>
                                <FileBarChart2 className="mr-2 h-4 w-4" /> View Cumulative Report
                            </Button>
                        )}
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
                {loading ? (
                    <div className="flex items-center justify-center h-24">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <QuoteComparison 
                        quotes={quotations} 
                        requisition={requisition}
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
        
        {currentStep === 'award' && (user.role === 'Procurement Officer' || user.role === 'Committee') && quotations.length > 0 && (
             <ScoringProgressTracker 
                requisition={requisition}
                quotations={quotations}
                allUsers={allUsers}
                onFinalize={handleFinalizeScores}
                isFinalizing={isFinalizing}
                isAwarded={isAwarded}
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
         {requisition && quotations && (
            <CumulativeScoringReportDialog
                requisition={requisition}
                quotations={quotations}
                isOpen={isReportOpen}
                onClose={() => setReportOpen(false)}
            />
        )}
    </div>
  );
}

    