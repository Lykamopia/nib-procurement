

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, useFormContext } from 'react-hook-form';
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
import { PlusCircle, Trash2, Loader2, Calendar as CalendarIcon, Send } from 'lucide-react';
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
import { DepartmentBudget, PurchaseRequisition, QuestionType } from '@/lib/types';
import { departmentBudgets } from '@/lib/data-store';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

const formSchema = z.object({
  requesterName: z.string().min(2, 'Name must be at least 2 characters.'),
  department: z.string().min(1, 'Department is required.'),
  title: z.string().min(5, 'Title must be at least 5 characters.'),
  justification: z
    .string()
    .min(10, 'Justification must be at least 10 characters.'),
  deadline: z.date().optional(),
  attachments: z.any().optional(),
  items: z
    .array(
      z.object({
        name: z.string().min(2, 'Item name is required.'),
        quantity: z.coerce.number().min(1, 'Quantity must be at least 1.'),
        unitPrice: z.coerce.number().optional(),
      })
    )
    .min(1, 'At least one item is required.'),
  customQuestions: z.array(
    z.object({
      questionText: z.string().min(5, 'Question must be at least 5 characters.'),
      questionType: z.enum(['text', 'boolean', 'multiple-choice']),
      options: z.array(z.object({ value: z.string().min(1, "Option cannot be empty.") })).optional(),
    })
  ).optional(),
});

interface NeedsRecognitionFormProps {
    existingRequisition?: PurchaseRequisition;
    onSuccess?: () => void;
}

export function NeedsRecognitionForm({ existingRequisition, onSuccess }: NeedsRecognitionFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const [departments, setDepartments] = useState<DepartmentBudget[]>([]);
  const isEditMode = !!existingRequisition;


  useEffect(() => {
    setDepartments(departmentBudgets);
  }, []);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode ? {
        requesterName: existingRequisition.requesterName,
        department: existingRequisition.department,
        title: existingRequisition.title,
        justification: existingRequisition.justification,
        deadline: existingRequisition.deadline ? new Date(existingRequisition.deadline) : undefined,
        items: existingRequisition.items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice
        })),
        customQuestions: existingRequisition.customQuestions?.map(q => ({
            ...q,
            options: q.options?.map(opt => ({ value: opt })) || []
        }))
    } : {
      requesterName: user?.name || '',
      department: '',
      title: '',
      justification: '',
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
      const formattedValues = {
        ...values,
        customQuestions: values.customQuestions?.map(q => ({
          ...q,
          options: q.options?.map(opt => opt.value)
        }))
      };

      const total = formattedValues.items.reduce((acc, item) => acc + ((item.unitPrice || 0) * item.quantity), 0);

      const body = isEditMode ? 
        { ...formattedValues, id: existingRequisition.id, status: 'Pending Approval', userId: user?.id, totalPrice: total } : 
        formattedValues;
      
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
                      <Input placeholder="e.g. Jane Doe" {...field} disabled={isEditMode} />
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
                        name={`items.${index}.unitPrice`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Est. Unit Price</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="Optional" {...field} />
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
                    append({ name: '', quantity: 1, unitPrice: undefined })
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
              <FormDescription>Add questions to gather specific information from vendors with their quotes.</FormDescription>
              <div className="space-y-6 mt-4">
                {questionFields.map((field, index) => {
                  const questionType = form.watch(`customQuestions.${index}.questionType`);
                  return (
                    <div key={field.id} className="flex gap-4 items-start p-4 border rounded-lg">
                      <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name={`customQuestions.${index}.questionText`}
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel>Question {index + 1}</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., What is the warranty period?" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                           <FormField
                              control={form.control}
                              name={`customQuestions.${index}.questionType`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Question Type</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="text">Open-ended Text</SelectItem>
                                      <SelectItem value="boolean">True/False</SelectItem>
                                      <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                        </div>
                         {questionType === 'multiple-choice' && (
                          <div className="pl-4 space-y-2">
                            <FormLabel>Multiple Choice Options</FormLabel>
                            <QuestionOptions index={index} />
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mt-6"
                        onClick={() => removeQuestion(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between items-center mt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendQuestion({ questionText: '', questionType: 'text', options: [] })}
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
                name="deadline"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Quotation Deadline</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                            <Button
                                variant={"outline"}
                                className={cn(
                                "w-[240px] pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                                )}
                            >
                                {field.value ? (
                                format(field.value, "PPP")
                                ) : (
                                <span>Pick a date</span>
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
                            disabled={(date) =>
                                date < new Date()
                            }
                            initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                    <FormDescription>
                      This is the final date for vendors to submit their quotes.
                    </FormDescription>
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

function QuestionOptions({ index }: { index: number }) {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `customQuestions.${index}.options`,
  });

  return (
    <div className="space-y-2">
      {fields.map((field, optionIndex) => (
        <div key={field.id} className="flex items-center gap-2">
           <FormField
              control={control}
              name={`customQuestions.${index}.options.${optionIndex}.value`}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input {...field} placeholder={`Option ${optionIndex + 1}`} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          <Button type="button" variant="ghost" size="sm" onClick={() => remove(optionIndex)}>Remove</Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={() => append({ value: "" })}>
        <PlusCircle className="mr-2 h-4 w-4" />
        Add Option
      </Button>
    </div>
  );
}
