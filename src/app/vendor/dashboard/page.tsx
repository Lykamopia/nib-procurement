
'use client';

import { useState, useEffect, useMemo } from 'react';
import { PurchaseRequisition } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';

const PAGE_SIZE = 10;

export default function VendorDashboardPage() {
    const { token, user } = useAuth();
    const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([]);
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
                // Show requisitions that are open for quoting and either for all vendors or for this specific vendor
                const openForQuoting = data.filter(r => 
                    r.status === 'RFQ In Progress' &&
                    (r.allowedVendorIds === 'all' || (Array.isArray(r.allowedVendorIds) && r.allowedVendorIds.includes(user.vendorId!)))
                );
                setRequisitions(openForQuoting);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            } finally {
                setLoading(false);
            }
        };

        fetchRequisitions();
    }, [token, user]);

    const totalPages = Math.ceil(requisitions.length / PAGE_SIZE);
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * PAGE_SIZE;
        return requisitions.slice(startIndex, startIndex + PAGE_SIZE);
    }, [requisitions, currentPage]);


    return (
        <div>
            <h1 className="text-3xl font-bold mb-4">Open for Quotation</h1>
            
            {loading && <p>Loading open requisitions...</p>}
            {error && <p className="text-destructive">Error: {error}</p>}

            {!loading && !error && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Available Requisitions</CardTitle>
                        <CardDescription>
                        The following requisitions are currently open for quotation.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                       <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead className="w-10">#</TableHead>
                                <TableHead>Requisition ID</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Department</TableHead>
                                <TableHead>Date Created</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedData.length > 0 ? (
                                    paginatedData.map((req, index) => (
                                    <TableRow key={req.id}>
                                        <TableCell className="text-muted-foreground">{(currentPage - 1) * PAGE_SIZE + index + 1}</TableCell>
                                        <TableCell className="font-medium">{req.id}</TableCell>
                                        <TableCell>{req.title}</TableCell>
                                        <TableCell>{req.department}</TableCell>
                                        <TableCell>{format(new Date(req.createdAt), 'PPP')}</TableCell>
                                        <TableCell><Badge>{req.status}</Badge></TableCell>
                                        <TableCell>
                                             <Button asChild variant="outline" size="sm">
                                                <Link href={`/vendor/requisitions/${req.id}`}>
                                                    View & Quote <ArrowRight className="ml-2 h-4 w-4" />
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">
                                            There are no requisitions currently open for quotation.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                         <div className="flex items-center justify-between mt-4">
                            <div className="text-sm text-muted-foreground">
                                Page {currentPage} of {totalPages} ({requisitions.length} total requisitions)
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="icon" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}><ChevronsLeft /></Button>
                                <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft /></Button>
                                <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight /></Button>
                                <Button variant="outline" size="icon" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}><ChevronsRight /></Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
