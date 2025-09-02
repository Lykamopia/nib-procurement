
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
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from './ui/dialog';

const getStatusVariant = (status: string) => {
    status = status.toLowerCase();
    if (status.includes('approve') || status.includes('match') || status.includes('paid')) return 'default';
    if (status.includes('pending') || status.includes('submitted') || status.includes('issued')) return 'secondary';
    if (status.includes('reject') || status.includes('dispute') || status.includes('mismatch')) return 'destructive';
    return 'outline';
};

const AuditTrailDialog = ({ document, auditTrail }: { document: DocumentRecord, auditTrail: AuditLogType[] }) => {
    return (
        <DialogContent className="max-w-3xl">
            <DialogHeader>
                <DialogTitle>Audit Trail for {document.type}: {document.id}</DialogTitle>
                <DialogDescription>
                    Showing all events related to this document.
                </DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Timestamp</TableHead>
                            <TableHead>User (Role)</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Details</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {auditTrail.length > 0 ? auditTrail.map(log => (
                            <TableRow key={log.id}>
                                <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}</TableCell>
                                <TableCell>{log.user} ({log.role})</TableCell>
                                <TableCell><Badge variant={log.action.includes('CREATE') ? 'default' : 'secondary'}>{log.action}</Badge></TableCell>
                                <TableCell className="text-sm">{log.details}</TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center h-24">No audit history found for this document.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </DialogContent>
    )
}

export function RecordsPage() {
  const [records, setRecords] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();


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
        const lowerSearch = searchTerm.toLowerCase();
        return (
            record.id.toLowerCase().includes(lowerSearch) ||
            record.type.toLowerCase().includes(lowerSearch) ||
            record.title.toLowerCase().includes(lowerSearch) ||
            record.status.toLowerCase().includes(lowerSearch) ||
            record.user.toLowerCase().includes(lowerSearch)
        )
    })
  }, [records, searchTerm]);

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
              {filteredRecords.length > 0 ? (
                filteredRecords.map(record => (
                  <TableRow key={`${record.type}-${record.id}`}>
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
                  <TableCell colSpan={7} className="h-24 text-center">
                    No records found.
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
