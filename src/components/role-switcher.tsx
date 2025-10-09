'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User as UserIcon } from 'lucide-react';
import { Label } from './ui/label';
import { useAuth } from '@/contexts/auth-context';
import type { User } from '@/lib/types';

export function RoleSwitcher() {
  const { user, allUsers, switchUser } = useAuth();

  // It's possible the 'role' object is not fully populated on first render
  // This function safely gets the role name
  const getRoleName = (u: User) => {
      if (typeof u.role === 'string') {
          return u.role;
      }
      return u.role?.name || 'N/A';
  }

  return (
    <div className="flex w-full flex-col gap-2 p-2">
      <Label className="text-xs font-medium text-muted-foreground">Switch User</Label>
      <Select
        value={user?.id || ''}
        onValueChange={(userId) => switchUser(userId)}
      >
        <SelectTrigger className="w-full h-9">
          <div className="flex items-center gap-2 truncate">
            <UserIcon className="h-4 w-4" />
            <SelectValue placeholder="Select a user to test" />
          </div>
        </SelectTrigger>
        <SelectContent>
            {allUsers.map((u) => (
                 <SelectItem key={u.id} value={u.id}>
                    <div className="flex flex-col text-left">
                        <span className="font-medium">{u.name}</span>
                        <span className="text-xs text-muted-foreground">{getRoleName(u)}</span>
                    </div>
                </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}
