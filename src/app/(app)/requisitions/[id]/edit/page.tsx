
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { NeedsRecognitionForm } from '@/components/needs-recognition-form';
import { PurchaseRequisition } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';

export default function EditRequisitionPage() {
  const [requisition, setRequisition] = useState<PurchaseRequisition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!id) return;
    const fetchRequisition = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/requisitions/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch requisition data.');
        }
        const data: PurchaseRequisition = await response.json();
        setRequisition(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'An unknown error occurred.');
      } finally {
        setLoading(false);
      }
    };
    fetchRequisition();
  }, [id]);

  const handleSuccess = () => {
    router.push('/requisitions');
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive text-center p-8">{error}</div>;
  }
  
  if (!requisition) {
    return <div className="text-center p-8">Requisition not found.</div>;
  }
  
  if (requisition.requesterId !== user?.id) {
     return (
          <Card>
              <CardHeader><CardTitle>Access Denied</CardTitle></CardHeader>
              <CardContent>
                  <p>You are not authorized to edit this requisition.</p>
              </CardContent>
          </Card>
      )
  }

  if (requisition.status !== 'Draft' && requisition.status !== 'Rejected') {
      return (
          <Card>
              <CardHeader><CardTitle>Cannot Edit Requisition</CardTitle></CardHeader>
              <CardContent>
                  <p>This requisition cannot be edited because its status is "{requisition.status}". Only Draft or Rejected requisitions can be edited.</p>
              </CardContent>
          </Card>
      )
  }

  return (
    <NeedsRecognitionForm 
        existingRequisition={requisition} 
        onSuccess={handleSuccess} 
    />
  );
}
