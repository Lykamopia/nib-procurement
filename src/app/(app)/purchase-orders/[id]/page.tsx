
'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { PurchaseOrder } from '@/lib/types';
import { PurchaseOrderDocument } from '@/components/purchase-order-document';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Hand, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function PurchaseOrderPage() {
    const [po, setPo] = useState<PurchaseOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const params = useParams();
    const id = params.id as string;
    const { user } = useAuth();
    const { toast } = useToast();

    const fetchPO = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const response = await fetch('/api/purchase-orders');
            if (!response.ok) throw new Error('Failed to fetch data');
            const data: PurchaseOrder[] = await response.json();
            const foundPo = data.find(p => p.id === id);
            if (foundPo) {
                setPo(foundPo);
            } else {
                setError('Purchase Order not found.');
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred');
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchPO();
    }, [id]);

    const handleHold = async () => {
        if (!user || !po) return;
        setIsUpdating(true);
        try {
            const response = await fetch(`/api/purchase-orders/${po.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'On Hold', userId: user.id }),
            });
            if (!response.ok) throw new Error('Failed to place PO on hold');
            toast({ title: 'Success', description: 'Purchase Order has been placed on hold.' });
            fetchPO(); // Re-fetch to get updated PO
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error instanceof Error ? error.message : 'An unknown error occurred',
            });
        } finally {
            setIsUpdating(false);
        }
    };


    if (loading) return <div>Loading Purchase Order...</div>;
    if (error) return <div className="text-destructive">{error}</div>;
    if (!po) return <div>Purchase Order not found.</div>;

    return (
        <div className="space-y-4">
             <div className="flex items-center justify-end gap-2 print:hidden">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isUpdating || po.status === 'On Hold'}>
                             {isUpdating ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Hand className="mr-2 h-4 w-4" />
                            )}
                            Place on Hold
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to place this PO on hold?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action should be taken if there is a dispute with the vendor or a delivery issue. It will pause further actions on this PO.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleHold}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
            <PurchaseOrderDocument po={po} />
        </div>
    )
}
