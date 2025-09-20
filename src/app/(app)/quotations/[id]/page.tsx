

'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { Loader2, PlusCircle, Award, XCircle, FileSignature, FileText, Bot, Lightbulb, ArrowLeft, Star, Undo, Check, Send, Search, BadgeHelp, BadgeCheck, BadgeX, Crown, Medal, Trophy, RefreshCw, TimerOff, ClipboardList, TrendingUp, Scale, Edit2, Users, GanttChart, Eye, CheckCircle, CalendarIcon, Timer, Landmark, Settings2, Ban, Printer, FileBarChart2, UserCog, History, AlertCircle } from 'lucide-react';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PurchaseOrder, PurchaseRequisition, Quotation, Vendor, QuotationStatus, EvaluationCriteria, User, CommitteeScoreSet, EvaluationCriterion } from '@/lib/types';
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
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const quoteFormSchema = z.object({
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

const QuoteComparison = ({ quotes, requisition, onScore, user, isDeadlinePassed, isScoringDeadlinePassed }: { quotes: Quotation[], requisition: PurchaseRequisition, onScore: (quote: Quotation) => void, user: User, isDeadlinePassed: boolean, isScoringDeadlinePassed: boolean }) => {

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
    
    const canUserScore = (user.role === 'Committee Member') && (
        requisition.financialCommitteeMemberIds?.includes(user.id) || 
        requisition.technicalCommitteeMemberIds?.includes(user.id)
    );

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
                             {(isDeadlinePassed || quote.cpoDocumentUrl) ? (
                                <>
                                    {isDeadlinePassed && <div className="text-3xl font-bold text-center">{quote.totalPrice.toLocaleString()} ETB</div>}
                                    {isDeadlinePassed && <div className="text-center text-muted-foreground">Est. Delivery: {format(new Date(quote.deliveryDate), 'PP')}</div>}
                                    
                                    {quote.cpoDocumentUrl && (
                                        <div className="text-sm space-y-1 pt-2 border-t">
                                            <h4 className="font-semibold">CPO Document</h4>
                                            <Button asChild variant="link" className="p-0 h-auto">
                                                <a href={quote.cpoDocumentUrl} target="_blank" rel="noopener noreferrer">{quote.cpoDocumentUrl}</a>
                                            </Button>
                                        </div>
                                    )}

                                    {isDeadlinePassed && (
                                        <div className="text-sm space-y-2">
                                        <h4 className="font-semibold">Items:</h4>
                                            {quote.items.map(item => (
                                                <div key={item.requisitionItemId} className="flex justify-between items-center text-muted-foreground">
                                                    <span>{item.name} x {item.quantity}</span>
                                                    <span className="font-mono">{item.unitPrice.toFixed(2)} ETB ea.</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-8">
                                    <TimerOff className="h-8 w-8 mx-auto text-muted-foreground" />
                                    <p className="font-semibold mt-2">Details Masked</p>
                                    <p className="text-sm text-muted-foreground">Revealed after {format(new Date(requisition.deadline!), 'PPp')}</p>
                                </div>
                            )}

                            {quote.notes && (
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
                            {canUserScore && (
                                <Button className="w-full" variant={hasUserScored ? "secondary" : "outline"} onClick={() => onScore(quote)} disabled={isScoringDeadlinePassed && !hasUserScored}>
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
  financialCommitteeMemberIds: z.array(z.string()).min(1, "At least one financial member is required."),
  technicalCommitteeMemberIds: z.array(z.string()).min(1, "At least one technical member is required."),
}).refine(data => {
    const financialIds = new Set(data.financialCommitteeMemberIds);
    const hasOverlap = data.technicalCommitteeMemberIds.some(id => financialIds.has(id));
    return !hasOverlap;
}, {
    message: "A member cannot be on both financial and technical committees.",
    path: ["financialCommitteeMemberIds"],
});

type CommitteeFormValues = z.infer<typeof committeeFormSchema>;

const CommitteeManagement = ({ requisition, onCommitteeUpdated, open, onOpenChange }: { requisition: PurchaseRequisition; onCommitteeUpdated: () => void; open: boolean; onOpenChange: (open: boolean) => void; }) => {
    const { user, allUsers } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setSubmitting] = useState(false);
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
            financialCommitteeMemberIds: requisition.financialCommitteeMemberIds || [],
            technicalCommitteeMemberIds: requisition.technicalCommitteeMemberIds || [],
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
            financialCommitteeMemberIds: requisition.financialCommitteeMemberIds || [],
            technicalCommitteeMemberIds: requisition.technicalCommitteeMemberIds || [],
        });
        if (requisition.scoringDeadline) {
            setDeadlineDate(new Date(requisition.scoringDeadline));
            setDeadlineTime(format(new Date(requisition.scoringDeadline), 'HH:mm'));
        }
    }, [requisition, form, open]);

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
            onOpenChange(false);
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
    const assignedFinancialMembers = allUsers.filter(u => requisition.financialCommitteeMemberIds?.includes(u.id));
    const assignedTechnicalMembers = allUsers.filter(u => requisition.technicalCommitteeMemberIds?.includes(u.id));
    const allAssignedMemberIds = [...(requisition.financialCommitteeMemberIds || []), ...(requisition.technicalCommitteeMemberIds || [])];

    const MemberList = ({ title, description, members }: { title: string, description: string, members: User[] }) => (
        <div>
            <h4 className="font-semibold">{title}</h4>
            <p className="text-sm text-muted-foreground mb-3">{description}</p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                {members.length > 0 ? (
                    members.map(member => (
                        <div key={member.id} className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={`https://picsum.photos/seed/${member.id}/40/40`} data-ai-hint="profile picture" />
                                <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{member.name}</span>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground">No members assigned.</p>
                )}
            </div>
        </div>
    );
    
    const MemberSelection = ({ type }: { type: 'financial' | 'technical' }) => {
        const [search, setSearch] = useState("");
        const otherType = type === 'financial' ? 'technical' : 'financial';
        const otherCommitteeIds = new Set(form.watch(`${otherType}CommitteeMemberIds`));

        const availableMembers = useMemo(() => {
            const lowercasedSearch = search.toLowerCase();
            return committeeMembers.filter(member =>
                !otherCommitteeIds.has(member.id) &&
                (member.name.toLowerCase().includes(lowercasedSearch) || member.email.toLowerCase().includes(lowercasedSearch))
            );
        }, [committeeMembers, search, otherCommitteeIds]);

        return (
            <div className="space-y-2">
                <div className="relative pt-2">
                    <Search className="absolute left-2.5 top-5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder={`Search ${type} members...`}
                        className="pl-8 w-full"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                 <FormField
                    control={form.control}
                    name={`${type}CommitteeMemberIds`}
                    render={() => (
                    <FormItem className="flex-1 flex flex-col min-h-0">
                        <ScrollArea className="flex-1 rounded-md border h-60">
                            <div className="space-y-1 p-1">
                            {availableMembers.map(member => (
                                <FormField
                                    key={member.id}
                                    control={form.control}
                                    name={`${type}CommitteeMemberIds`}
                                    render={({ field }) => (
                                        <FormItem className="flex items-start space-x-4 rounded-md border p-2 has-[:checked]:bg-muted">
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
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={`https://picsum.photos/seed/${member.id}/32/32`} data-ai-hint="profile picture" />
                                                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div className="grid gap-0.5">
                                                    <Label className="font-normal cursor-pointer text-sm">{member.name}</Label>
                                                    <p className="text-xs text-muted-foreground">{member.email}</p>
                                                </div>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            ))}
                            {availableMembers.length === 0 && (
                                <div className="text-center text-muted-foreground py-10">No members available.</div>
                            )}
                            </div>
                        </ScrollArea>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
        );
    }


    return (
        <Card className="border-dashed">
            <CardHeader className="flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                    <CardTitle>Evaluation Committee</CardTitle>
                     <CardDescription>
                         {requisition.committeePurpose ? `Purpose: ${requisition.committeePurpose}` : 'Assign a committee to evaluate quotations.'}
                    </CardDescription>
                </div>
                 <Dialog open={open} onOpenChange={onOpenChange}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="w-full sm:w-auto">
                            {allAssignedMemberIds.length > 0 ? (
                                <><Edit2 className="mr-2 h-4 w-4" /> Edit Committee</>
                            ) : (
                                <><Users className="mr-2 h-4 w-4" /> Assign Committee</>
                            )}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl flex flex-col max-h-[90vh]">
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
                                     <FormField
                                        control={form.control}
                                        name="committeePurpose"
                                        render={({ field }) => (
                                            <FormItem><FormLabel>Purpose / Mandate</FormLabel><FormControl><Input {...field} placeholder="e.g., To evaluate vendor submissions for REQ-..." /></FormControl><FormMessage /></FormItem>
                                        )}
                                    />
                                </div>
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
                                
                                <div className="grid md:grid-cols-2 gap-6">
                                     <div>
                                        <h3 className="font-semibold text-lg">Financial Committee</h3>
                                        <MemberSelection type="financial" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">Technical Committee</h3>
                                        <MemberSelection type="technical" />
                                    </div>
                                </div>
                                {form.formState.errors.financialCommitteeMemberIds && (
                                    <p className="text-sm font-medium text-destructive">{form.formState.errors.financialCommitteeMemberIds.message}</p>
                                )}
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
            <CardContent className="space-y-6">
                 <MemberList title="Financial Committee" description="Responsible for evaluating cost and financial stability." members={assignedFinancialMembers} />
                 <MemberList title="Technical Committee" description="Responsible for assessing technical specs and compliance." members={assignedTechnicalMembers} />
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
    
    const isSent = requisition.status === 'RFQ_In_Progress' || requisition.status === 'PO_Created';

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
                 {isSent && requisition.status !== 'PO_Created' && user?.role === 'Procurement Officer' && (
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
                    <Badge variant="default" className="gap-2 bg-green-600">
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
    const getStepState = (currentStep: string, targetStep: string) => {
        const stepOrder = ['rfq', 'committee', 'award', 'finalize', 'completed'];
        const currentIndex = stepOrder.indexOf(currentStep);
        const targetIndex = stepOrder.indexOf(targetStep);
        if (currentIndex > targetIndex) return 'completed';
        if (currentIndex === targetStep) return 'active';
        return 'inactive';
    };

    const steps = [
        { key: 'rfq', label: 'Send RFQ' },
        { key: 'committee', label: 'Assign Committee & Score' },
        { key: 'award', label: 'Award' },
        { key: 'finalize', label: 'Finalize' }
    ];

    const stateClasses = {
        active: 'bg-primary text-primary-foreground border-primary',
        completed: 'bg-green-600 text-white border-green-600',
        inactive: 'border-border text-muted-foreground'
    };

    const textClasses = {
        active: 'text-primary',
        completed: 'text-foreground',
        inactive: 'text-muted-foreground'
    };

    return (
        <div className="flex items-center justify-center space-x-1 sm:space-x-2 flex-wrap">
            {steps.map((s, index) => {
                const state = getStepState(step, s.key);
                return (
                    <React.Fragment key={s.key}>
                        {index > 0 && <div className={cn("h-px flex-1 bg-border transition-colors", (state === 'active' || state === 'completed') && "bg-green-600")}></div>}
                        <div className="flex items-center gap-2">
                            <div className={cn("flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold transition-colors", stateClasses[state])}>
                                {state === 'completed' ? <Check className="h-4 w-4"/> : index + 1}
                            </div>
                            <span className={cn("font-medium transition-colors", textClasses[state])}>{s.label}</span>
                        </div>
                    </React.Fragment>
                );
            })}
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
    onScoreSubmitted,
    isScoringDeadlinePassed,
}: { 
    quote: Quotation; 
    requisition: PurchaseRequisition; 
    user: User; 
    onScoreSubmitted: () => void;
    isScoringDeadlinePassed: boolean;
}) => {
    const { toast } = useToast();
    const [isSubmitting, setSubmitting] = useState(false);
    
    const form = useForm<ScoreFormValues>({
        resolver: zodResolver(scoreFormSchema),
    });

    const isFinancialScorer = requisition.financialCommitteeMemberIds?.includes(user.id);
    const isTechnicalScorer = requisition.technicalCommitteeMemberIds?.includes(user.id);

    useEffect(() => {
        if (quote && requisition) {
            const existingScore = quote.scores?.find(s => s.scorerId === user.id);
            form.reset({
                committeeComment: existingScore?.committeeComment || "",
                financialScores: isFinancialScorer ? requisition.evaluationCriteria?.financialCriteria.map(c => {
                    const existing = existingScore?.financialScores.find(s => s.criterionId === c.id);
                    return { criterionId: c.id, score: existing?.score || 0, comment: existing?.comment || "" };
                }) || [] : [],
                technicalScores: isTechnicalScorer ? requisition.evaluationCriteria?.technicalCriteria.map(c => {
                    const existing = existingScore?.technicalScores.find(s => s.criterionId === c.id);
                    return { criterionId: c.id, score: existing?.score || 0, comment: existing?.comment || "" };
                }) || [] : [],
            });
        }
    }, [quote, requisition, user, form, isFinancialScorer, isTechnicalScorer]);

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

    if (!existingScore && isScoringDeadlinePassed) {
        return (
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Scoring Deadline Passed</DialogTitle>
                </DialogHeader>
                <div className="py-4 text-center">
                    <TimerOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                        The deadline for scoring this quotation has passed. Please contact the procurement officer if you need an extension.
                    </p>
                </div>
                 <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        );
    }

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
                    {isFinancialScorer && (
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
                    )}
                    {isTechnicalScorer && (
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
                    )}
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
                <Button type="button" onClick={() => form.reset()} variant="ghost" disabled={!!existingScore}>Reset Form</Button>
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
  onCommitteeUpdate,
  isFinalizing,
  isAwarded,
}: {
  requisition: PurchaseRequisition;
  quotations: Quotation[];
  allUsers: User[];
  onFinalize: (awardResponseDeadline?: Date) => void;
  onCommitteeUpdate: (open: boolean) => void;
  isFinalizing: boolean;
  isAwarded: boolean;
}) => {
    const [awardResponseDeadline, setAwardResponseDeadline] = useState<Date | undefined>();
    const [isExtendDialogOpen, setExtendDialogOpen] = useState(false);
    const [isReportDialogOpen, setReportDialogOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState<User | null>(null);
    
    const { toast } = useToast();
    const isScoringDeadlinePassed = requisition.scoringDeadline && isPast(new Date(requisition.scoringDeadline));

    const assignedCommitteeMembers = useMemo(() => {
        const allIds = [
            ...(requisition.financialCommitteeMemberIds || []),
            ...(requisition.technicalCommitteeMemberIds || [])
        ];
        const uniqueIds = [...new Set(allIds)];
        return allUsers.filter(u => uniqueIds.includes(u.id));
    }, [allUsers, requisition.financialCommitteeMemberIds, requisition.technicalCommitteeMemberIds]);

    const scoringStatus = useMemo(() => {
        return assignedCommitteeMembers.map(member => {
            const hasScoredAll = quotations.every(quote => quote.scores?.some(score => score.scorerId === member.id));
            const firstScore = quotations
                .flatMap(q => q.scores || [])
                .filter(s => s.scorerId === member.id)
                .sort((a,b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime())[0];
            const isOverdue = isScoringDeadlinePassed && !hasScoredAll;

            return {
                ...member,
                hasScoredAll,
                isOverdue,
                submittedAt: hasScoredAll ? firstScore?.submittedAt : null,
            };
        }).sort((a, b) => {
             if (a.submittedAt && b.submittedAt) return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
             if (a.submittedAt) return -1;
             if (b.submittedAt) return 1;
             return 0;
        });
    }, [assignedCommitteeMembers, quotations, isScoringDeadlinePassed]);
    
    const overdueMembers = scoringStatus.filter(s => s.isOverdue);
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
                        <li key={member.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-md border">
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
                            <div className="flex items-center gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
                                {member.hasScoredAll && member.submittedAt ? (
                                    <div className="text-right flex-1">
                                        <Badge variant="default" className="bg-green-600"><Check className="mr-1 h-3 w-3" /> Submitted</Badge>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {formatDistanceToNow(new Date(member.submittedAt), { addSuffix: true })}
                                        </p>
                                    </div>
                                ) : member.isOverdue ? (
                                    <>
                                     <Badge variant="destructive" className="mr-auto"><AlertCircle className="mr-1 h-3 w-3" />Overdue</Badge>
                                     <Button size="sm" variant="secondary" onClick={() => { setSelectedMember(member); setExtendDialogOpen(true); }}>Extend</Button>
                                     <Button size="sm" variant="secondary" onClick={() => onCommitteeUpdate(true)}>Replace</Button>
                                     <Button size="sm" variant="outline" onClick={() => { setSelectedMember(member); setReportDialogOpen(true); }}>Report</Button>
                                    </>
                                ) : (
                                     <Badge variant="secondary">Pending</Badge>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </CardContent>
            <CardFooter>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button disabled={!allHaveScored || isFinalizing || isAwarded}>
                            {isFinalizing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Finalize Scores and Award
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
            {selectedMember && (
                <>
                    <ExtendDeadlineDialog 
                        isOpen={isExtendDialogOpen}
                        onClose={() => { setExtendDialogOpen(false); setSelectedMember(null); }}
                        member={selectedMember}
                        requisition={requisition}
                        onSuccess={() => onCommitteeUpdate(false)}
                    />
                    <OverdueReportDialog 
                        isOpen={isReportDialogOpen}
                        onClose={() => { setReportDialogOpen(false); setSelectedMember(null); }}
                        member={selectedMember}
                    />
                </>
            )}
        </Card>
    );
};

const CumulativeScoringReportDialog = ({ requisition, quotations, isOpen, onClose }: { requisition: PurchaseRequisition; quotations: Quotation[], isOpen: boolean, onClose: () => void }) => {
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    const getCriterionName = (criterionId: string, criteria?: EvaluationCriterion[]) => {
        return criteria?.find(c => c.id === criterionId)?.name || 'Unknown Criterion';
    }

    const handleGeneratePdf = async () => {
        const input = printRef.current;
        if (!input) return;

        setIsGeneratingPdf(true);
        toast({ title: "Generating PDF...", description: "This may take a moment." });

        try {
            const canvas = await html2canvas(input, {
                scale: 2, // Increase resolution
                useCORS: true,
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = imgWidth / imgHeight;
            let width = pdfWidth - 20; // with margin
            let height = width / ratio;

            if (height > pdfHeight - 20) {
                 height = pdfHeight - 20;
                 width = height * ratio;
            }
            
            const x = (pdfWidth - width) / 2;
            const y = 10;
            
            pdf.addImage(imgData, 'PNG', x, y, width, height);
            
            pdf.save(`Scoring-Report-${requisition.id}.pdf`);
            toast({ title: "PDF Generated", description: "Your report has been downloaded." });

        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: "PDF Generation Failed", description: "An error occurred while creating the PDF." });
        } finally {
            setIsGeneratingPdf(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Cumulative Scoring Report</DialogTitle>
                    <DialogDescription>
                        A detailed breakdown of committee scores for requisition {requisition.id}.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-grow overflow-y-auto" id="print-content-wrapper">
                    <div ref={printRef} className="p-1 space-y-6 bg-white text-black">
                        <div className="text-center mb-8 pt-4">
                            <h1 className="text-3xl font-bold">Cumulative Scoring Report</h1>
                            <p className="text-gray-600">{requisition.title}</p>
                            <p className="text-sm text-gray-500">{requisition.id}</p>
                        </div>
                        {quotations.sort((a, b) => (a.rank || 99) - (b.rank || 99)).map(quote => (
                            <Card key={quote.id} className="break-inside-avoid border-gray-300 shadow-none rounded-lg">
                                <CardHeader className="bg-gray-100 rounded-t-lg">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-xl">{quote.vendorName}</CardTitle>
                                            <CardDescription className="text-gray-700 pt-1">Final Score: <span className="font-bold text-primary">{quote.finalAverageScore?.toFixed(2)}</span> | Rank: {quote.rank || 'N/A'}</CardDescription>
                                        </div>
                                        <Badge variant={quote.status === 'Awarded' ? 'default' : 'secondary'}>{quote.status}</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 space-y-4">
                                     {quote.scores && quote.scores.length > 0 ? (
                                        quote.scores.map(scoreSet => (
                                            <div key={scoreSet.scorerId} className="p-3 border border-gray-200 rounded-md break-inside-avoid">
                                                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={`https://picsum.photos/seed/${scoreSet.scorerId}/32/32`} />
                                                            <AvatarFallback>{scoreSet.scorerName.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <span className="font-semibold">{scoreSet.scorerName}</span>
                                                    </div>
                                                    <div className="text-right">
                                                      <span className="font-bold text-lg text-primary">{scoreSet.finalScore.toFixed(2)}</span>
                                                      <p className="text-xs text-gray-500">Submitted {format(new Date(scoreSet.submittedAt), 'PPp')}</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <h4 className="font-semibold text-sm mb-2 text-gray-800">Financial Evaluation ({requisition.evaluationCriteria?.financialWeight}%)</h4>
                                                        {scoreSet.financialScores.map(s => (
                                                             <div key={s.criterionId} className="text-xs p-2 bg-gray-50 rounded-md mb-2">
                                                                <div className="flex justify-between items-center font-medium">
                                                                    <p>{getCriterionName(s.criterionId, requisition.evaluationCriteria?.financialCriteria)}</p>
                                                                    <p className="font-bold">{s.score}/100</p>
                                                                </div>
                                                                {s.comment && <p className="italic text-gray-500 mt-1 pl-1 border-l-2 border-gray-300">"{s.comment}"</p>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                     <div>
                                                        <h4 className="font-semibold text-sm mb-2 text-gray-800">Technical Evaluation ({requisition.evaluationCriteria?.technicalWeight}%)</h4>
                                                        {scoreSet.technicalScores.map(s => (
                                                             <div key={s.criterionId} className="text-xs p-2 bg-gray-50 rounded-md mb-2">
                                                                <div className="flex justify-between items-center font-medium">
                                                                    <p>{getCriterionName(s.criterionId, requisition.evaluationCriteria?.technicalCriteria)}</p>
                                                                    <p className="font-bold">{s.score}/100</p>
                                                                </div>
                                                                {s.comment && <p className="italic text-gray-500 mt-1 pl-1 border-l-2 border-gray-300">"{s.comment}"</p>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {scoreSet.committeeComment && <p className="text-sm italic text-gray-600 mt-3 p-3 bg-gray-100 rounded-md"><strong>Overall Comment:</strong> "{scoreSet.committeeComment}"</p>}
                                            </div>
                                        ))
                                     ) : <p className="text-sm text-gray-500 text-center py-8">No scores submitted for this quote.</p>}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                    <Button onClick={handleGeneratePdf} disabled={isGeneratingPdf}>
                        {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Printer className="mr-2 h-4 w-4"/>}
                        Generate PDF
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const ExtendDeadlineDialog = ({ isOpen, onClose, member, requisition, onSuccess }: { isOpen: boolean, onClose: () => void, member: User, requisition: PurchaseRequisition, onSuccess: () => void }) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [isSubmitting, setSubmitting] = useState(false);
    const [newDeadline, setNewDeadline] = useState<Date|undefined>();
    const [newDeadlineTime, setNewDeadlineTime] = useState('17:00');

    const finalNewDeadline = useMemo(() => {
        if (!newDeadline) return undefined;
        const [hours, minutes] = newDeadlineTime.split(':').map(Number);
        return setMinutes(setHours(newDeadline, hours), minutes);
    }, [newDeadline, newDeadlineTime]);
    
    const handleSubmit = async () => {
        if (!user || !finalNewDeadline) return;
        if (isBefore(finalNewDeadline, new Date())) {
            toast({ variant: 'destructive', title: 'Error', description: 'The new deadline must be in the future.' });
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch(`/api/requisitions/${requisition.id}/extend-scoring-deadline`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, newDeadline: finalNewDeadline })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to extend deadline.');
            }

            toast({ title: 'Success', description: 'Scoring deadline has been extended for all committee members.' });
            onSuccess();
            onClose();

        } catch (error) {
             toast({ variant: 'destructive', title: 'Error', description: error instanceof Error ? error.message : 'An unknown error occurred.'});
        } finally {
            setSubmitting(false);
        }
    }


    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Extend Scoring Deadline</DialogTitle>
                    <DialogDescription>Set a new scoring deadline for all committee members of this requisition.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label>New Scoring Deadline</Label>
                        <div className="flex gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !newDeadline && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {newDeadline ? format(newDeadline, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={newDeadline} onSelect={setNewDeadline} initialFocus disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))} /></PopoverContent>
                            </Popover>
                             <Input type="time" className="w-32" value={newDeadlineTime} onChange={(e) => setNewDeadlineTime(e.target.value)} />
                        </div>
                    </div>
                </div>
                 <DialogFooter>
                    <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                    <Button onClick={handleSubmit} disabled={isSubmitting || !finalNewDeadline}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Extension
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const OverdueReportDialog = ({ isOpen, onClose, member }: { isOpen: boolean, onClose: () => void, member: User }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Overdue Member Report</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                     <p>This is a placeholder for a detailed report about the overdue committee member for internal follow-up.</p>
                     <div className="p-4 border rounded-md bg-muted/50">
                        <p><span className="font-semibold">Member Name:</span> {member.name}</p>
                        <p><span className="font-semibold">Email:</span> {member.email}</p>
                        <p><span className="font-semibold">Assigned Role:</span> {member.role}</p>
                     </div>
                </div>
                <DialogFooter>
                    <Button onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}


const CommitteeActions = ({
    user,
    requisition,
    quotations,
    onFinalScoresSubmitted,
}: {
    user: User,
    requisition: PurchaseRequisition,
    quotations: Quotation[],
    onFinalScoresSubmitted: () => void,
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    
    const userScoredQuotesCount = quotations.filter(q => q.scores?.some(s => s.scorerId === user.id)).length;
    const allQuotesScored = userScoredQuotesCount === quotations.length;
    const scoresAlreadyFinalized = user.committeeAssignments?.find(a => a.requisitionId === requisition.id)?.scoresSubmitted || false;

    const handleSubmitScores = async () => {
        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/requisitions/${requisition.id}/submit-scores`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to submit scores');
            }
            toast({ title: 'Scores Submitted', description: 'Your final scores have been recorded.'});
            onFinalScoresSubmitted();
        } catch (error) {
             toast({
                variant: 'destructive',
                title: 'Error',
                description: error instanceof Error ? error.message : 'An unknown error occurred.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (user.role !== 'Committee Member' || scoresAlreadyFinalized) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Committee Actions</CardTitle>
                <CardDescription>Finalize your evaluation for this requisition.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">You have scored {userScoredQuotesCount} of {quotations.length} quotes.</p>
            </CardContent>
            <CardFooter>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button disabled={!allQuotesScored || isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit Final Scores
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure you want to submit?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will finalize your scores for this requisition. You will not be able to make further changes.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleSubmitScores}>Confirm and Submit</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
        </Card>
    );
};


export default function QuotationDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { user, allUsers, login } = useAuth();
  const id = params.id as string;
  const role = user?.role;
  
  const [requisition, setRequisition] = useState<PurchaseRequisition | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddFormOpen, setAddFormOpen] = useState(false);
  const [isCommitteeDialogOpen, setCommitteeDialogOpen] = useState(false);
  const [isScoringFormOpen, setScoringFormOpen] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [selectedQuoteForScoring, setSelectedQuoteForScoring] = useState<Quotation | null>(null);
  const [lastPOCreated, setLastPOCreated] = useState<PurchaseOrder | null>(null);
  const [isChangingAward, setIsChangingAward] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isReportOpen, setReportOpen] = useState(false);

  const fetchRequisitionAndQuotes = async () => {
        if (!id) return;
        setLoading(true);
        setLastPOCreated(null);
        try {
            const [reqResponse, venResponse, quoResponse, usersResponse] = await Promise.all([
                fetch('/api/requisitions'),
                fetch('/api/vendors'),
                fetch(`/api/quotations?requisitionId=${id}`),
                fetch('/api/users'), 
            ]);
            const allReqs = await reqResponse.json();
            const venData = await venResponse.json();
            const quoData = await quoResponse.json();
            const allUsersData = await usersResponse.json();
            if (user && !allUsers.some(u => u.id === user.id)) {
                const currentUserData = allUsersData.find((u:User) => u.id === user.id);
                if (currentUserData) {
                    const { token } = JSON.parse(localStorage.getItem('authToken') || '{}');
                    login(token, currentUserData, currentUserData.role as any);
                }
            }

            const currentReq = allReqs.find((r: PurchaseRequisition) => r.id === id);

            if (currentReq) {
                const awardedQuote = quoData.find((q: Quotation) => q.status === 'Awarded');
                if (awardedQuote && currentReq.awardResponseDeadline && isPast(new Date(currentReq.awardResponseDeadline))) {
                    toast({
                        title: 'Deadline Missed',
                        description: `Vendor ${awardedQuote.vendorName} missed the response deadline. Promoting next vendor.`,
                        variant: 'destructive',
                    });
                    const promoteAction = awardedQuote.rank === 1 && secondStandby ? 'promote_second' : 'promote_third';
                    await handleAwardChange(promoteAction);
                    const [refetchedReqRes, refetchedQuoRes] = await Promise.all([
                        fetch('/api/requisitions'),
                        fetch(`/api/quotations?requisitionId=${id}`)
                    ]);
                    const refetchedReqs = await refetchedReqRes.json();
                    const refetchedQuos = await refetchedQuoRes.json();
                    setRequisition(refetchedReqs.find((r: PurchaseRequisition) => r.id === id));
                    setQuotations(refetchedQuos);
                } else {
                    setRequisition(currentReq);
                    setQuotations(quoData);
                }
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Requisition not found.' });
            }
            
            setVendors(venData);

        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch data.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id && user) {
            fetchRequisitionAndQuotes();
        }
    }, [id, user]);

  const isAwarded = useMemo(() => quotations.some(q => q.status === 'Awarded' || q.status === 'Accepted' || q.status === 'Declined' || q.status === 'Failed'), [quotations]);
  const isAccepted = useMemo(() => quotations.some(q => q.status === 'Accepted'), [quotations]);
  const secondStandby = useMemo(() => quotations.find(q => q.rank === 2), [quotations]);
  const thirdStandby = useMemo(() => quotations.find(q => q.rank === 3), [quotations]);
  const prevAwardedFailed = useMemo(() => quotations.some(q => q.status === 'Failed'), [quotations]);
  
  const isDeadlinePassed = useMemo(() => {
    if (!requisition) return false;
    return requisition.deadline ? isPast(new Date(requisition.deadline)) : false;
  }, [requisition]);

  const isScoringDeadlinePassed = useMemo(() => {
    if (!requisition || !requisition.scoringDeadline) return false;
    return isPast(new Date(requisition.scoringDeadline));
  }, [requisition]);

  const isScoringComplete = useMemo(() => {
    if (!requisition) return false;
    const allMemberIds = [
        ...(requisition.financialCommitteeMemberIds || []),
        ...(requisition.technicalCommitteeMemberIds || [])
    ];
    if (allMemberIds.length === 0) return false; // Not complete if no one is assigned
    if (quotations.length === 0) return true; // Vacuously true if there are no quotes to score

    // Check that every member has scored every quote
    return allMemberIds.every(memberId => 
        quotations.every(quote => 
            quote.scores?.some(score => score.scorerId === memberId)
        )
    );
  }, [requisition, quotations, allUsers]);

  const handleRfqSent = () => fetchRequisitionAndQuotes();
  const handleQuoteAdded = () => { setAddFormOpen(false); fetchRequisitionAndQuotes(); }
  const handleContractFinalized = () => fetchRequisitionAndQuotes();
  const handlePOCreated = (po: PurchaseOrder) => { fetchRequisitionAndQuotes(); setLastPOCreated(po); }
  
  const handleFinalizeScores = async (awardResponseDeadline?: Date) => {
    if (!user || !requisition) return;

    let durationMinutes: number | undefined;
    if (awardResponseDeadline) {
      if (isBefore(awardResponseDeadline, new Date())) {
        toast({
          variant: 'destructive',
          title: 'Invalid Deadline',
          description: 'The award response deadline must be in the future.',
        });
        return;
      }
      durationMinutes = (awardResponseDeadline.getTime() - new Date().getTime()) / (1000 * 60);
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
    if (!user || !id || !requisition) return;
    
    const newDeadline = requisition.awardResponseDurationMinutes 
        ? new Date(Date.now() + requisition.awardResponseDurationMinutes * 60 * 1000) 
        : undefined;

    setIsChangingAward(true);
    try {
        const response = await fetch(`/api/requisitions/${id}/handle-award-change`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, action, newDeadline }),
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

  const currentStep = useMemo((): 'rfq' | 'committee' | 'award' | 'finalize' | 'completed' => {
      if (!requisition) return 'rfq';
      const status = requisition.status;
      const anyAwardedOrAccepted = quotations.some(q => ['Awarded', 'Accepted', 'Declined', 'Failed'].includes(q.status));
      const anyAccepted = quotations.some(q => q.status === 'Accepted');

      if (status === 'PO_Created') return 'completed';
      if (anyAccepted) return 'finalize';
      if (anyAwardedOrAccepted) return 'award';
      if (status === 'RFQ_In_Progress' && isDeadlinePassed) return 'committee';
      if (status === 'RFQ_In_Progress' && !isDeadlinePassed) return 'rfq';
      if (status === 'Approved') return 'rfq';
      
      return 'committee';
  }, [requisition, quotations, isDeadlinePassed]);
  
  const formatEvaluationCriteria = (criteria?: EvaluationCriteria) => {
      if (!criteria) return "No specific criteria defined.";

      const formatSection = (title: string, weight: number, items: any[]) => {
          if (!items || items.length === 0) return `${title} (Overall Weight: ${weight}%):\n- No criteria defined.`;
          const itemDetails = items.map(item => `- ${item.name} (${item.weight}%)`).join('\n');
          return `${title} (Overall Weight: ${weight}%):\n${itemDetails}`;
      };

      const financialPart = formatSection('Financial Criteria', criteria.financialWeight, criteria.financialCriteria);
      const technicalPart = formatSection('Technical Criteria', criteria.technicalWeight, criteria.technicalCriteria);
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
        
        {prevAwardedFailed && (
             <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Award Failover</AlertTitle>
                <AlertDescription>
                    A previously awarded vendor failed to respond or declined the award. The award has been automatically passed to the next standby vendor.
                </AlertDescription>
            </Alert>
        )}
        
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
        
        {currentStep === 'rfq' && (
             <RFQDistribution 
                requisition={requisition} 
                vendors={vendors} 
                onRfqSent={fetchRequisitionAndQuotes}
            />
        )}
        
        {currentStep === 'committee' && (
            <CommitteeManagement
                requisition={requisition} 
                onCommitteeUpdated={fetchRequisitionAndQuotes}
                open={isCommitteeDialogOpen}
                onOpenChange={setCommitteeDialogOpen}
            />
        )}

        {currentStep !== 'rfq' && (
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
                        {isAwarded && isScoringComplete && role === 'Procurement Officer' && (
                            <Button variant="secondary" onClick={() => setReportOpen(true)}>
                                <FileBarChart2 className="mr-2 h-4 w-4" /> View Cumulative Report
                            </Button>
                        )}
                        {isAwarded && requisition.status !== 'PO_Created' && role === 'Procurement Officer' && (
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
                        {role !== 'Committee Member' && (
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
                        isScoringDeadlinePassed={isScoringDeadlinePassed}
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
                            isScoringDeadlinePassed={isScoringDeadlinePassed}
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
        
        {currentStep === 'committee' && quotations.length > 0 && isDeadlinePassed && (
             <ScoringProgressTracker 
                requisition={requisition}
                quotations={quotations}
                allUsers={allUsers}
                onFinalize={handleFinalizeScores}
                onCommitteeUpdate={setCommitteeDialogOpen}
                isFinalizing={isFinalizing}
                isAwarded={isAwarded}
            />
        )}
        
        {user.role === 'Committee Member' && currentStep === 'committee' && isDeadlinePassed && (
             <CommitteeActions 
                user={user}
                requisition={requisition}
                quotations={quotations}
                onFinalScoresSubmitted={fetchRequisitionAndQuotes}
             />
        )}
        
        {isAccepted && requisition.status !== 'PO_Created' && role !== 'Committee Member' && (
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
