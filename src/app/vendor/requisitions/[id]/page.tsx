
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PurchaseRequisition, Vendor } from '@/lib/types';
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
import { Loader2, Send } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

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


export default function VendorRequisitionPage() {
    const [requisition, setRequisition] = useState<PurchaseRequisition | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setSubmitting] = useState(false);

    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const { token, user } = useAuth();
    const { toast } = useToast();

    const form = useForm<z.infer<typeof quoteFormSchema>>({
        resolver: zodResolver(quoteFormSchema),
        defaultValues: {
            notes: "",
            items: [],
        },
    });

     const { fields, replace } = useFieldArray({
        control: form.control,
        name: "items",
    });

    useEffect(() => {
        if (!token || !id) return;

        const fetchRequisition = async () => {
            setLoading(true);
            try {
                const response = await fetch(`/api/requisitions/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Failed to fetch requisition data.');
                const foundReq: PurchaseRequisition = await response.json();

                if (foundReq) {
                    setRequisition(foundReq);
                    const formItems = foundReq.items.map(item => ({
                        requisitionItemId: item.id,
                        name: item.name,
                        quantity: item.quantity,
                        unitPrice: 0,
                        leadTimeDays: 0,
                    }));
                    replace(formItems);
                } else {
                    setError('Requisition not found or not available for quoting.');
                }
            } catch (e) {
                setError(e instanceof Error ? e.message : 'An unknown error occurred');
            } finally {
                setLoading(false);
            }
        };
        fetchRequisition();
    }, [id, token, replace]);

     const onSubmit = async (values: z.infer<typeof quoteFormSchema>) => {
        if (!user || !requisition) return;
        
        const vendor = user as User & { vendorId: string };
        if (!vendor.vendorId) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Your vendor account is not properly configured.',
            });
            return;
        }


        setSubmitting(true);
        try {
            const response = await fetch('/api/quotations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    ...values, 
                    requisitionId: requisition.id,
                    vendorId: vendor.vendorId 
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to submit quote.');
            }

            toast({
                title: 'Success!',
                description: 'Your quotation has been submitted.',
            });
            router.push('/vendor/dashboard');

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


    if (loading) return <div>Loading Requisition...</div>;
    if (error) return <div className="text-destructive">{error}</div>;
    if (!requisition) return <div>Requisition not found.</div>;

    const totalQuotePrice = form.watch('items').reduce((acc, item) => acc + (item.quantity * (item.unitPrice || 0)), 0);

    return (
        <div className="grid md:grid-cols-2 gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>Requisition Details</CardTitle>
                    <CardDescription>ID: {requisition.id}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h3 className="font-semibold">Title</h3>
                        <p className="text-muted-foreground">{requisition.title}</p>
                    </div>
                    <div>
                        <h3 className="font-semibold">Justification</h3>
                        <p className="text-muted-foreground">{requisition.justification}</p>
                    </div>
                     <Separator />
                    <div>
                         <h3 className="font-semibold mb-2">Items Requested</h3>
                         <div className="space-y-2">
                            {requisition.items.map(item => (
                                <div key={item.id} className="flex justify-between p-2 border rounded-md">
                                    <span>{item.name}</span>
                                    <span className="font-semibold">Qty: {item.quantity}</span>
                                </div>
                            ))}
                         </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Submit Your Quotation</CardTitle>
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
                                <Button variant="ghost" asChild><Link href="/vendor/dashboard">Cancel</Link></Button>
                                 <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                    Submit Quotation
                                </Button>
                             </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    )
}
