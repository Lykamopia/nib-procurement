
'use client';

import { PurchaseRequisition } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { format } from 'date-fns';
import { ScrollArea } from './ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

interface RequisitionDetailsDialogProps {
  reuisition: PurchaseRequisition;
  isOpen: boolean;
  onClose: () => void;
}

export function RequisitionDetailsDialog({ reuisition, isOpen, onClose }: RequisitionDetailsDialogProps) {
  if (!reuisition) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
            <DialogHeader>
            <DialogTitle>Details for Requisition: {reuisition.id}</DialogTitle>
            <DialogDescription>
                A read-only view of the requisition submitted by {reuisition.requesterName}.
            </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div><p className="font-medium">Title</p><p className="text-muted-foreground">{reuisition.title}</p></div>
                        <div><p className="font-medium">Department</p><p className="text-muted-foreground">{reuisition.department}</p></div>
                        <div><p className="font-medium">Created</p><p className="text-muted-foreground">{format(new Date(reuisition.createdAt), 'PP')}</p></div>
                        <div><p className="font-medium">Status</p><div><Badge>{reuisition.status}</Badge></div></div>
                         {reuisition.deadline && (
                            <div className="md:col-span-2"><p className="font-medium">Quotation Deadline</p><p className="text-muted-foreground">{format(new Date(reuisition.deadline), 'PPpp')}</p></div>
                         )}
                    </div>
                    <Separator />
                     <div>
                        <h4 className="font-medium mb-2">Items Requested</h4>
                        <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item Name</TableHead>
                                    <TableHead className="text-right">Quantity</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reuisition.items.map(item => (
                                     <TableRow key={item.id}>
                                        <TableCell>{item.name}</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                     </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-medium mb-2">Justification</h4>
                        <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md">{reuisition.justification}</p>
                    </div>

                    {reuisition.customQuestions && reuisition.customQuestions.length > 0 && (
                        <>
                            <Separator />
                            <div>
                                <h4 className="font-medium mb-2">Custom Questions for Vendors</h4>
                                <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                                    {reuisition.customQuestions.map(q => <li key={q.id}>{q.questionText}</li>)}
                                </ul>
                            </div>
                        </>
                    )}
                </div>
            </ScrollArea>
            <DialogFooter>
                <Button onClick={onClose}>Close</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}

