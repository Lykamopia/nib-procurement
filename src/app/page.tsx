
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
        // Determine the default path from rolePermissions
        const allowedPaths = rolePermissions[role] || [];
        const defaultPath = allowedPaths[0] || '/login';

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
