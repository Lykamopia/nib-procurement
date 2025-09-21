
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
import { useToast } from '@/hooks/use-toast';
import { Loader2, PackageCheck } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { PurchaseOrder } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';


const receiptFormSchema = z.object({
  purchaseOrderId: z.string().min(1, "Purchase Order is required."),
  items: z.array(z.object({
    poItemId: z.string(),
    name: z.string(),
    quantityOrdered: z.number(),
    quantityReceived: z.coerce.number().min(0, "Cannot be negative."),
    condition: z.enum(['Good', 'Damaged', 'Incorrect']),
    notes: z.string().optional(),
  })).min(1, "At least one item must be received."),
});

type ReceiptFormValues = z.infer<typeof receiptFormSchema>;

export function GoodsReceiptForm() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const form = useForm<ReceiptFormValues>({
    resolver: zodResolver(receiptFormSchema),
    defaultValues: {
        purchaseOrderId: "",
        items: [],
    },
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "items",
  });

  useEffect(() => {
    const fetchPOs = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/purchase-orders');
        const data: PurchaseOrder[] = await response.json();
        const openPOs = data.filter(po => 
          ['Issued', 'Acknowledged', 'Shipped', 'Partially_Delivered'].includes(po.status.replace(/ /g, '_'))
        );
        setPurchaseOrders(openPOs);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch purchase orders.' });
      } finally {
        setLoading(false);
      }
    };
    fetchPOs();
  }, [toast]);

  const handlePOChange = (poId: string) => {
    form.setValue('purchaseOrderId', poId);
    const po = purchaseOrders.find(p => p.id === poId);
    if (po) {
        setSelectedPO(po);
        const formItems = po.items.map(item => ({
            poItemId: item.id,
            name: item.name,
            quantityOrdered: item.quantity,
            quantityReceived: 0,
            condition: 'Good' as const,
            notes: "",
        }));
        replace(formItems);
    } else {
        setSelectedPO(null);
        replace([]);
    }
  }

  const onSubmit = async (values: ReceiptFormValues) => {
      if (!user) return;
      setSubmitting(true);
      try {
        const response = await fetch('/api/receipts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...values, userId: user.id }),
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to log receipt.');
        }

        toast({ title: 'Success!', description: 'Goods receipt has been logged.' });
        form.reset();
        setSelectedPO(null);
        replace([]);
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
    <Card>
      <CardHeader>
        <CardTitle>Receive Goods</CardTitle>
        <CardDescription>Log incoming items against a purchase order.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
                control={form.control}
                name="purchaseOrderId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Select Purchase Order</FormLabel>
                    <Select onValueChange={handlePOChange} value={field.value}>
                        <FormControl>
                        <SelectTrigger className="w-full md:w-1/2">
                            <SelectValue placeholder={loading ? "Loading POs..." : "Select a PO to receive against"} />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {purchaseOrders.map(po => <SelectItem key={po.id} value={po.id}>{po.id} - {po.requisitionTitle}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            
            {selectedPO && (
                <>
                <Separator />
                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                    <h3 className="text-lg font-medium">Items to Receive</h3>
                    {fields.map((field, index) => (
                        <Card key={field.id} className="p-4">
                            <p className="font-semibold mb-2">{field.name}</p>
                            <p className="text-sm text-muted-foreground mb-4">Ordered: {field.quantityOrdered}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name={`items.${index}.quantityReceived`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Quantity Received</FormLabel>
                                            <FormControl><Input type="number" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`items.${index}.condition`}
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Condition</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Good">Good</SelectItem>
                                                <SelectItem value="Damaged">Damaged</SelectItem>
                                                <SelectItem value="Incorrect">Incorrect</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={form.control}
                                    name={`items.${index}.notes`}
                                    render={({ field }) => (
                                        <FormItem className="md:col-span-2">
                                            <FormLabel>Item Notes</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="e.g. Box was dented but item is fine" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </Card>
                    ))}
                </div>
                </>
            )}

          </CardContent>
          {selectedPO && (
             <CardFooter>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackageCheck className="mr-2 h-4 w-4" />}
                    Log Received Goods
                </Button>
            </CardFooter>
          )}
        </form>
      </Form>
    </Card>
  );
}
