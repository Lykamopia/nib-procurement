
'use client';

import { useState, useEffect, useMemo } from 'react';
import { PurchaseRequisition, Quotation } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Award } from 'lucide-react';

const PAGE_SIZE = 9;

export default function VendorDashboardPage() {
    const { token, user } = useAuth();
    const [openRequisitions, setOpenRequisitions] = useState<PurchaseRequisition[]>([]);
    const [awardedRequisitions, setAwardedRequisitions] = useState<PurchaseRequisition[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        if (!token || !user?.vendorId) return;

        const fetchRequisitions = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch('/api/requisitions', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (!response.ok) {
                    if (response.status === 403) {
                         throw new Error('You do not have permission to view these resources.');
                    }
                    throw new Error('Failed to fetch requisitions.');
                }
                const data: PurchaseRequisition[] = await response.json();

                // 1. Filter for requisitions open for quoting
                const openForQuoting = data.filter(r => 
                    r.status === 'RFQ In Progress' &&
                    (r.allowedVendorIds === 'all' || (Array.isArray(r.allowedVendorIds) && r.allowedVendorIds.includes(user.vendorId!)))
                );
                setOpenRequisitions(openForQuoting);
                
                // 2. Filter for requisitions where the vendor's quote was awarded
                const vendorAwards = data.filter(req => {
                    return req.quotations?.some(quote => quote.vendorId === user.vendorId && quote.status === 'Awarded');
                });
                setAwardedRequisitions(vendorAwards);

            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            } finally {
                setLoading(false);
            }
        };

        fetchRequisitions();
    }, [token, user]);

    const totalPages = Math.ceil(openRequisitions.length / PAGE_SIZE);
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * PAGE_SIZE;
        return openRequisitions.slice(startIndex, startIndex + PAGE_SIZE);
    }, [openRequisitions, currentPage]);


    return (
        <div className="space-y-8">
            
            {loading && <p>Loading dashboard...</p>}
            {error && <p className="text-destructive">Error: {error}</p>}

            {!loading && !error && (
                <>
                    {awardedRequisitions.length > 0 && (
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <h1 className="text-3xl font-bold flex items-center gap-2"><Award className="text-primary"/> Congratulations! You've Been Awarded</h1>
                                <p className="text-muted-foreground">
                                    The following requisitions have been awarded to you. Await the official Purchase Order.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {awardedRequisitions.map(req => (
                                    <Card key={req.id} className="border-primary ring-2 ring-primary">
                                        <CardHeader>
                                            <CardTitle>{req.title}</CardTitle>
                                            <CardDescription>From {req.department} Department</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-sm text-muted-foreground space-y-2">
                                                <div><span className="font-semibold text-foreground">Requisition ID:</span> {req.id}</div>
                                                <div><Badge>Awarded</Badge></div>
                                            </div>
                                        </CardContent>
                                        <CardFooter>
                                            <Button asChild className="w-full" variant="secondary">
                                                <Link href={`/vendor/requisitions/${req.id}`}>
                                                    View Details <ArrowRight className="ml-2 h-4 w-4" />
                                                </Link>
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <h2 className="text-3xl font-bold">Open for Quotation</h2>
                            <p className="text-muted-foreground">
                                The following requisitions are currently open for quotation.
                            </p>
                        </div>
                        {paginatedData.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {paginatedData.map((req) => (
                                    <Card key={req.id} className="flex flex-col">
                                        <CardHeader>
                                            <CardTitle>{req.title}</CardTitle>
                                            <CardDescription>From {req.department} Department</CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex-grow">
                                            <div className="text-sm text-muted-foreground space-y-2">
                                                <div>
                                                    <span className="font-semibold text-foreground">Requisition ID:</span> {req.id}
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-foreground">Posted:</span> {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
                                                </div>
                                                <div>
                                                    <Badge>{req.status}</Badge>
                                                </div>
                                            </div>
                                        </CardContent>
                                        <CardFooter>
                                            <Button asChild className="w-full">
                                                <Link href={`/vendor/requisitions/${req.id}`}>
                                                    View & Quote <ArrowRight className="ml-2 h-4 w-4" />
                                                </Link>
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 border border-dashed rounded-lg">
                                <h3 className="text-xl font-semibold">No Open Requisitions</h3>
                                <p className="text-muted-foreground">There are no requisitions currently available for quotation.</p>
                            </div>
                        )}
                        
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4">
                                <div className="text-sm text-muted-foreground">
                                    Page {currentPage} of {totalPages} ({openRequisitions.length} total requisitions)
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="icon" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}><ChevronsLeft /></Button>
                                    <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft /></Button>
                                    <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight /></Button>
                                    <Button variant="outline" size="icon" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}><ChevronsRight /></Button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}
