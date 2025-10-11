
'use client';

import React, { useState, useEffect } from 'react';
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
import { User } from '@/lib/types';

export function RoleSwitcher() {
  const { user, switchUser, allUsers, fetchAllUsers } = useAuth();
  const [localUsers, setLocalUsers] = useState<User[]>(allUsers);

  useEffect(() => {
    if (allUsers.length === 0) {
        fetchAllUsers().then(users => {
            if (users) setLocalUsers(users);
        });
    } else {
        setLocalUsers(allUsers);
    }
  }, [allUsers, fetchAllUsers]);

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
            {localUsers.map((u) => (
                 <SelectItem key={u.id} value={u.id}>
                    <div className="flex flex-col text-left">
                        <span className="font-medium">{u.name}</span>
                        <span className="text-xs text-muted-foreground">{u.role.replace(/_/g, ' ')}</span>
                    </div>
                </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}
