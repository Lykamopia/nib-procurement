
'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { PurchaseOrder } from '@/lib/types';
import { PurchaseOrderDocument } from '@/components/purchase-order-document';

export default function PurchaseOrderPage() {
    const [po, setPo] = useState<PurchaseOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const params = useParams();
    const id = params.id as string;

    useEffect(() => {
        if (!id) return;

        const fetchAllPOs = async () => {
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
        
        fetchAllPOs();
    }, [id]);

    if (loading) return <div>Loading Purchase Order...</div>;
    if (error) return <div className="text-destructive">{error}</div>;
    if (!po) return <div>Purchase Order not found.</div>;

    return <PurchaseOrderDocument po={po} />;
}
