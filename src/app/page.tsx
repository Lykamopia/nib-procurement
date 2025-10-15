
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
    if (loading) {
      return; // Wait until authentication state is fully loaded
    }

    if (!user || !role) {
      router.push('/login');
      return;
    }

    if (role === 'Vendor') {
      router.push('/vendor/dashboard');
      return;
    } 
    
    const allowedPaths = rolePermissions[role] || [];
    // Prefer dashboard if available, otherwise take the first available path.
    const defaultPath = allowedPaths.includes('/dashboard') ? '/dashboard' : allowedPaths[0];

    if (defaultPath) {
      router.push(defaultPath);
    } else {
      console.error(`User role ${role} has no default path defined. Logging out.`);
      // If no paths are defined for a role, it's a configuration error. Logout to prevent a loop.
      router.push('/login');
    }
    
  }, [user, loading, role, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
