
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PurchaseOrder, PurchaseRequisition, Quotation } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Send, ArrowLeft, CheckCircle, FileText, BadgeInfo, FileUp, CircleCheck, Info, Edit, FileEdit } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

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

const invoiceFormSchema = z.object({
    documentUrl: z.string().min(1, "Invoice document is required"),
    invoiceDate: z.string().min(1, "Invoice date is required"),
});

function InvoiceSubmissionForm({ po, onInvoiceSubmitted }: { po: PurchaseOrder; onInvoiceSubmitted: () => void }) {
    const { toast } = useToast();
    const { user } = useAuth();
    const [isSubmitting, setSubmitting] = useState(false);
    const form = useForm<z.infer<typeof invoiceFormSchema>>({
        resolver: zodResolver(invoiceFormSchema),
        defaultValues: {
            documentUrl: "",
            invoiceDate: new Date().toISOString().split('T')[0],
        },
    });

    const onSubmit = async (values: z.infer<typeof invoiceFormSchema>) => {
        if (!user || !po) return;
        setSubmitting(true);
        try {
            const response = await fetch('/api/invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    purchaseOrderId: po.id,
                    vendorId: po.vendor.id,
                    invoiceDate: values.invoiceDate,
                    documentUrl: values.documentUrl,
                    items: po.items,
                    totalAmount: po.totalAmount,
                    userId: user.id
                }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to submit invoice.');
            }
            toast({ title: 'Invoice Submitted', description: 'Your invoice has been sent to the procurement team for review.' });
            onInvoiceSubmitted();
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
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Submit Invoice for PO: {po.id}</DialogTitle>
                <DialogDescription>
                    Please confirm the invoice details and upload your document.
                </DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <Card className="bg-muted/50">
                        <CardHeader><CardTitle className="text-lg">Invoice Summary</CardTitle></CardHeader>
                        <CardContent>
                            <div className="space-y-2 text-sm">
                                {po.items.map(item => (
                                    <div key={item.id} className="flex justify-between">
                                        <span>{item.name} x {item.quantity}</span>
                                        <span>{item.totalPrice.toFixed(2)} ETB</span>
                                    </div>
                                ))}
                                <Separator />
                                <div className="flex justify-between font-bold">
                                    <span>Total Amount</span>
                                    <span>{po.totalAmount.toFixed(2)} ETB</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <div className="grid grid-cols-2 gap-4">
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
                         <FormField
                            control={form.control}
                            name="documentUrl"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Invoice Document (PDF)</FormLabel>
                                    <FormControl>
                                        <Input type="file" accept=".pdf" onChange={(e) => field.onChange(e.target.files?.[0]?.name || "")} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <DialogFooter>
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

function QuoteSubmissionForm({ requisition, quote, onQuoteSubmitted }: { requisition: PurchaseRequisition; quote?: Quotation | null; onQuoteSubmitted: () => void; }) {
    const { user, token } = useAuth();
    const [isSubmitting, setSubmitting] = useState(false);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof quoteFormSchema>>({
        resolver: zodResolver(quoteFormSchema),
        defaultValues: quote ? {
            notes: quote.notes,
            items: quote.items.map(item => ({
                ...item,
                requisitionItemId: item.requisitionItemId
            }))
        } : {
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
        if (!user || !requisition) return;

        setSubmitting(true);
        try {
            const isEditing = !!quote;
            const url = isEditing ? `/api/quotations/${quote.id}` : '/api/quotations';
            const method = isEditing ? 'PATCH' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    ...values,
                    requisitionId: requisition.id,
                    vendorId: user.vendorId,
                    userId: user.id // for PATCH
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to ${isEditing ? 'update' : 'submit'} quote.`);
            }

            toast({
                title: 'Success!',
                description: `Your quotation has been ${isEditing ? 'updated' : 'submitted'}.`,
            });
            onQuoteSubmitted();
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
    
    const totalQuotePrice = form.watch('items').reduce((acc, item) => acc + (item.quantity * (item.unitPrice || 0)), 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle>{quote ? 'Edit Your Quotation' : 'Submit Your Quotation'}</CardTitle>
                <CardDescription>
                    Please provide your pricing and estimated lead times for the items requested.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
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
                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Overall Notes (Optional)</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Include any notes about warranty, shipping, etc." {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Separator />
                        <div className="text-right font-bold text-xl">
                            Total Quote Price: {totalQuotePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" asChild><Link href="/vendor/dashboard">Cancel</Link></Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                {quote ? 'Update Quotation' : 'Submit Quotation'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

export default function VendorRequisitionPage() {
    const [requisition, setRequisition] = useState<PurchaseRequisition | null>(null);
    const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submittedQuote, setSubmittedQuote] = useState<Quotation | null>(null);
    const [isInvoiceFormOpen, setInvoiceFormOpen] = useState(false);
    const [isEditingQuote, setIsEditingQuote] = useState(false);

    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const { token, user } = useAuth();
    
    const isAwardProcessStarted = requisition?.quotations?.some(q => q.status === 'Awarded' || q.status === 'Standby') ?? false;

    const fetchRequisitionData = async () => {
        if (!id || !token || !user) return;
        
        setLoading(true);
        setError(null);
        try {
             const response = await fetch(`/api/requisitions/${id}`);
             if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Requisition not found or not available for quoting.');
                }
                throw new Error('Failed to fetch requisition data.');
             }
             const foundReq: PurchaseRequisition = await response.json();
             setRequisition(foundReq);

             const vendorSubmittedQuote = foundReq.quotations?.find(q => q.vendorId === user.vendorId);
             
             if (vendorSubmittedQuote) {
                 setSubmittedQuote(vendorSubmittedQuote);
                 if (foundReq.purchaseOrderId) {
                     const poResponse = await fetch('/api/purchase-orders');
                     const allPOs: PurchaseOrder[] = await poResponse.json();
                     const po = allPOs.find(p => p.id === foundReq.purchaseOrderId);
                     setPurchaseOrder(po || null);
                 }
             } else {
                setSubmittedQuote(null);
             }
             
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequisitionData();
    }, [id, token, user]);
    
    const handleQuoteSubmitted = () => {
        setIsEditingQuote(false);
        fetchRequisitionData();
    }


    if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (error) return <div className="text-destructive text-center p-8">{error}</div>;
    if (!requisition) return <div className="text-center p-8">Requisition not found.</div>;

    const isAwarded = submittedQuote?.status === 'Awarded' || submittedQuote?.status === 'Invoice Submitted';
    const hasSubmittedInvoice = submittedQuote?.status === 'Invoice Submitted';

    const QuoteDisplayCard = ({ quote }: { quote: Quotation }) => (
         <Card>
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                    <CardTitle>Your Submitted Quote</CardTitle>
                    <CardDescription>
                        Status: <Badge variant={quote.status === 'Awarded' ? 'default' : 'secondary'}>{quote.status}</Badge>
                    </CardDescription>
                </div>
                {!isAwardProcessStarted && quote.status === 'Submitted' && (
                    <Button variant="outline" size="sm" onClick={() => setIsEditingQuote(true)}>
                        <FileEdit className="mr-2 h-4 w-4" /> Edit Quote
                    </Button>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    {quote.items.map((item) => (
                        <div key={item.requisitionItemId} className="flex justify-between p-2 border rounded-md">
                            <div>
                                <p className="font-semibold">{item.name} x {item.quantity}</p>
                                <p className="text-xs text-muted-foreground">Unit Price: {item.unitPrice.toFixed(2)} ETB</p>
                            </div>
                            <p className="font-semibold text-lg">{(item.unitPrice * item.quantity).toFixed(2)} ETB</p>
                        </div>
                    ))}
                </div>
                {quote.notes && (
                    <div>
                        <h3 className="font-semibold text-sm">Your Notes</h3>
                        <p className="text-muted-foreground text-sm p-3 border rounded-md bg-muted/50 italic">"{quote.notes}"</p>
                    </div>
                )}
                 <Separator />
                 <div className="text-right font-bold text-2xl">
                    Total Quoted Price: {quote.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                 </div>
                 {isAwarded && purchaseOrder && (
                    <CardFooter className="p-0 pt-4">
                         <Dialog open={isInvoiceFormOpen} onOpenChange={setInvoiceFormOpen}>
                            <DialogTrigger asChild>
                                <Button className="w-full" disabled={hasSubmittedInvoice}>
                                    {hasSubmittedInvoice ? (
                                        <><CircleCheck className="mr-2"/> Invoice Submitted</>
                                    ) : (
                                        <><FileUp className="mr-2"/> Submit Invoice</>
                                    )}
                                </Button>
                            </DialogTrigger>
                            <InvoiceSubmissionForm po={purchaseOrder} onInvoiceSubmitted={() => { setInvoiceFormOpen(false); fetchRequisitionData(); }} />
                        </Dialog>
                    </CardFooter>
                 )}
                 {!isAwarded && (
                     <CardFooter className="p-0 pt-4">
                        <Alert variant="default" className="border-blue-500/50">
                            <Info className="h-4 w-4 text-blue-500" />
                            <AlertTitle>Quote Under Review</AlertTitle>
                            <AlertDescription>
                                {isAwardProcessStarted ? 'The award process has begun. Your quote can no longer be edited.' : 'Your quote has been submitted and is awaiting review. You can still edit it until an award decision is made.'}
                            </AlertDescription>
                        </Alert>
                     </CardFooter>
                 )}
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-6">
            <Button variant="outline" size="sm" onClick={() => router.push('/vendor/dashboard')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
            </Button>
            
            {isAwarded && (
                <Alert variant="default" className="border-green-600 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-200 dark:border-green-800">
                    <CheckCircle className="h-5 w-5 !text-green-600" />
                    <AlertTitle className="font-bold text-lg">This Requisition has been Awarded to You!</AlertTitle>
                    <AlertDescription>
                        Congratulations! Your quote was accepted. Please await the official Purchase Order before submitting your invoice.
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Requisition Details</CardTitle>
                        <CardDescription>ID: {requisition.id}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h3 className="font-semibold text-sm">Title</h3>
                            <p className="text-muted-foreground">{requisition.title}</p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-sm">Justification</h3>
                            <p className="text-muted-foreground">{requisition.justification}</p>
                        </div>
                        <Separator />
                        <div>
                            <h3 className="font-semibold text-sm mb-2">Items Requested</h3>
                            <div className="space-y-2">
                                {requisition.items.map(item => (
                                    <div key={item.id} className="flex justify-between p-2 border rounded-md bg-muted/50">
                                        <span>{item.name}</span>
                                        <span className="font-semibold">Qty: {item.quantity}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {submittedQuote && !isEditingQuote ? (
                    <QuoteDisplayCard quote={submittedQuote} />
                ) : (
                    <QuoteSubmissionForm 
                        requisition={requisition} 
                        quote={isEditingQuote ? submittedQuote : null} 
                        onQuoteSubmitted={handleQuoteSubmitted} 
                    />
                )}
            </div>
        </div>
    )
}
