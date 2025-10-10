
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, isInitialized, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isInitialized) {
      if (user) {
        if (role === 'Vendor') {
          router.push('/vendor/dashboard');
        } else {
          const permissionsRole = role.replace(/ /g, '_');
          const allowedPaths = useAuth().rolePermissions[permissionsRole as keyof typeof useAuth.arguments] || [];
          const defaultPath = allowedPaths.includes('/dashboard') ? '/dashboard' : allowedPaths[0];
          router.push(defaultPath || '/login');
        }
      } else {
        router.push('/login');
      }
    }
  }, [user, isInitialized, role, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
