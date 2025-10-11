
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from './ui/card';
import { Button } from './ui/button';
import { PurchaseRequisition } from '@/lib/types';
import { format } from 'date-fns';
import {
  ArrowRight,
  ClipboardCheck,
  ClipboardX,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Badge } from './ui/badge';
import { useRouter } from 'next/navigation';

export function ReviewsTable() {
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, role } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchRequisitionsForReview = async () => {
      if (!user || !role) return;

      // Determine which status to fetch based on the user's role
      let statusToFetch = '';
      if (role === 'Committee A Member') {
        statusToFetch = 'Pending_Committee_A_Review';
      } else if (role === 'Committee B Member') {
        statusToFetch = 'Pending_Committee_B_Review';
      } else if (role === 'Approver') {
          // Approvers might need to see final approvals
          statusToFetch = 'Pending_Final_Approval';
      }

      if (!statusToFetch) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const response = await fetch(`/api/requisitions?status=${statusToFetch.replace(/ /g, '_')}`);
        if (!response.ok) {
          throw new Error('Failed to fetch requisitions for review');
        }
        const data: PurchaseRequisition[] = await response.json();
        
        // Final filter to ensure the requisition is assigned to this approver
        const assignedRequisitions = data.filter(r => r.currentApproverId === user.id);
        
        setRequisitions(assignedRequisitions);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'An unknown error occurred');
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch your assigned reviews.'})
      } finally {
        setLoading(false);
      }
    };

    fetchRequisitionsForReview();
  }, [user, role, toast]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  if (error) {
    return <div className="text-destructive text-center p-8">{error}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Awaiting Your Review</CardTitle>
        <CardDescription>
          The following high-value awards are pending your review and recommendation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Req. ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Award Value</TableHead>
                <TableHead>Submitted At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requisitions.length > 0 ? (
                requisitions.map((req) => (
                  <TableRow key={req.id} className="cursor-pointer" onClick={() => router.push(`/quotations/${req.id}`)}>
                    <TableCell className="font-medium text-primary">{req.id}</TableCell>
                    <TableCell>{req.title}</TableCell>
                    <TableCell>{req.totalPrice.toLocaleString()} ETB</TableCell>
                    <TableCell>{format(new Date(req.updatedAt), 'PP')}</TableCell>
                    <TableCell>
                        <Badge variant="secondary">{req.status.replace(/_/g, ' ')}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       <Button variant="outline" size="sm">
                          Review & Recommend <ArrowRight className="ml-2 h-4 w-4" />
                       </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <ClipboardCheck className="h-16 w-16 text-muted-foreground/50" />
                      <div className="space-y-1">
                        <p className="font-semibold">All Caught Up</p>
                        <p className="text-muted-foreground">There are no awards pending your review at this time.</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
