
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, role, isInitialized, rolePermissions } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isInitialized) {
      if (user && role) {
        if (role === 'Vendor') {
          router.push('/vendor/dashboard');
        } else {
            const permissionsRole = role.replace(/ /g, '_');
            const allowedPaths = rolePermissions[permissionsRole as keyof typeof rolePermissions] || [];
            const defaultPath = allowedPaths.includes('/dashboard') ? '/dashboard' : allowedPaths[0];
            if (defaultPath) {
                router.push(defaultPath);
            } else {
                router.push('/login');
            }
        }
      } else {
        router.push('/login');
      }
    }
  }, [user, role, isInitialized, router, rolePermissions]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
