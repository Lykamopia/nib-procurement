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
  CardHeader,
  CardTitle,
  CardDescription,
} from './ui/card';
import { PlusCircle, Trash2, Loader2, Send } from 'lucide-react';
import { Separator } from './ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { PurchaseRequisition, Urgency } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

const formSchema = z.object({
  requesterName: z.string().min(2, 'Name must be at least 2 characters.'),
  department: z.string().min(1, 'Department is required.'),
  title: z.string().min(5, 'Title must be at least 5 characters.'),
  urgency: z.enum(['Low', 'Medium', 'High', 'Critical']),
  justification: z
    .string()
    .min(10, 'Justification must be at least 10 characters.'),
  attachments: z.any().optional(),
  items: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(2, 'Item name is required.'),
        quantity: z.coerce.number().min(1, 'Quantity must be at least 1.'),
        unitPrice: z.coerce.number().optional(),
        description: z.string().optional(),
      })
    )
    .min(1, 'At least one item is required.'),
});

interface NeedsRecognitionFormProps {
    existingRequisition?: PurchaseRequisition;
    onSuccess?: () => void;
}

export function NeedsRecognitionForm({ existingRequisition, onSuccess }: NeedsRecognitionFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const [departments, setDepartments] = useState<string[]>(['Design', 'Operations', 'IT', 'Marketing']);
  const isEditMode = !!existingRequisition;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode ? {
        requesterName: existingRequisition.requesterName,
        department: existingRequisition.department,
        title: existingRequisition.title,
        urgency: existingRequisition.urgency || 'Low',
        justification: existingRequisition.justification,
        items: existingRequisition.items.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            description: item.description,
        })),
    } : {
      requesterName: user?.name || '',
      department: user?.department || '',
      title: '',
      urgency: 'Low',
      justification: '',
      items: [{ id: `ITEM-${Date.now()}`, name: '', quantity: 1, unitPrice: 0, description: '' }],
    },
  });

  useEffect(() => {
    if (user && !isEditMode) {
      form.setValue('department', user.department || '');
      form.setValue('requesterName', user.name || '');
    }
  }, [user, isEditMode, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      
      const body = isEditMode ? 
        { ...values, id: existingRequisition.id, status: 'Pending Approval', userId: user?.id } : 
        values;
      
      const response = await fetch('/api/requisitions', {
        method: isEditMode ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${isEditMode ? 'update' : 'submit'} requisition`);
      }

      const result = await response.json();
      toast({
        title: `Requisition ${isEditMode ? 'Updated' : 'Submitted'}`,
        description: `Your purchase requisition "${result.title}" has been successfully ${isEditMode ? 'resubmitted for approval' : 'saved as a draft'}.`,
      });
      if (onSuccess) {
          onSuccess();
      } else {
          form.reset();
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description:
          error instanceof Error ? error.message : 'An unknown error occurred.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditMode ? 'Edit Purchase Requisition' : 'New Purchase Requisition'}</CardTitle>
        <CardDescription>
          {isEditMode ? `Editing requisition ${existingRequisition.id}. Make your changes and resubmit for approval.` : 'Fill out the form below to request a new purchase.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
         {isEditMode && existingRequisition.approverComment && (
            <Alert variant="destructive" className="mb-6">
                <AlertTitle>Rejection Reason from Approver</AlertTitle>
                <AlertDescription>"{existingRequisition.approverComment}"</AlertDescription>
            </Alert>
         )}
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
                      <Input placeholder="e.g. Jane Doe" {...field} disabled />
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
                        <Input {...field} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
                <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Requisition Title</FormLabel>
                    <FormControl>
                        <Input
                        placeholder="e.g. New Laptops for Design Team"
                        {...field}
                        />
                    </FormControl>
                    <FormDescription>
                        A short, descriptive title for your request.
                    </FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                  control={form.control}
                  name="urgency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Urgency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a priority level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(['Low', 'Medium', 'High', 'Critical'] as Urgency[]).map(level => (
                            <SelectItem key={level} value={level}>{level}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                       <FormDescription>
                        How urgently is this request needed?
                    </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-medium mb-4">Items</h3>
              <div className="space-y-6">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex gap-4 items-start p-4 border rounded-lg relative"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 flex-1">
                      <FormField
                        control={form.control}
                        name={`items.${index}.name`}
                        render={({ field }) => (
                          <FormItem className="md:col-span-3">
                            <FormLabel>Item Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. MacBook Pro 16-inch"
                                {...field}
                              />
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
                        name={`items.${index}.description`}
                        render={({ field }) => (
                          <FormItem className="md:col-span-5">
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Add any specific details, model numbers, or specifications here..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => remove(index)}
                      className="mt-6"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
               <div className="flex justify-between items-center mt-4">
                 <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                    append({ id: `ITEM-${Date.now()}`, name: '', quantity: 1, unitPrice: 0, description: '' })
                    }
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Item
                </Button>
              </div>
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
            
            <Separator />

            <div className="grid md:grid-cols-2 gap-8">
              <FormField
                control={form.control}
                name="attachments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>File Attachments</FormLabel>
                    <FormControl>
                      <Input type="file" {...form.register('attachments')} />
                    </FormControl>
                    <FormDescription>
                      Attach any relevant documents (quotes, specs, etc.).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="flex justify-end items-center gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : isEditMode ? (
                    <Send className="mr-2 h-4 w-4" />
                ) : null}
                {isEditMode ? 'Resubmit for Approval' : 'Save as Draft'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
