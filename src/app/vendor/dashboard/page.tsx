
'use client';

import { useState, useEffect }from 'react';
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
import { ArrowRight } from 'lucide-react';


export default function VendorDashboardPage() {
    const { token } = useAuth();
    const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token) return;

        const fetchRequisitions = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch('/api/vendor/requisitions', {
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
                const data = await response.json();
                setRequisitions(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            } finally {
                setLoading(false);
            }
        };

        fetchRequisitions();
    }, [token]);

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
                                <TableHead>Requisition ID</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Department</TableHead>
                                <TableHead>Date Created</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {requisitions.length > 0 ? (
                                    requisitions.map((req) => (
                                    <TableRow key={req.id}>
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
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            There are no requisitions currently open for quotation.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
