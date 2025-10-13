
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';
import { rolePermissions } from '@/lib/roles';

export default function HomePage() {
  const { user, loading, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !role) {
      if (user) {
        // User exists but role hasn't loaded, wait.
        return;
      }
      router.push('/login');
      return;
    }

    if (!loading && user && role) {
      if (role === 'Vendor') {
        router.push('/vendor/dashboard');
      } else {
        const allowedPaths = rolePermissions[role] || [];
        const defaultPath = allowedPaths.includes('/dashboard') ? '/dashboard' : allowedPaths[0];

        if (defaultPath) {
          router.push(defaultPath);
        } else {
          // Fallback if user has no allowed pages, e.g. logout or show error
          router.push('/login');
        }
      }
    }
  }, [user, loading, role, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
