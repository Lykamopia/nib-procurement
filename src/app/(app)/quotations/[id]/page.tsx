

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
import { Loader2, PlusCircle, Award, XCircle, FileSignature, FileText, Bot, Lightbulb, ArrowLeft, Star, Undo, Check, Send, Search, BadgeHelp, BadgeCheck, BadgeX, Crown, Medal, Trophy, RefreshCw, TimerOff, ClipboardList, TrendingUp, Scale, Edit2, Users, GanttChart, Eye, CheckCircle, CalendarIcon, Timer, Landmark, Settings2, Ban, Printer, FileBarChart2, UserCog, History, AlertCircle, FileUp, TrophyIcon } from 'lucide-react';
import { useForm, useFieldArray, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PurchaseOrder, PurchaseRequisition, Quotation, Vendor, QuotationStatus, EvaluationCriteria, User, CommitteeScoreSet, EvaluationCriterion, QuoteItem } from '@/lib/types';
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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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
    const { user } = useAuth();

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

    const onSubmit = async (values: any) => {
        if (!user) return;
        setSubmitting(true);
        try {
            const response = await fetch('/api/quotations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...values, requisitionId: requisition.id, vendorId: user.vendorId }),
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

const QuoteComparison = ({ quotes, requisition, onScore, user, isDeadlinePassed, isScoringDeadlinePassed, isAwarded }: { quotes: Quotation[], requisition: PurchaseRequisition, onScore: (quote: Quotation, hidePrices: boolean) => void, user: User, isDeadlinePassed: boolean, isScoringDeadlinePassed: boolean, isAwarded: boolean }) => {

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
            case 'Invoice_Submitted': return 'outline';
            case 'Partially_Awarded': return 'default';
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
    
    const isTechnicalOnlyScorer = user.role === 'Committee Member' && requisition.technicalCommitteeMemberIds?.includes(user.id) && !requisition.financialCommitteeMemberIds?.includes(user.id);
    const hidePrices = isTechnicalOnlyScorer && !requisition.rfqSettings?.technicalEvaluatorSeesPrices;


    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quotes.sort((a, b) => (a.rank || 4) - (b.rank || 4)).map(quote => {
                const hasUserScored = quote.scores?.some(s => s.scorerId === user.id);
                return (
                    <Card key={quote.id} className={cn("flex flex-col", (quote.status === 'Awarded' || quote.status === 'Accepted' || quote.status === 'Partially_Awarded') && 'border-primary ring-2 ring-primary')}>
                       <CardHeader>
                            <CardTitle className="flex justify-between items-start">
                               <div className="flex items-center gap-2">
                                 {isDeadlinePassed && getRankIcon(quote.rank)}
                                 <span>{quote.vendorName}</span>
                               </div>
                               <Badge variant={getStatusVariant(quote.status)}>{quote.status.replace(/_/g, ' ')}</Badge>
                            </CardTitle>
                            <CardDescription>
                                <span className="text-xs">Submitted {formatDistanceToNow(new Date(quote.createdAt), { addSuffix: true })}</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-4">
                             {(isDeadlinePassed || quote.cpoDocumentUrl) ? (
                                <>
                                    {hidePrices ? (
                                        <div className="text-center py-4">
                                            <p className="font-semibold text-muted-foreground">Pricing information is hidden for technical evaluation.</p>
                                        </div>
                                    ) : (
                                        <>
                                            {isDeadlinePassed && <div className="text-3xl font-bold text-center">{quote.totalPrice.toLocaleString()} ETB</div>}
                                            {isDeadlinePassed && <div className="text-center text-muted-foreground">Est. Delivery: {format(new Date(quote.deliveryDate), 'PP')}</div>}
                                        </>
                                    )}

                                    
                                    {quote.cpoDocumentUrl && (
                                        <div className="text-sm space-y-1 pt-2 border-t">
                                            <h4 className="font-semibold">CPO Document</h4>
                                            <Button asChild variant="link" className="p-0 h-auto">
                                                <a href={quote.cpoDocumentUrl} target="_blank" rel="noopener noreferrer">{quote.cpoDocumentUrl.split('/').pop()}</a>
                                            </Button>
                                        </div>
                                    )}
                                     {quote.experienceDocumentUrl && (
                                        <div className="text-sm space-y-1 pt-2 border-t">
                                            <h4 className="font-semibold">Experience Document</h4>
                                            <Button asChild variant="link" className="p-0 h-auto">
                                                <a href={quote.experienceDocumentUrl} target="_blank" rel="noopener noreferrer">{quote.experienceDocumentUrl.split('/').pop()}</a>
                                            </Button>
                                        </div>
                                    )}

                                    {isDeadlinePassed && (
                                        <div className="text-sm space-y-2">
                                        <h4 className="font-semibold">Items:</h4>
                                            {quote.items.map(item => (
                                                <div key={item.requisitionItemId} className="flex justify-between items-center text-muted-foreground">
                                                    <span>{item.name} x {item.quantity}</span>
                                                    {!hidePrices && <span className="font-mono">{item.unitPrice.toFixed(2)} ETB ea.</span>}
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
                             {isAwarded && typeof quote.finalAverageScore === 'number' && (
                                 <div className="text-center pt-2 border-t">
                                    <h4 className="font-semibold text-sm">Final Score</h4>
                                    <p className="text-2xl font-bold text-primary">{quote.finalAverageScore.toFixed(2)}</p>
                                 </div>
                             )}
                        </CardContent>
                        <CardFooter className="flex flex-col gap-2">
                            {user.role === 'Committee Member' && (
                                <Button className="w-full" variant={hasUserScored ? "secondary" : "outline"} onClick={() => onScore(quote, hidePrices)} disabled={isScoringDeadlinePassed && !hasUserScored}>
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

const ContractManagement = ({ requisition, onContractFinalized }: { requisition: PurchaseRequisition, onContractFinalized: () => void }) => {
    const [isSubmitting, setSubmitting] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();
    const [file, setFile] = useState<File | null>(null);

    const awardedQuote = requisition.quotations?.find(q => q.status === 'Accepted');

    const onContractSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!user || !awardedQuote || !file) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a file to upload.' });
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const uploadResponse = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });
            const uploadResult = await uploadResponse.json();
            if (!uploadResponse.ok) {
                throw new Error(uploadResult.error || 'Failed to upload file.');
            }
            const filePath = uploadResult.path;

            const notes = (event.target as any).notes.value;

            const response = await fetch(`/api/requisitions/${requisition.id}/contract`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName: filePath, notes, userId: user.id }),
            });
            if (!response.ok) throw new Error("Failed to save contract details.");

            toast({ title: "Contract Details Saved!", description: "The PO can now be formally sent to the vendor." });
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
                        <Input id="fileName" name="fileName" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
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

const CommitteeManagement = ({ requisition, onCommitteeUpdated, open, onOpenChange, isAuthorized }: { requisition: PurchaseRequisition; onCommitteeUpdated: () => void; open: boolean; onOpenChange: (open: boolean) => void; isAuthorized: boolean; }) => {
    const { user, allUsers } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setSubmitting] = useState(false);
    const [deadlineDate, setDeadlineDate] = useState<Date|undefined>(
        requisition.scoringDeadline ? new Date(requisition.scoringDeadline) : undefined
    );
    const [deadlineTime, setDeadlineTime] = useState(
        requisition.scoringDeadline ? format(new Date(requisition.scoringDeadline), 'HH:mm') : '17:00'
    );
    const [technicalViewPrices, setTechnicalViewPrices] = useState(requisition.rfqSettings?.technicalEvaluatorSeesPrices ?? false);
    
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
        setTechnicalViewPrices(requisition.rfqSettings?.technicalEvaluatorSeesPrices ?? false);
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
                    scoringDeadline: finalDeadline,
                    rfqSettings: {
                        ...requisition.rfqSettings,
                        technicalEvaluatorSeesPrices: technicalViewPrices
                    }
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

    const triggerButton = (
        <Button variant="outline" className="w-full sm:w-auto" disabled={!isAuthorized}>
            {allAssignedMemberIds.length > 0 ? (
                <><Edit2 className="mr-2 h-4 w-4" /> Edit Committee</>
            ) : (
                <><Users className="mr-2 h-4 w-4" /> Assign Committee</>
            )}
        </Button>
    );


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
                         {isAuthorized ? (
                            triggerButton
                        ) : (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span tabIndex={0}>{triggerButton}</span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>You are not authorized to manage committees.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl flex flex-col max-h-[90vh]">
                         <Form {...form}>
                         <form onSubmit={form.handleSubmit(handleSaveCommittee)} className="flex flex-col flex-1 min-h-0">
                        <DialogHeader>
                            <DialogTitle>Evaluation Committee</DialogTitle>
                            <DialogDescription>Assign members to evaluate the quotations for this requisition.</DialogDescription>
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
                                <div className="grid md:grid-cols-2 gap-4">
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
                                    <div className="space-y-2">
                                        <FormLabel>Price Visibility</FormLabel>
                                        <div className="flex items-center space-x-2 rounded-md border p-2 h-10">
                                            <Switch 
                                                id="technical-view-prices" 
                                                checked={technicalViewPrices}
                                                onCheckedChange={setTechnicalViewPrices}
                                            />
                                            <Label htmlFor="technical-view-prices">Allow technical evaluators to see prices</Label>
                                        </div>
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

const rfqFormSchema = z.object({
  distributionType: z.enum(['all', 'select']),
  selectedVendors: z.array(z.string()),
  deadlineDate: z.date().optional(),
  deadlineTime: z.string(),
  cpoAmount: z.coerce.number().optional(),
  allowQuoteEdits: z.boolean(),
  experienceDocumentRequired: z.boolean(),
  evaluationCriteria: z.object({
    financialWeight: z.coerce.number().min(0).max(100),
    technicalWeight: z.coerce.number().min(0).max(100),
    financialCriteria: z.array(z.object({ name: z.string().min(1), weight: z.coerce.number().min(1) })),
    technicalCriteria: z.array(z.object({ name: z.string().min(1), weight: z.coerce.number().min(1) })),
  }),
  customQuestions: z.array(z.object({
    questionText: z.string().min(1),
    questionType: z.enum(['text', 'boolean', 'multiple-choice', 'file']),
    isRequired: z.boolean(),
    options: z.array(z.string()).optional(),
  })),
}).refine(data => data.evaluationCriteria.financialWeight + data.evaluationCriteria.technicalWeight === 100, {
  message: "Financial and technical weights must add up to 100.",
  path: ["evaluationCriteria.financialWeight"],
});

const RFQDistribution = ({ requisition, vendors, onRfqSent, isAuthorized }: { requisition: PurchaseRequisition; vendors: Vendor[]; onRfqSent: () => void; isAuthorized: boolean; }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [actionDialog, setActionDialog] = useState<{isOpen: boolean, type: 'update' | 'cancel'}>({isOpen: false, type: 'update'});
    const [vendorSearch, setVendorSearch] = useState("");
    const [isSubmitting, setSubmitting] = useState(false);

    const form = useForm<z.infer<typeof rfqFormSchema>>({
        resolver: zodResolver(rfqFormSchema),
        defaultValues: {
            distributionType: 'all',
            selectedVendors: [],
            deadlineDate: requisition.deadline ? new Date(requisition.deadline) : undefined,
            deadlineTime: requisition.deadline ? format(new Date(requisition.deadline), 'HH:mm') : '17:00',
            cpoAmount: requisition.cpoAmount || undefined,
            allowQuoteEdits: requisition.rfqSettings?.allowQuoteEdits ?? true,
            experienceDocumentRequired: requisition.rfqSettings?.experienceDocumentRequired ?? false,
            evaluationCriteria: requisition.evaluationCriteria || {
                financialWeight: 50,
                technicalWeight: 50,
                financialCriteria: [],
                technicalCriteria: [],
            },
            customQuestions: requisition.customQuestions || [],
        },
    });
    
    const { fields: finCriteria, append: appendFin, remove: removeFin } = useFieldArray({ control: form.control, name: "evaluationCriteria.financialCriteria" });
    const { fields: techCriteria, append: appendTech, remove: removeTech } = useFieldArray({ control: form.control, name: "evaluationCriteria.technicalCriteria" });
    const { fields: customQuestions, append: appendQuestion, remove: removeQuestion } = useFieldArray({ control: form.control, name: "customQuestions" });

    
    const isSent = requisition.status === 'RFQ In Progress' || requisition.status === 'PO Created';
    const canTakeAction = !isSent && isAuthorized;
    
    useEffect(() => {
        form.reset({
            distributionType: (requisition.allowedVendorIds && requisition.allowedVendorIds.length > 0) ? 'select' : 'all',
            selectedVendors: requisition.allowedVendorIds || [],
            deadlineDate: requisition.deadline ? new Date(requisition.deadline) : undefined,
            deadlineTime: requisition.deadline ? format(new Date(requisition.deadline), 'HH:mm') : '17:00',
            cpoAmount: requisition.cpoAmount || undefined,
            allowQuoteEdits: requisition.rfqSettings?.allowQuoteEdits ?? true,
            experienceDocumentRequired: requisition.rfqSettings?.experienceDocumentRequired ?? false,
            evaluationCriteria: requisition.evaluationCriteria || {
                financialWeight: 50, technicalWeight: 50, financialCriteria: [], technicalCriteria: [],
            },
            customQuestions: requisition.customQuestions || [],
        });
    }, [requisition, form]);

    const handleSendRFQ = async (values: z.infer<typeof rfqFormSchema>) => {
        if (!user || !values.deadlineDate) return;

        const deadline = setMinutes(setHours(values.deadlineDate, values.deadlineTime.split(':').map(Number)[0]), values.deadlineTime.split(':').map(Number)[1]);
        
        if (isBefore(deadline, new Date())) {
            toast({ variant: 'destructive', title: 'Invalid Deadline', description: 'The quotation submission deadline must be in the future.' });
            return;
        }

        if (values.distributionType === 'select' && values.selectedVendors.length === 0) {
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
                    vendorIds: values.distributionType === 'all' ? [] : values.selectedVendors,
                    deadline,
                    cpoAmount: values.cpoAmount,
                    rfqSettings: { allowQuoteEdits: values.allowQuoteEdits, experienceDocumentRequired: values.experienceDocumentRequired },
                    evaluationCriteria: values.evaluationCriteria,
                    customQuestions: values.customQuestions,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to send RFQ.');
            }

            toast({ title: 'RFQ Sent!', description: 'The requisition is now open for quotations.' });
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
        const verifiedVendors = Array.isArray(vendors) ? vendors.filter(v => v.kycStatus === 'Verified') : [];
        if (!vendorSearch) return verifiedVendors;
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
            <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSendRFQ)}>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>RFQ Distribution</CardTitle>
                        <CardDescription>{isSent ? "The RFQ has been distributed." : "Send the RFQ to vendors to begin receiving bids."}</CardDescription>
                    </div>
                     {isSent && requisition.status !== 'PO Created' && isAuthorized && (
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setActionDialog({isOpen: true, type: 'update'})}><Settings2 className="mr-2"/> Update RFQ</Button>
                            <Button type="button" variant="destructive" size="sm" onClick={() => setActionDialog({isOpen: true, type: 'cancel'})}><Ban className="mr-2"/> Cancel RFQ</Button>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="space-y-6">
                    {!isAuthorized && !isSent && (
                        <Alert variant="default" className="border-amber-500/50">
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                            <AlertTitle>Read-Only Mode</AlertTitle>
                            <AlertDescription>You do not have permission to send RFQs.</AlertDescription>
                        </Alert>
                    )}
                    <div className="grid md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="deadlineDate" render={({ field }) => (
                            <FormItem><FormLabel>Quotation Submission Deadline</FormLabel>
                                <div className="flex gap-2">
                                <Popover><PopoverTrigger asChild>
                                    <Button variant={"outline"} disabled={!canTakeAction} className={cn("flex-1", !field.value && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) || !canTakeAction} initialFocus /></PopoverContent></Popover>
                                <FormField control={form.control} name="deadlineTime" render={({ field: timeField }) => (<Input type="time" className="w-32" {...timeField} disabled={!canTakeAction} />)} />
                                </div>
                            </FormItem>)} />
                        <FormField control={form.control} name="distributionType" render={({ field }) => (
                            <FormItem><FormLabel>Distribution Type</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!canTakeAction}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="all">Send to all verified vendors</SelectItem><SelectItem value="select">Send to selected vendors</SelectItem></SelectContent></Select></FormItem>
                        )} />
                    </div>
                    {/* ... other fields ... */}

                    <Separator />
                    <Accordion type="multiple" className="w-full space-y-4">
                        <AccordionItem value="item-1">
                            <AccordionTrigger className="text-lg font-semibold">Evaluation Criteria</AccordionTrigger>
                            <AccordionContent className="space-y-4 pt-2">
                                {/* Evaluation criteria form fields */}
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                            <AccordionTrigger className="text-lg font-semibold">Custom Questions for Vendors</AccordionTrigger>
                            <AccordionContent className="space-y-4 pt-2">
                                {/* Custom questions form fields */}
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>


                </CardContent>
                <CardFooter>
                     {isSent ? (
                        <Badge variant="default" className="gap-2"><CheckCircle className="h-4 w-4" />RFQ Distributed on {format(new Date(requisition.updatedAt), 'PP')}</Badge>
                    ) : (
                        <Button type="submit" disabled={isSubmitting || !isAuthorized}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Send RFQ
                        </Button>
                    )}
                </CardFooter>
            </form>
            </Form>
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
        if (currentIndex === targetIndex) return 'active';
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
  itemScores: z.array(z.object({
      quoteItemId: z.string(),
      financialScores: z.array(z.object({
          criterionId: z.string(),
          score: z.coerce.number().min(0).max(100),
          comment: z.string().optional(),
      })),
      technicalScores: z.array(z.object({
          criterionId: z.string(),
          score: z.coerce.number().min(0).max(100),
          comment: z.string().optional(),
      })),
  }))
});
type ScoreFormValues = z.infer<typeof scoreFormSchema>;

const ScoringDialog = ({ 
    quote, 
    requisition, 
    user, 
    onScoreSubmitted,
    isScoringDeadlinePassed,
    hidePrices,
}: { 
    quote: Quotation; 
    requisition: PurchaseRequisition; 
    user: User; 
    onScoreSubmitted: () => void;
    isScoringDeadlinePassed: boolean;
    hidePrices: boolean;
}) => {
    const { toast } = useToast();
    const [isSubmitting, setSubmitting] = useState(false);
    
    const form = useForm<ScoreFormValues>({
        resolver: zodResolver(scoreFormSchema),
    });

    const { fields: itemScoreFields, replace: replaceItemScores } = useFieldArray({
        control: form.control,
        name: "itemScores",
    });

    useEffect(() => {
        if (quote && requisition) {
            const existingScoreSet = quote.scores?.find(s => s.scorerId === user.id);
            const initialItemScores = quote.items.map(item => {
                const existingItemScore = existingScoreSet?.itemScores.find(i => i.quoteItemId === item.id);
                return {
                    quoteItemId: item.id,
                    financialScores: requisition.evaluationCriteria?.financialCriteria.map(c => {
                        const existing = existingItemScore?.financialScores.find(s => s.criterionId === c.id);
                        return { criterionId: c.id, score: existing?.score || 0, comment: existing?.comment || "" };
                    }) || [],
                    technicalScores: requisition.evaluationCriteria?.technicalCriteria.map(c => {
                        const existing = existingItemScore?.technicalScores.find(s => s.criterionId === c.id);
                        return { criterionId: c.id, score: existing?.score || 0, comment: existing?.comment || "" };
                    }) || [],
                }
            });
            form.reset({
                committeeComment: existingScoreSet?.committeeComment || "",
                itemScores: initialItemScores,
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
    const isFinancialScorer = requisition.financialCommitteeMemberIds?.includes(user.id);
    const isTechnicalScorer = requisition.technicalCommitteeMemberIds?.includes(user.id);

    const renderCriteria = (itemIndex: number, type: 'financial' | 'technical') => {
        const criteria = type === 'financial' ? requisition.evaluationCriteria!.financialCriteria : requisition.evaluationCriteria!.technicalCriteria;
        const fieldName = `itemScores.${itemIndex}.${type}Scores`;

        return criteria.map((criterion, criterionIndex) => (
            <div key={criterion.id} className="space-y-2 rounded-md border p-4">
                <div className="flex justify-between items-center">
                    <FormLabel>{criterion.name}</FormLabel>
                    <Badge variant="secondary">Weight: {criterion.weight}%</Badge>
                </div>
                 <FormField
                    control={form.control}
                    name={`${fieldName}.${criterionIndex}.score`}
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
                    name={`${fieldName}.${criterionIndex}.comment`}
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
    
    const originalItems = useMemo(() => {
        const itemIds = new Set(quote.items.map(i => i.requisitionItemId));
        return requisition.items.filter(i => itemIds.has(i.id));
    }, [requisition.items, quote.items]);

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
    
    return (
        <DialogContent className="max-w-4xl flex flex-col h-[95vh]">
            <DialogHeader>
                <DialogTitle>Score Quotation from {quote.vendorName}</DialogTitle>
                <DialogDescription>Evaluate each item in the quote against the requester's criteria. Your scores will be used to determine the final ranking.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 min-h-0 flex flex-col">
                <ScrollArea className="flex-1 pr-4 -mr-4">
                     <div className="space-y-6">
                        {originalItems.map(originalItem => {
                             const proposalsForItem = quote.items.filter(i => i.requisitionItemId === originalItem.id);
                             return (
                                 <Card key={originalItem.id} className="bg-muted/30">
                                     <CardHeader>
                                         <CardTitle>Requested Item: {originalItem.name} (Qty: {originalItem.quantity})</CardTitle>
                                         <CardDescription>Evaluate the following proposal(s) for this item.</CardDescription>
                                     </CardHeader>
                                     <CardContent className="space-y-4">
                                         {proposalsForItem.map(proposal => {
                                             const itemIndex = quote.items.findIndex(i => i.id === proposal.id);
                                             return (
                                                <Card key={proposal.id} className="bg-background">
                                                    <CardHeader>
                                                        <CardTitle className="text-lg">{proposal.name}</CardTitle>
                                                        {!hidePrices && 
                                                            <CardDescription>
                                                                Quantity: {proposal.quantity} | Unit Price: {proposal.unitPrice.toFixed(2)} ETB
                                                            </CardDescription>
                                                        }
                                                    </CardHeader>
                                                    <CardContent className="space-y-4">
                                                        {isFinancialScorer && !hidePrices && (
                                                            <div className="space-y-4">
                                                                <h4 className="font-semibold text-lg flex items-center gap-2"><Scale /> Financial Evaluation ({requisition.evaluationCriteria?.financialWeight}%)</h4>
                                                                {renderCriteria(itemIndex, 'financial')}
                                                            </div>
                                                        )}
                                                        {isTechnicalScorer && (
                                                            <div className="space-y-4">
                                                                <h4 className="font-semibold text-lg flex items-center gap-2"><TrendingUp /> Technical Evaluation ({requisition.evaluationCriteria?.technicalWeight}%)</h4>
                                                                {renderCriteria(itemIndex, 'technical')}
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                             );
                                         })}
                                     </CardContent>
                                 </Card>
                            )
                        })}
                        
                        <FormField
                            control={form.control}
                            name="committeeComment"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-lg font-semibold">Overall Comment</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Provide an overall summary or justification for your scores for this entire quotation..." {...field} rows={4} disabled={!!existingScore} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </ScrollArea>

                <DialogFooter className="pt-4 mt-4 border-t">
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
  onFinalize: (awardStrategy: 'all' | 'item', awards: any, awardResponseDeadline?: Date) => void;
  onCommitteeUpdate: (open: boolean) => void;
  isFinalizing: boolean;
  isAwarded: boolean;
}) => {
    const [isExtendDialogOpen, setExtendDialogOpen] = useState(false);
    const [isReportDialogOpen, setReportDialogOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState<User | null>(null);
    const [isAwardCenterOpen, setAwardCenterOpen] = useState(false);
    
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
            const assignment = member.committeeAssignments?.find(a => a.requisitionId === requisition.id);
            const hasSubmittedFinalScores = !!assignment?.scoresSubmitted;
            
            let submissionDate: Date | null = null;
            if (hasSubmittedFinalScores) {
                // To get the submission date, we can look at the latest score's submission time from that user for this requisition's quotes.
                const latestScore = quotations
                    .flatMap(q => q.scores || [])
                    .filter(s => s.scorerId === member.id)
                    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
                
                if (latestScore) {
                    submissionDate = new Date(latestScore.submittedAt);
                } else {
                    // Fallback if scores are not loaded but submission flag is true (edge case)
                    // We could perhaps look at the audit log here in a real-world complex system.
                    // For now, let's assume if the flag is true, a score exists.
                }
            }

            const isOverdue = isScoringDeadlinePassed && !hasSubmittedFinalScores;

            return {
                ...member,
                hasSubmittedFinalScores,
                isOverdue,
                submittedAt: submissionDate,
            };
        }).sort((a, b) => {
             if (a.submittedAt && b.submittedAt) return a.submittedAt.getTime() - b.submittedAt.getTime();
             if (a.submittedAt) return -1;
             if (b.submittedAt) return 1;
             return 0;
        });
    }, [assignedCommitteeMembers, quotations, isScoringDeadlinePassed, requisition.id]);
    
    const overdueMembers = scoringStatus.filter(s => s.isOverdue);
    const allHaveScored = scoringStatus.every(s => s.hasSubmittedFinalScores);


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
                                {member.hasSubmittedFinalScores && member.submittedAt ? (
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
                 <Dialog open={isAwardCenterOpen} onOpenChange={setAwardCenterOpen}>
                    <DialogTrigger asChild>
                         <Button disabled={!allHaveScored || isFinalizing || isAwarded}>
                            {isFinalizing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Finalize Scores and Award
                        </Button>
                    </DialogTrigger>
                    <AwardCenterDialog 
                        requisition={requisition}
                        quotations={quotations}
                        onFinalize={onFinalize}
                        onClose={() => setAwardCenterOpen(false)}
                    />
                 </Dialog>
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
                backgroundColor: null // Important for dark mode
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

            // Add a white background to the PDF before adding the image
            pdf.setFillColor(255, 255, 255);
            pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
            
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
                    <DialogTitle>Cumulative Scoring Report: How The Award Was Won</DialogTitle>
                    <DialogDescription>
                        A detailed breakdown of committee scores for requisition {requisition.id}, explaining the award decision.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-grow overflow-hidden">
                    <ScrollArea className="h-full">
                        <div ref={printRef} className="p-1 space-y-6 bg-background text-foreground print:bg-white print:text-black">
                            {/* Header for PDF */}
                            <div className="hidden print:block text-center mb-8 pt-4">
                                <Image src="/logo.png" alt="Logo" width={40} height={40} className="mx-auto mb-2" />
                                <h1 className="text-2xl font-bold text-black">Scoring & Award Justification Report</h1>
                                <p className="text-gray-600">{requisition.title}</p>
                                <p className="text-sm text-gray-500">{requisition.id}</p>
                                <p className="text-sm text-gray-500">Report Generated: {format(new Date(), 'PPpp')}</p>
                            </div>

                            {quotations.sort((a, b) => (a.rank || 99) - (b.rank || 99)).map(quote => (
                                <Card key={quote.id} className="break-inside-avoid print:border-gray-300 print:shadow-none print:rounded-lg">
                                    <CardHeader className="print:bg-gray-100 print:rounded-t-lg">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-xl">{quote.vendorName}</CardTitle>
                                                <CardDescription className="print:text-gray-700 pt-1">
                                                    Final Score: <span className="font-bold text-primary">{quote.finalAverageScore?.toFixed(2)}</span> | 
                                                    Rank: <span className="font-bold">{quote.rank || 'N/A'}</span> |
                                                    Total Price: <span className="font-bold">{quote.totalPrice.toLocaleString()} ETB</span>
                                                </CardDescription>
                                            </div>
                                            <Badge variant={quote.status === 'Awarded' || quote.status === 'Partially_Awarded' || quote.status === 'Accepted' ? 'default' : quote.status === 'Standby' ? 'secondary' : 'destructive'}>{quote.status.replace(/_/g, ' ')}</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4 space-y-4">
                                        {quote.scores && quote.scores.length > 0 ? (
                                            quote.scores.map(scoreSet => (
                                                <div key={scoreSet.scorerId} className="p-3 border rounded-md break-inside-avoid print:border-gray-200">
                                                    <div className="flex items-center justify-between mb-3 pb-2 border-b print:border-gray-200">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarImage src={`https://picsum.photos/seed/${scoreSet.scorerId}/32/32`} />
                                                                <AvatarFallback>{scoreSet.scorerName.charAt(0)}</AvatarFallback>
                                                            </Avatar>
                                                            <span className="font-semibold print:text-black">{scoreSet.scorerName}</span>
                                                        </div>
                                                        <div className="text-right">
                                                        <span className="font-bold text-lg text-primary">{scoreSet.finalScore.toFixed(2)}</span>
                                                        <p className="text-xs text-muted-foreground print:text-gray-500">Submitted {format(new Date(scoreSet.submittedAt), 'PPp')}</p>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
                                                        <div>
                                                            <h4 className="font-semibold text-sm mb-2 print:text-gray-800">Financial Evaluation ({requisition.evaluationCriteria?.financialWeight}%)</h4>
                                                            {scoreSet.itemScores?.flatMap(is => is.financialScores.map(s => (
                                                                <div key={s.criterionId} className="text-xs p-2 bg-muted/50 print:bg-gray-50 rounded-md mb-2">
                                                                    <div className="flex justify-between items-center font-medium">
                                                                        <p>{getCriterionName(s.criterionId, requisition.evaluationCriteria?.financialCriteria)}</p>
                                                                        <p className="font-bold">{s.score}/100</p>
                                                                    </div>
                                                                    {s.comment && <p className="italic text-muted-foreground print:text-gray-500 mt-1 pl-1 border-l-2 print:border-gray-300">"{s.comment}"</p>}
                                                                </div>
                                                            )))}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-sm mb-2 print:text-gray-800">Technical Evaluation ({requisition.evaluationCriteria?.technicalWeight}%)</h4>
                                                            {scoreSet.itemScores?.flatMap(is => is.technicalScores.map(s => (
                                                                <div key={s.criterionId} className="text-xs p-2 bg-muted/50 print:bg-gray-50 rounded-md mb-2">
                                                                    <div className="flex justify-between items-center font-medium">
                                                                        <p>{getCriterionName(s.criterionId, requisition.evaluationCriteria?.technicalCriteria)}</p>
                                                                        <p className="font-bold">{s.score}/100</p>
                                                                    </div>
                                                                    {s.comment && <p className="italic text-muted-foreground print:text-gray-500 mt-1 pl-1 border-l-2 print:border-gray-300">"{s.comment}"</p>}
                                                                </div>
                                                            )))}
                                                        </div>
                                                    </div>

                                                    {scoreSet.committeeComment && <p className="text-sm italic text-muted-foreground print:text-gray-600 mt-3 p-3 bg-muted/50 print:bg-gray-100 rounded-md"><strong>Overall Comment:</strong> "{scoreSet.committeeComment}"</p>}
                                                </div>
                                            ))
                                        ) : <p className="text-sm text-muted-foreground text-center py-8 print:text-gray-500">No scores submitted for this quote.</p>}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                    <Button onClick={handleGeneratePdf} disabled={isGeneratingPdf}>
                        {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Printer className="mr-2 h-4 w-4"/>}
                        Print / Export PDF
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


const AwardCenterDialog = ({
    requisition,
    quotations,
    onFinalize,
    onClose
}: {
    requisition: PurchaseRequisition;
    quotations: Quotation[];
    onFinalize: (awardStrategy: 'all' | 'item', awards: any, awardResponseDeadline?: Date) => void;
    onClose: () => void;
}) => {
    const [awardStrategy, setAwardStrategy] = useState<'item' | 'all'>('item');
    const [awardResponseDeadlineDate, setAwardResponseDeadlineDate] = useState<Date|undefined>();
    const [awardResponseDeadlineTime, setAwardResponseDeadlineTime] = useState('17:00');

    const awardResponseDeadline = useMemo(() => {
        if (!awardResponseDeadlineDate) return undefined;
        const [hours, minutes] = awardResponseDeadlineTime.split(':').map(Number);
        return setMinutes(setHours(awardResponseDeadlineDate, hours), minutes);
    }, [awardResponseDeadlineDate, awardResponseDeadlineTime]);
    
    // Per-item award logic
    const itemWinners = useMemo(() => {
        if (!requisition.items) return [];

        return requisition.items.map(reqItem => {
            let bestScore = -1;
            let winner: { vendorId: string; vendorName: string; quoteItemId: string; } | null = null;

            quotations.forEach(quote => {
                const proposalsForItem = quote.items.filter(i => i.requisitionItemId === reqItem.id);

                proposalsForItem.forEach(proposal => {
                    if (!quote.scores) return;

                    let totalItemScore = 0;
                    let scoreCount = 0;
                    
                    quote.scores.forEach(scoreSet => {
                        const itemScore = scoreSet.itemScores?.find(i => i.quoteItemId === proposal.id);
                        if (itemScore) {
                            totalItemScore += itemScore.finalScore;
                            scoreCount++;
                        }
                    });
                    
                    const averageItemScore = scoreCount > 0 ? totalItemScore / scoreCount : 0;
                    if (averageItemScore > bestScore) {
                        bestScore = averageItemScore;
                        winner = {
                            vendorId: quote.vendorId,
                            vendorName: quote.vendorName,
                            quoteItemId: proposal.id
                        };
                    }
                });
            });
            return {
                requisitionItemId: reqItem.id,
                name: reqItem.name,
                winner,
                bestScore,
            }
        });
    }, [requisition, quotations]);
    
    // Single vendor award logic
    const overallWinner = useMemo(() => {
        let bestOverallScore = -1;
        let overallWinner: { vendorId: string; vendorName: string; items: { requisitionItemId: string, quoteItemId: string }[] } | null = null;
        
        quotations.forEach(quote => {
            if (quote.finalAverageScore && quote.finalAverageScore > bestOverallScore) {
                bestOverallScore = quote.finalAverageScore;
                overallWinner = {
                    vendorId: quote.vendorId,
                    vendorName: quote.vendorName,
                    // Award all original items, assuming vendor quoted them
                    items: requisition.items.map(reqItem => {
                        const vendorItem = quote.items.find(i => i.requisitionItemId === reqItem.id);
                        return { requisitionItemId: reqItem.id, quoteItemId: vendorItem!.id }
                    }).filter(i => i.quoteItemId)
                }
            }
        });
        return { ...overallWinner, score: bestOverallScore };
    }, [quotations, requisition]);


    const handleConfirmAward = () => {
        let awards: { [vendorId: string]: { vendorName: string, items: { requisitionItemId: string, quoteItemId: string }[] } } = {};
        
        if (awardStrategy === 'item') {
             itemWinners.forEach(item => {
                if (item.winner) {
                    if (!awards[item.winner.vendorId]) {
                        awards[item.winner.vendorId] = { vendorName: item.winner.vendorName, items: [] };
                    }
                    awards[item.winner.vendorId].items.push({ requisitionItemId: item.requisitionItemId, quoteItemId: item.winner.quoteItemId });
                }
            });
        } else { // 'all'
           if (overallWinner?.vendorId) {
                awards[overallWinner.vendorId] = { 
                    vendorName: overallWinner.vendorName!, 
                    items: overallWinner.items!
                };
           }
        }

        onFinalize(awardStrategy, awards, awardResponseDeadline);
        onClose();
    }


    return (
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Award Center</DialogTitle>
                <DialogDescription>Review scores and finalize the award for requisition {requisition.id}.</DialogDescription>
            </DialogHeader>
            
            <Tabs value={awardStrategy} onValueChange={(v) => setAwardStrategy(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="item">Award by Best Offer (Per Item)</TabsTrigger>
                    <TabsTrigger value="all">Award All to Single Vendor</TabsTrigger>
                </TabsList>
                <TabsContent value="item">
                    <Card>
                        <CardHeader>
                            <CardTitle>Best Offer per Item</CardTitle>
                            <CardDescription>This strategy awards each item to the vendor with the highest score for that specific item. This may result in multiple Purchase Orders.</CardDescription>
                        </CardHeader>
                         <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead>Recommended Winner</TableHead>
                                        <TableHead className="text-right">Winning Score</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {itemWinners.map(item => (
                                        <TableRow key={item.requisitionItemId}>
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            <TableCell>{item.winner?.vendorName || 'N/A'}</TableCell>
                                            <TableCell className="text-right font-mono">{item.bestScore > 0 ? item.bestScore.toFixed(2) : 'N/A'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="all">
                     <Card>
                        <CardHeader>
                            <CardTitle>Best Overall Vendor</CardTitle>
                            <CardDescription>This strategy awards all items to the single vendor with the highest average score across all items.</CardDescription>
                        </CardHeader>
                        <CardContent className="text-center p-8">
                            <TrophyIcon className="h-12 w-12 text-amber-400 mx-auto mb-4"/>
                            <p className="text-muted-foreground">Recommended Overall Winner:</p>
                            <p className="text-2xl font-bold">{overallWinner?.vendorName || 'N/A'}</p>
                            <p className="font-mono text-primary">{overallWinner?.score > 0 ? `${overallWinner.score.toFixed(2)} average score` : 'N/A'}</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

             <div className="pt-4 space-y-2">
                <Label>Vendor Response Deadline (Optional)</Label>
                <div className="flex gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                "flex-1 justify-start text-left font-normal",
                                !awardResponseDeadlineDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {awardResponseDeadlineDate ? format(awardResponseDeadlineDate, "PPP") : <span>Set a date for vendors to respond</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={awardResponseDeadlineDate}
                                onSelect={setAwardResponseDeadlineDate}
                                disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                     <Input 
                        type="time" 
                        className="w-32"
                        value={awardResponseDeadlineTime}
                        onChange={(e) => setAwardResponseDeadlineTime(e.target.value)}
                    />
                </div>
            </div>

            <DialogFooter>
                <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                <AlertDialog>
                    <AlertDialogTrigger asChild><Button>Finalize &amp; Send Awards</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Award Decision</AlertDialogTitle>
                        <AlertDialogDescription>
                            You are about to finalize the award based on the <strong>{awardStrategy === 'item' ? 'Best Offer Per Item' : 'Single Best Vendor'}</strong> strategy.
                            This will notify the selected vendor(s) and cannot be undone.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleConfirmAward}>Confirm</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </DialogFooter>
        </DialogContent>
    )
}


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
                    <DialogDescription>
                        This is a placeholder for a detailed report about the overdue committee member for internal follow-up.
                    </DialogDescription>
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

    if (user.role !== 'Committee Member') {
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
                 {scoresAlreadyFinalized ? (
                    <Button variant="outline" disabled>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Scores Submitted
                    </Button>
                ) : (
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
                )}
            </CardFooter>
        </Card>
    );
};


export default function QuotationDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { user, allUsers, role, rfqSenderSetting, login } = useAuth();
  const id = params.id as string;
  
  const [requisition, setRequisition] = useState<PurchaseRequisition | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddFormOpen, setAddFormOpen] = useState(false);
  const [isCommitteeDialogOpen, setCommitteeDialogOpen] = useState(false);
  const [isScoringFormOpen, setScoringFormOpen] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [selectedQuoteForScoring, setSelectedQuoteForScoring] = useState<Quotation | null>(null);
  const [hidePricesForScoring, setHidePricesForScoring] = useState(false);
  const [lastPOCreated, setLastPOCreated] = useState<PurchaseOrder | null>(null);
  const [isChangingAward, setIsChangingAward] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isReportOpen, setReportOpen] = useState(false);

  const isAwarded = useMemo(() => quotations.some(q => q.status === 'Awarded' || q.status === 'Accepted' || q.status === 'Declined' || q.status === 'Failed' || q.status === 'Partially_Awarded'), [quotations]);
  const isAccepted = useMemo(() => quotations.some(q => q.status === 'Accepted' || q.status === 'Partially_Awarded'), [quotations]);
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
    if (allMemberIds.length === 0) return false;
    if (quotations.length === 0) return false;

    // Check if every assigned member has finalized their scores.
    return allMemberIds.every(memberId => {
        const member = allUsers.find(u => u.id === memberId);
        return member?.committeeAssignments?.some(a => a.requisitionId === requisition.id && a.scoresSubmitted) || false;
    });
  }, [requisition, quotations, allUsers]);

  const isAuthorized = useMemo(() => {
    if (!user || !role) return false;
    if (role === 'Admin') return true;
    if (rfqSenderSetting.type === 'all') {
      return role === 'Procurement Officer';
    }
    if (rfqSenderSetting.type === 'specific') {
      return user.id === rfqSenderSetting.userId;
    }
    return false;
  }, [user, role, rfqSenderSetting]);

    const fetchRequisitionAndQuotes = async () => {
        if (!id) return;
        setLoading(true);
        setLastPOCreated(null);
        try {
            const [reqResponse, venResponse, quoResponse] = await Promise.all([
                fetch(`/api/requisitions/${id}`),
                fetch('/api/vendors'),
                fetch(`/api/quotations?requisitionId=${id}`),
            ]);
            const currentReq = await reqResponse.json();
            const venData = await venResponse.json();
            const quoData = await quoResponse.json();

            if (currentReq) {
                // Check for expired award and auto-promote if necessary
                const awardedQuote = quoData.find((q: Quotation) => q.status === 'Awarded');
                if (awardedQuote && currentReq.awardResponseDeadline && isPast(new Date(currentReq.awardResponseDeadline))) {
                    toast({
                        title: 'Deadline Missed',
                        description: `Vendor ${awardedQuote.vendorName} missed the response deadline. Promoting next vendor.`,
                        variant: 'destructive',
                    });
                    await handleAwardChange(secondStandby ? 'promote_second' : 'restart_rfq');
                    // Refetch after the change
                    const [refetchedReqRes, refetchedQuoRes] = await Promise.all([
                        fetch(`/api/requisitions/${id}`),
                        fetch(`/api/quotations?requisitionId=${id}`)
                    ]);
                    setRequisition(await refetchedReqRes.json());
                    setQuotations(await refetchedQuoRes.json());
                } else {
                    setRequisition(currentReq);
                    setQuotations(quoData);
                }
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Requisition not found.' });
            }
            
            setVendors(venData || []);

        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch data.' });
        } finally {
            setLoading(false);
        }
    };


  useEffect(() => {
    if (id && user) { // ensure user is loaded
        fetchRequisitionAndQuotes();
    }
  }, [id, user]);

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
  
   const handleFinalizeScores = async (awardStrategy: 'all' | 'item', awards: any, awardResponseDeadline?: Date) => {
        if (!user || !requisition) return;
        
        setIsFinalizing(true);
        try {
             const response = await fetch(`/api/requisitions/${requisition.id}/finalize-scores`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, awardResponseDeadline, awardStrategy, awards }),
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

  const handleScoreButtonClick = (quote: Quotation, hidePrices: boolean) => {
    setSelectedQuoteForScoring(quote);
    setHidePricesForScoring(hidePrices);
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
        const anyCommittee = (requisition.financialCommitteeMemberIds && requisition.financialCommitteeMemberIds.length > 0) || 
                             (requisition.technicalCommitteeMemberIds && requisition.technicalCommitteeMemberIds.length > 0);
        if (!anyCommittee) {
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

        {currentStep === 'rfq' && (role === 'Procurement Officer' || role === 'Committee') && (
            <div className="grid md:grid-cols-2 gap-6 items-start">
                <RFQDistribution 
                    requisition={requisition} 
                    vendors={vendors} 
                    onRfqSent={fetchRequisitionAndQuotes}
                    isAuthorized={isAuthorized}
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
        
        {currentStep === 'committee' && (role === 'Procurement Officer' || role === 'Committee') && (
            <CommitteeManagement
                requisition={requisition} 
                onCommitteeUpdated={fetchRequisitionAndQuotes}
                open={isCommitteeDialogOpen}
                onOpenChange={setCommitteeDialogOpen}
                isAuthorized={isAuthorized}
            />
        )}


        {(currentStep === 'award' || currentStep === 'finalize' || currentStep === 'completed') && (
            <>
                {/* Always render committee management when in award step so dialog can open */}
                {(currentStep === 'award' || currentStep === 'finalize' || currentStep === 'completed') && role === 'Procurement Officer' && (
                     <div className="hidden">
                        <CommitteeManagement
                            requisition={requisition}
                            onCommitteeUpdated={fetchRequisitionAndQuotes}
                            open={isCommitteeDialogOpen}
                            onOpenChange={setCommitteeDialogOpen}
                            isAuthorized={isAuthorized}
                        />
                    </div>
                )}
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
                            {isAwarded && requisition.status !== 'PO Created' && role === 'Procurement Officer' && (
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
                            isAwarded={isAwarded}
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
                                hidePrices={hidePricesForScoring}
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
            </>
        )}
        
        {currentStep === 'award' && (role === 'Procurement Officer' || role === 'Committee') && quotations.length > 0 && role === 'Procurement Officer' && (
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
        
        {user.role === 'Committee Member' && currentStep === 'award' && (
             <CommitteeActions 
                user={user}
                requisition={requisition}
                quotations={quotations}
                onFinalScoresSubmitted={fetchRequisitionAndQuotes}
             />
        )}
        
        {isAccepted && requisition.status !== 'PO Created' && role !== 'Committee Member' && (
            <ContractManagement requisition={requisition} onContractFinalized={handleContractFinalized} />
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
    

    

    

    

    
