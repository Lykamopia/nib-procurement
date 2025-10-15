
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, loading, role, rolePermissions: permissions } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log("HOME_PAGE: useEffect triggered.", { loading, user: user?.name, role });

    if (loading) {
      console.log("HOME_PAGE: Still loading auth state, waiting...");
      return; // Wait until authentication state is fully loaded
    }

    if (!user || !role) {
      console.log("HOME_PAGE: No user or role found. Redirecting to /login.");
      router.push('/login');
      return;
    }

    if (role === 'Vendor') {
      console.log("HOME_PAGE: User is a Vendor. Redirecting to /vendor/dashboard.");
      router.push('/vendor/dashboard');
      return;
    } 
    
    // For all other roles
    const allowedPaths = permissions[role] || [];
    const defaultPath = allowedPaths.includes('/dashboard') ? '/dashboard' : allowedPaths[0];

    console.log(`HOME_PAGE: Determining redirect for role ${role}.`);
    console.log("HOME_PAGE: Allowed paths:", allowedPaths);
    console.log("HOME_PAGE: Determined default path:", defaultPath);

    if (defaultPath) {
      router.push(defaultPath);
    } else {
      console.error(`HOME_PAGE: User role ${role} has no default path defined. Logging out as a fallback.`);
      router.push('/login');
    }
    
  }, [user, loading, role, router, permissions]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
