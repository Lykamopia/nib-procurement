
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, isInitialized, role, rolePermissions } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only perform redirects once the auth state is fully initialized.
    if (isInitialized) {
      if (user && role) {
        if (role === 'Vendor') {
          router.push('/vendor/dashboard');
          return;
        }

        // **THE FIX**: Normalize the role name by replacing spaces with underscores
        // before looking up permissions. This is critical for roles like "Procurement Officer".
        const permissionsRole = role.replace(/ /g, '_');
        
        const allowedPaths = rolePermissions[permissionsRole] || [];
        
        // Determine the default landing page for the user's role.
        const defaultPath = allowedPaths.includes('/dashboard') ? '/dashboard' : allowedPaths[0];

        if (defaultPath) {
          router.push(defaultPath);
        } else {
          // If a user is authenticated but has no valid pages, it's an error state.
          // Log them out to prevent a redirect loop.
          console.error(`No default path found for role: ${role}. Logging out.`);
          router.push('/login');
        }
      } else {
        // If not authenticated, redirect to login.
        router.push('/login');
      }
    }
  }, [user, isInitialized, role, router, rolePermissions]);

  // Show a loading spinner while the auth state is initializing.
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
