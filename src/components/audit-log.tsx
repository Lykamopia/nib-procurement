
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { AuditLog as AuditLogType } from '@/lib/types';

export function AuditLog() {
  const [logs, setLogs] = useState<AuditLogType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/audit-log');
        const data = await response.json();
        setLogs(data);
      } catch (error) {
        console.error("Failed to fetch audit logs", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);


  const getActionVariant = (action: string) => {
    const lowerAction = action.toLowerCase();
    if (lowerAction.includes('create') || lowerAction.includes('approve') || lowerAction.includes('award')) return 'default';
    if (lowerAction.includes('update') || lowerAction.includes('submit')) return 'secondary';
    if (lowerAction.includes('reject') || lowerAction.includes('dispute')) return 'destructive';
    return 'outline';
  }

  if (loading) {
    return <p>Loading audit log...</p>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Log</CardTitle>
        <CardDescription>
          A chronological log of all actions and events in the system.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead className="w-[150px]">Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead className="w-[40%]">Details</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {logs.map((log) => (
                <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground text-xs">
                    {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="font-medium">{log.user}</TableCell>
                    <TableCell>{log.role}</TableCell>
                    <TableCell>
                    <Badge variant={getActionVariant(log.action)}>{log.action}</Badge>
                    </TableCell>
                    <TableCell>
                    {log.entity}: <span className="text-muted-foreground">{log.entityId}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{log.details}</TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>>
        </div>
      </CardContent>
    </Card>
  );
}
