
'use client';

import { useAuth } from '@/contexts/auth-context';
import { useCallback } from 'react';
import { PermissionAction, PermissionSubject } from '@/lib/types';

export const usePermissions = () => {
  const { user } = useAuth();

  const can = useCallback(
    (action: PermissionAction, subject: PermissionSubject) => {
      if (!user || !user.role || !user.role.permissions) {
        return false;
      }
      
      // Admin role has all permissions
      if (user.role.name === 'Admin') {
          return true;
      }

      return user.role.permissions.some(
        p => p.action === action && p.subject === subject
      );
    },
    [user]
  );

  return { can };
};
