
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
import { PlusCircle, Trash2, Loader2 } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { DepartmentBudget } from '@/lib/types';
import { departmentBudgets } from '@/lib/data-store';

const formSchema = z.object({
  requesterName: z.string().min(2, 'Name must be at least 2 characters.'),
  department: z.string().min(1, 'Department is required.'),
  title: z.string().min(5, 'Title must be at least 5 characters.'),
  justification: z
    .string()
    .min(10, 'Justification must be at least 10 characters.'),
  urgency: z.enum(['Low', 'Medium', 'High']),
  attachments: z.any().optional(),
  items: z
    .array(
      z.object({
        name: z.string().min(2, 'Item name is required.'),
        quantity: z.coerce.number().min(1, 'Quantity must be at least 1.'),
      })
    )
    .min(1, 'At least one item is required.'),
  customQuestions: z.array(
    z.object({
      questionText: z.string().min(5, 'Question must be at least 5 characters.')
    })
  ).optional(),
});

export function NeedsRecognitionForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const { user, role } = useAuth();
  const [departments, setDepartments] = useState<DepartmentBudget[]>([]);


  useEffect(() => {
    // In a real-world app, you might fetch this from an API
    setDepartments(departmentBudgets);
  }, []);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      requesterName: user?.name || '',
      department: '',
      title: '',
      justification: '',
      urgency: 'Low',
      items: [{ name: '', quantity: 1 }],
      customQuestions: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const { fields: questionFields, append: appendQuestion, remove: removeQuestion } = useFieldArray({
      control: form.control,
      name: "customQuestions",
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      const response = await fetch('/api/requisitions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error('Failed to submit requisition');
      }

      const result = await response.json();
      console.log(result);
      toast({
        title: 'Requisition Submitted',
        description: `Your purchase requisition "${result.title}" has been successfully submitted as a draft.`,
      });
      form.reset();
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
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.map(d => <SelectItem key={d.department} value={d.department}>{d.department}</SelectItem>)}
                      </SelectContent>
                    </Select>
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

            <Separator />

            <div>
              <h3 className="text-lg font-medium mb-4">Items</h3>
              <div className="space-y-6">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex gap-4 items-end p-4 border rounded-lg relative"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                      <FormField
                        control={form.control}
                        name={`items.${index}.name`}
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
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
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => remove(index)}
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
                    append({ name: '', quantity: 1 })
                    }
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Item
                </Button>
              </div>
            </div>

            <Separator />
            
            <div>
              <h3 className="text-lg font-medium mb-4">Custom Questions for Vendors</h3>
              <div className="space-y-6">
                {questionFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex gap-4 items-end p-4 border rounded-lg"
                  >
                    <FormField
                      control={form.control}
                      name={`customQuestions.${index}.questionText`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Question {index + 1}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., What is the warranty period?"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => removeQuestion(index)}
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
                    onClick={() => appendQuestion({ questionText: '' })}
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Question
                </Button>
              </div>
            </div>

            <Separator />

            <div className="grid md:grid-cols-2 gap-8">
              <FormField
                control={form.control}
                name="urgency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Urgency</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select urgency level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Requisition
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
