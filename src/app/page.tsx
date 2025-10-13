
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
    // We only want to redirect once the auth state is fully determined.
    if (!loading) {
      if (user && role) {
        // If the user has a vendorId, they are a vendor.
        if (user.vendorId) {
          router.push('/vendor/dashboard');
        } else {
          // Otherwise, find the first accessible path for their role.
          const defaultPath = (rolePermissions[role] || [])[0] || '/dashboard';
          router.push(defaultPath);
        }
      } else {
        // If there's no user, it's safe to redirect to login.
        router.push('/login');
      }
    }
  }, [user, loading, role, router]);

  // Render a loading spinner while the auth state is being determined.
  // The useEffect above will handle the redirect once `loading` is false.
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
