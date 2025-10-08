
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, loading, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect when loading is completely finished and we have a definitive user state.
    if (!loading) {
      if (user && role) {
        if (role === 'Vendor') {
          router.push('/vendor/dashboard');
        } else {
          router.push('/dashboard');
        }
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
