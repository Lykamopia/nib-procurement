
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, isInitialized, role, rolePermissions } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isInitialized) {
      if (user && role) {
        if (role === 'Vendor') {
          router.push('/vendor/dashboard');
        } else {
          const permissionsRole = role.replace(/ /g, '_');
          const allowedPaths = rolePermissions[permissionsRole] || [];
          const defaultPath = allowedPaths.includes('/dashboard') ? '/dashboard' : allowedPaths[0];
          if (defaultPath) {
            router.push(defaultPath);
          } else {
            // If no default path is found for a non-vendor role, something is wrong with permissions.
            // Log out to prevent a loop.
            console.error(`No default path found for role: ${role}. Logging out.`);
            router.push('/login');
          }
        }
      } else {
        router.push('/login');
      }
    }
  }, [user, isInitialized, role, router, rolePermissions]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
