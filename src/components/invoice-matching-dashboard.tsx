
'use client';

import React, { useState, useEffect } from 'react';
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
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { MatchingResult, MatchingStatus } from '@/lib/types';
import { format } from 'date-fns';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';
import { cn } from '@/lib/utils';

const MatchingStatusBadge = ({ status }: { status: MatchingStatus }) => {
  switch (status) {
    case 'Matched':
      return (
        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Matched
        </Badge>
      );
    case 'Mismatched':
      return (
        <Badge variant="destructive">
          <AlertTriangle className="mr-2 h-4 w-4" />
          Mismatched
        </Badge>
      );
    case 'Pending':
      return (
        <Badge variant="secondary">
          <Clock className="mr-2 h-4 w-4" />
          Pending
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const MatchDetailRow = ({ label, value, isMismatch = false }: { label: string, value: React.ReactNode, isMismatch?: boolean}) => (
    <div className={cn("flex justify-between py-1", isMismatch && "text-destructive font-bold")}>
        <span className="text-muted-foreground">{label}</span>
        <span>{value}</span>
    </div>
)

function MatchDetails({ result, onResolve }: { result: MatchingResult, onResolve: () => void }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isResolving, setResolving] = useState(false);

    const handleResolve = async () => {
        if (!user) return;
        setResolving(true);
        try {
            const response = await fetch('/api/matching', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ poId: result.poId, userId: user.id })
            });
            if (!response.ok) throw new Error("Failed to resolve mismatch.");
            toast({ title: "Mismatch Resolved", description: `PO ${result.poId} has been manually marked as matched.` });
            onResolve();
        } catch (error) {
             toast({
                variant: 'destructive',
                title: 'Error',
                description: error instanceof Error ? error.message : 'An unknown error occurred.',
            });
        } finally {
            setResolving(false);
        }
    }
    
  return (
    <div className="p-4 bg-muted/50">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Totals</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <MatchDetailRow label="PO Total" value={`${result.details.poTotal.toFixed(2)} ETB`} />
            <MatchDetailRow label="Invoice Total" value={`${result.details.invoiceTotal.toFixed(2)} ETB`} isMismatch={result.details.poTotal !== result.details.invoiceTotal}/>
            <MatchDetailRow label="PO Quantity" value={result.details.items.reduce((acc, i) => acc + i.poQuantity, 0)} />
            <MatchDetailRow label="GRN Quantity" value={result.details.grnTotalQuantity} isMismatch={result.details.items.reduce((acc, i) => acc + i.poQuantity, 0) !== result.details.grnTotalQuantity} />
            <MatchDetailRow label="Invoice Quantity" value={result.details.invoiceTotalQuantity} isMismatch={result.details.items.reduce((acc, i) => acc + i.poQuantity, 0) !== result.details.invoiceTotalQuantity} />
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
            <CardHeader><CardTitle className="text-base">Item Breakdown</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>PO Qty</TableHead>
                            <TableHead>GRN Qty</TableHead>
                            <TableHead>Inv Qty</TableHead>
                             <TableHead>PO Price</TableHead>
                            <TableHead>Inv Price</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {result.details.items.map(item => (
                            <TableRow key={item.itemId}>
                                <TableCell>{item.itemName}</TableCell>
                                <TableCell>{item.poQuantity}</TableCell>
                                <TableCell className={cn(!item.quantityMatch && "text-destructive font-bold")}>{item.grnQuantity}</TableCell>
                                <TableCell className={cn(!item.quantityMatch && "text-destructive font-bold")}>{item.invoiceQuantity}</TableCell>
                                <TableCell>{item.poUnitPrice.toFixed(2)} ETB</TableCell>
                                <TableCell className={cn(!item.priceMatch && "text-destructive font-bold")}>{item.invoiceUnitPrice.toFixed(2)} ETB</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
      {result.status === 'Mismatched' && (
        <div className="mt-4 flex justify-end">
            <Button onClick={handleResolve} disabled={isResolving}>
                {isResolving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Manually Resolve Mismatch
            </Button>
        </div>
      )}
    </div>
  );
}

export function InvoiceMatchingDashboard() {
  const [results, setResults] = useState<MatchingResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [openItem, setOpenItem] = useState<string | null>(null);

  const fetchResults = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/matching');
        const data = await response.json();
        setResults(data);
      } catch (error) {
        console.error('Failed to fetch matching results', error);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchResults();
  }, []);

  if (loading) {
    return <p>Running matching service...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice Matching Dashboard</CardTitle>
        <CardDescription>
          Review and resolve discrepancies between POs, Goods Receipts, and
          Invoices.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>PO Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>PO Total</TableHead>
                <TableHead>Invoice Total</TableHead>
                <TableHead>Qty Match</TableHead>
                <TableHead>Price Match</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.length > 0 ? (
                results.map((result) => (
                  <Collapsible asChild key={result.poId} onOpenChange={(isOpen) => setOpenItem(isOpen ? result.poId : null)}>
                    <>
                    <TableRow className="cursor-pointer">
                      <TableCell>
                        <CollapsibleTrigger asChild>
                           <Button variant="ghost" size="sm" className="w-9 p-0">
                                <span className="sr-only">Toggle Details</span>
                                {openItem === result.poId ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4"/>}
                           </Button>
                        </CollapsibleTrigger>
                      </TableCell>
                      <TableCell className="font-medium text-primary">
                        {result.poId}
                      </TableCell>
                      <TableCell>
                        <MatchingStatusBadge status={result.status} />
                      </TableCell>
                      <TableCell>{result.details.poTotal.toFixed(2)} ETB</TableCell>
                       <TableCell>{result.details.invoiceTotal.toFixed(2)} ETB</TableCell>
                      <TableCell>
                          {result.quantityMatch ? <CheckCircle2 className="text-green-500"/> : <AlertTriangle className="text-destructive" />}
                      </TableCell>
                       <TableCell>
                           {result.priceMatch ? <CheckCircle2 className="text-green-500"/> : <AlertTriangle className="text-destructive" />}
                      </TableCell>
                    </TableRow>
                     <CollapsibleContent asChild>
                        <TableRow>
                            <TableCell colSpan={7}>
                               <MatchDetails result={result} onResolve={fetchResults} />
                            </TableCell>
                        </TableRow>
                    </CollapsibleContent>
                    </>
                  </Collapsible>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No purchase orders available for matching.
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
