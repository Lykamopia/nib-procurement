'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './ui/card';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Separator } from './ui/separator';

const formSchema = z.object({
  requesterName: z.string().min(2, 'Name must be at least 2 characters.'),
  department: z.string().min(2, 'Department is required.'),
  title: z.string().min(5, 'Title must be at least 5 characters.'),
  justification: z
    .string()
    .min(10, 'Justification must be at least 10 characters.'),
  items: z
    .array(
      z.object({
        name: z.string().min(2, 'Item name is required.'),
        quantity: z.coerce.number().min(1, 'Quantity must be at least 1.'),
        unitPrice: z.coerce
          .number()
          .min(0.01, 'Price must be greater than 0.'),
      })
    )
    .min(1, 'At least one item is required.'),
});

export function NeedsRecognitionForm() {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      requesterName: '',
      department: '',
      title: '',
      justification: '',
      items: [{ name: '', quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    toast({
      title: 'Requisition Submitted',
      description: 'Your purchase requisition has been successfully submitted.',
    });
    form.reset();
  }

  const total = form.watch('items').reduce((acc, item) => {
    return acc + (item.quantity || 0) * (item.unitPrice || 0);
  }, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Purchase Requisition</CardTitle>
        <CardDescription>
          Fill out the form below to request a new purchase.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              <FormField
                control={form.control}
                name="requesterName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Jane Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Marketing" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Requisition Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. New Laptops for Design Team" {...field} />
                  </FormControl>
                  <FormDescription>
                    A short, descriptive title for your request.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Separator />

            <div>
              <h3 className="text-lg font-medium mb-4">Items</h3>
              <div className="space-y-6">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-4 items-end p-4 border rounded-lg relative">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                      <FormField
                        control={form.control}
                        name={`items.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Item Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. MacBook Pro 16-inch" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`items.${index}.unitPrice`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit Price ($)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => append({ name: '', quantity: 1, unitPrice: 0 })}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>
            
            <Separator />
            
            <FormField
              control={form.control}
              name="justification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Justification</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Explain why this purchase is necessary..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end items-center gap-4">
              <span className="text-xl font-semibold">
                Total: ${total.toFixed(2)}
              </span>
              <Button type="submit">Submit Requisition</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
