'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { mockAuditLogs } from '@/lib/data';
import { Badge } from './ui/badge';
import { formatDistanceToNow } from 'date-fns';

export function AuditLog() {

  const getActionVariant = (action: string) => {
    switch (action) {
      case 'CREATE':
      case 'CREATE_PO':
      case 'GENERATE_RFQ':
        return 'default';
      case 'APPROVE':
        return 'default';
      case 'POLICY_CHECK':
        return 'secondary';
      default:
        return 'outline';
    }
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
            {mockAuditLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-muted-foreground text-xs">
                  {formatDistanceToNow(log.timestamp, { addSuffix: true })}
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
        </Table>
      </CardContent>
    </Card>
  );
}
