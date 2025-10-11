
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
    if (!loading) {
      if (user && role) {
        // Determine the default path based on role permissions
        const allowedPaths = rolePermissions[role] || [];
        let defaultPath = '/login'; // Fallback to login

        if (role === 'Vendor') {
          defaultPath = '/vendor/dashboard';
        } else if (allowedPaths.includes('/dashboard')) {
          defaultPath = '/dashboard';
        } else if (allowedPaths.length > 0) {
          defaultPath = allowedPaths[0]; // Go to the first allowed page
        }
        
        router.push(defaultPath);

      } else {
        router.push('/login');
      }
    }
  }, [user, loading, role, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
