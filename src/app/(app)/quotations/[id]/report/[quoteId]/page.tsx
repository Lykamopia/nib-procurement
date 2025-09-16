

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PurchaseRequisition, Quotation } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Printer } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';

export default function ScoringReportPage() {
    const [requisition, setRequisition] = useState<PurchaseRequisition | null>(null);
    const [quotation, setQuotation] = useState<Quotation | null>(null);
    const [loading, setLoading] = useState(true);
    const params = useParams();
    const router = useRouter();
    const { id: requisitionId, quoteId } = params;
    const { toast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            if (!requisitionId || !quoteId) return;
            setLoading(true);
            try {
                const [reqRes, quoteRes] = await Promise.all([
                    fetch(`/api/requisitions?id=${requisitionId}`),
                    fetch('/api/quotations')
                ]);
                
                const allReqs: PurchaseRequisition[] = await reqRes.json();
                const foundReq = allReqs.find(r => r.id === requisitionId);
                
                const allQuotes: Quotation[] = await quoteRes.json();
                const foundQuote = allQuotes.find(q => q.id === quoteId);

                if (foundReq) setRequisition(foundReq);
                if (foundQuote) setQuotation(foundQuote);
                
                if (!foundReq || !foundQuote) {
                    toast({ variant: 'destructive', title: 'Error', description: 'Could not find the requested data.' });
                }

            } catch (error) {
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to load report data.' });
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [requisitionId, quoteId, toast]);

    if (loading) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!requisition || !quotation) {
        return <div className="text-center py-10">Report data not found.</div>;
    }
    
    const handlePrint = () => {
        window.print();
    }

    return (
        <div className="bg-background min-h-screen">
            <header className="p-4 flex justify-between items-center bg-card border-b print:hidden">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Quotations
                </Button>
                <h1 className="text-xl font-semibold">Scoring Report</h1>
                <Button onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" /> Print to PDF
                </Button>
            </header>
            <main className="p-4 sm:p-6 md:p-8">
                <Card className="max-w-4xl mx-auto p-2 sm:p-4 print:shadow-none print:border-none">
                    <CardHeader className="flex flex-col sm:flex-row items-start justify-between gap-4">
                        <div className='flex items-center gap-4'>
                            <Image src="/logo.png" alt="Nib Procurement Logo" width={48} height={48} className="size-12 hidden sm:block" />
                            <div>
                                <CardTitle className="text-3xl">Scoring Evaluation Report</CardTitle>
                                <CardDescription>A detailed breakdown of committee scores for a vendor quotation.</CardDescription>
                            </div>
                        </div>
                         <div className="text-left sm:text-right text-xs text-muted-foreground pt-2 sm:pt-0">
                            <p><span className="font-semibold">Requisition ID:</span> {requisition.id}</p>
                            <p><span className="font-semibold">Quotation ID:</span> {quotation.id}</p>
                            <p><span className="font-semibold">Report Generated:</span> {format(new Date(), 'PPpp')}</p>
                        </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-6">
                        <Separator />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                            <div className="space-y-2">
                                <h3 className="font-semibold text-lg">Requisition Details</h3>
                                <p><span className="text-muted-foreground">Title:</span> {requisition.title}</p>
                                <p><span className="text-muted-foreground">Department:</span> {requisition.department}</p>
                            </div>
                             <div className="space-y-2">
                                <h3 className="font-semibold text-lg">Quotation Details</h3>
                                <p><span className="text-muted-foreground">Vendor:</span> {quotation.vendorName}</p>
                                <p><span className="text-muted-foreground">Total Quoted Price:</span> {quotation.totalPrice.toLocaleString()} ETB</p>
                                <p><span className="text-muted-foreground">Final Score:</span> <Badge>{quotation.finalAverageScore?.toFixed(2) || 'N/A'}</Badge></p>
                            </div>
                        </div>
                        <Separator />

                        <div>
                            <h3 className="text-xl font-semibold mb-4">Committee Scoring Breakdown</h3>
                            <div className="space-y-8">
                                {quotation.scores && quotation.scores.length > 0 ? (
                                    quotation.scores.map(scoreSet => (
                                        <Card key={scoreSet.scorerId} className="bg-muted/30">
                                            <CardHeader className="flex flex-row items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Avatar>
                                                        <AvatarImage src={`https://picsum.photos/seed/${scoreSet.scorerId}/40/40`} />
                                                        <AvatarFallback>{scoreSet.scorerName.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <h4 className="font-semibold">{scoreSet.scorerName}</h4>
                                                         <p className="text-xs text-muted-foreground">
                                                            Submitted {formatDistanceToNow(new Date(scoreSet.submittedAt), { addSuffix: true })}
                                                         </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-bold text-primary">{scoreSet.finalScore.toFixed(2)} / 100</p>
                                                    <p className="text-xs text-muted-foreground">Final Score</p>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                {scoreSet.committeeComment && (
                                                    <div>
                                                        <h5 className="font-semibold text-sm">Overall Comment</h5>
                                                        <p className="text-sm text-muted-foreground italic p-3 border bg-background rounded-md mt-1">"{scoreSet.committeeComment}"</p>
                                                    </div>
                                                )}
                                                <div>
                                                    <h5 className="font-semibold text-sm mb-2">Criteria Scores</h5>
                                                     <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Criterion</TableHead>
                                                                <TableHead className="w-24 text-right">Score</TableHead>
                                                                <TableHead>Comment</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {scoreSet.financialScores.map(score => {
                                                                const criterion = requisition.evaluationCriteria?.financialCriteria.find(c => c.id === score.criterionId);
                                                                return (
                                                                    <TableRow key={score.criterionId}>
                                                                        <TableCell>{criterion?.name || 'N/A'}</TableCell>
                                                                        <TableCell className="text-right font-mono">{score.score}</TableCell>
                                                                        <TableCell className="text-xs text-muted-foreground italic">{score.comment || '-'}</TableCell>
                                                                    </TableRow>
                                                                )
                                                            })}
                                                            {scoreSet.technicalScores.map(score => {
                                                                const criterion = requisition.evaluationCriteria?.technicalCriteria.find(c => c.id === score.criterionId);
                                                                return (
                                                                    <TableRow key={score.criterionId}>
                                                                        <TableCell>{criterion?.name || 'N/A'}</TableCell>
                                                                        <TableCell className="text-right font-mono">{score.score}</TableCell>
                                                                        <TableCell className="text-xs text-muted-foreground italic">{score.comment || '-'}</TableCell>
                                                                    </TableRow>
                                                                )
                                                            })}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                ) : (
                                    <p className="text-center text-muted-foreground py-10">No scores have been submitted for this quotation.</p>
                                )}
                            </div>
                        </div>

                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
