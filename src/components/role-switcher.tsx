'use client';

import { useRole, UserRole } from '@/contexts/role-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User } from 'lucide-react';
import { Label } from './ui/label';

export function RoleSwitcher() {
  const { role, setRole } = useRole();

  return (
    <div className="flex w-full flex-col gap-2 p-2">
      <Label className="text-xs font-medium text-muted-foreground">Current Role</Label>
      <Select
        value={role}
        onValueChange={(value) => setRole(value as UserRole)}
      >
        <SelectTrigger className="w-full h-9">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <SelectValue placeholder="Select role" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Requester">Requester</SelectItem>
          <SelectItem value="Approver">Approver</SelectItem>
          <SelectItem value="Procurement Officer">Procurement Officer</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
