

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
import { Input } from './ui/input';
import { Button } from './ui/button';
import { DocumentRecord, AuditLog as AuditLogType } from '@/lib/types';
import { format, formatDistanceToNow } from 'date-fns';
import { Badge } from './ui/badge';
import {
  Download,
  History,
  Search,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  CheckCircle,
  FilePlus,
  ThumbsUp,
  XCircle,
  Edit,
  ArchiveX,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from './ui/dialog';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';

const PAGE_SIZE = 15;

const getStatusVariant = (status: string) => {
    status = status.toLowerCase();
    if (status.includes('approve') || status.includes('match') || status.includes('paid')) return 'default';
    if (status.includes('pending') || status.includes('submitted') || status.includes('issued')) return 'secondary';
    if (status.includes('reject') || status.includes('dispute') || status.includes('mismatch')) return 'destructive';
    return 'outline';
};

const getActionIcon = (action: string) => {
    const lowerAction = action.toLowerCase();
    if (lowerAction.includes('create')) return <FilePlus className="h-4 w-4" />;
    if (lowerAction.includes('approve')) return <ThumbsUp className="h-4 w-4" />;
    if (lowerAction.includes('reject')) return <XCircle className="h-4 w-4" />;
    if (lowerAction.includes('update') || lowerAction.includes('edit')) return <Edit className="h-4 w-4" />;
    if (lowerAction.includes('submit')) return <CheckCircle className="h-4 w-4" />;
    return <History className="h-4 w-4" />;
}

const AuditTrailDialog = ({ document, auditTrail }: { document: DocumentRecord, auditTrail: AuditLogType[] }) => {
    return (
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>Audit Trail for {document.type}: {document.id}</DialogTitle>
                <DialogDescription>
                    Showing all events related to this document, from newest to oldest.
                </DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto p-1">
                {auditTrail.length > 0 ? (
                    <div className="relative pl-6">
                        <div className="absolute left-6 top-0 h-full w-0.5 bg-border -translate-x-1/2"></div>
                        {auditTrail.map((log, index) => (
                           <div key={log.id} className="relative mb-8">
                               <div className="absolute -left-3 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-secondary">
                                   <div className="h-3 w-3 rounded-full bg-primary"></div>
                               </div>
                               <div className="pl-8">
                                   <div className="flex items-center justify-between">
                                        <Badge variant={log.action.includes('CREATE') ? 'default' : 'secondary'}>{log.action}</Badge>
                                        <time className="text-xs text-muted-foreground">{format(new Date(log.timestamp), 'PPpp')}</time>
                                   </div>
                                    <p className="mt-2 text-sm text-muted-foreground">{log.details}</p>
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        By <span className="font-semibold text-foreground">{log.user}</span> ({log.role})
                                    </p>
                               </div>
                           </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center h-24 flex items-center justify-center">No audit history found for this document.</div>
                )}
            </div>
        </DialogContent>
    )
}

export function RecordsPage() {
  const [records, setRecords] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const { user, role } = useAuth();


  const fetchRecords = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/records');
      if (!response.ok) {
        throw new Error('Failed to fetch records');
      }
      const data = await response.json();
      setRecords(data);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e instanceof Error ? e.message : 'An unknown error occurred' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);
  
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
        if (role !== 'Procurement Officer' && user) {
            // This is a simplified check. A robust implementation would check against user ID.
            if (record.user !== user.name) {
                return false;
            }
        }
        const lowerSearch = searchTerm.toLowerCase();
        return (
            record.id.toLowerCase().includes(lowerSearch) ||
            record.type.toLowerCase().includes(lowerSearch) ||
            record.title.toLowerCase().includes(lowerSearch) ||
            record.status.toLowerCase().includes(lowerSearch) ||
            record.user.toLowerCase().includes(lowerSearch)
        )
    })
  }, [records, searchTerm, user, role]);

  const totalPages = Math.ceil(filteredRecords.length / PAGE_SIZE);
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredRecords.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredRecords, currentPage]);

  const handleDownload = (record: DocumentRecord) => {
    toast({
        title: 'Simulating Download',
        description: `Downloading ${record.type} - ${record.id}.pdf...`
    })
    console.log("Simulating download for:", record);
  }

  if (loading) return <div>Loading records...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Records</CardTitle>
        <CardDescription>
          A central repository for all documents in the procurement lifecycle.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search all records..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Doc ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRecords.length > 0 ? (
                paginatedRecords.map((record, index) => (
                  <TableRow key={`${record.type}-${record.id}`}>
                    <TableCell className="text-muted-foreground">{(currentPage - 1) * PAGE_SIZE + index + 1}</TableCell>
                    <TableCell className="font-medium text-primary">{record.id}</TableCell>
                    <TableCell>{record.type}</TableCell>
                    <TableCell>{record.title}</TableCell>
                    <TableCell>{format(new Date(record.date), 'PP')}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(record.status)}>{record.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                        {record.amount > 0 ? `${record.amount.toLocaleString()} ETB`: '-'}
                    </TableCell>
                    <TableCell>
                        <div className="flex gap-2">
                             <Button variant="outline" size="sm" onClick={() => handleDownload(record)}>
                                <Download className="mr-2 h-4 w-4" /> Download
                             </Button>
                             <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <History className="mr-2 h-4 w-4" /> Trail
                                    </Button>
                                </DialogTrigger>
                                <AuditTrailDialog document={record} auditTrail={record.auditTrail || []}/>
                             </Dialog>
                        </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <ArchiveX className="h-16 w-16 text-muted-foreground/50" />
                      <div className="space-y-1">
                        <p className="font-semibold">No Records Found</p>
                        <p className="text-muted-foreground">There are no documents matching your search.</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
         <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
             Page {currentPage} of {totalPages} ({filteredRecords.length} total records)
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
  );
}
