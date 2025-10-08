
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, loading, roleName } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // This component's only job is to wait for the auth state and then route.
    // The layouts themselves handle permission checks and further redirection.
    if (!loading) {
      if (user) {
        if (roleName === 'Vendor') {
          router.push('/vendor/dashboard');
        } else {
          router.push('/dashboard');
        }
      } else {
        router.push('/login');
      }
    }
  }, [user, loading, roleName, router]);

  // Always show a loading spinner until the redirection happens.
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
