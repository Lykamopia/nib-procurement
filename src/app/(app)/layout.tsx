

'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
} from '@/components/ui/sidebar';
import {
  LogOut,
  Loader2,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { navItems, rolePermissions } from '@/lib/roles';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { useToast } from '@/hooks/use-toast';
import { RoleSwitcher } from '@/components/role-switcher';

const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout, loading, role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const accessibleNavItems = useMemo(() => {
    if (!role) return [];
    const allowedPaths = rolePermissions[role] || [];
    return navItems.filter(item => {
        // Hide settings unless Procurement Officer or Admin
        if (item.path === '/settings') {
            return role === 'Procurement Officer' || role === 'Admin';
        }
        // Hide audit log unless Procurement Officer
        if (item.path === '/audit-log') {
            return role === 'Procurement Officer' || role === 'Admin';
        }
        // Hide contracts unless Procurement Officer
        if (item.path === '/contracts') {
            return role === 'Procurement Officer' || role === 'Admin';
        }
        return allowedPaths.includes(item.path);
    });
  }, [role]);

  const handleLogout = useCallback(() => {
    toast({
      title: 'Session Expired',
      description: 'You have been logged out due to inactivity.',
    });
    logout();
  }, [logout, toast]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const resetTimeout = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleLogout, SESSION_TIMEOUT);
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

    const resetTimerOnActivity = () => {
      resetTimeout();
    };

    if (user) {
      resetTimeout(); // Initialize timeout on login
      events.forEach(event => window.addEventListener(event, resetTimerOnActivity));
    }

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimerOnActivity));
    };
  }, [user, handleLogout]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  
  // Page-level access check
  useEffect(() => {
    if (!loading && role) {
      const currentPath = pathname.split('?')[0];
      const allowedPaths = rolePermissions[role] || [];
      
      const isAllowed = 
        allowedPaths.includes(currentPath) || 
        allowedPaths.some(p => p.includes('[id]') && currentPath.startsWith(p.split('[id]')[0]));

      if (!isAllowed) {
        // Find the default path for the role, which is usually the first one or dashboard
        const defaultPath = allowedPaths.includes('/dashboard') 
          ? '/dashboard' 
          : allowedPaths.length > 0 ? allowedPaths[0] : null;

        if (defaultPath) {
          router.push(defaultPath);
        } else {
          // If no default path, logout or redirect to an error page
          logout();
        }
      }
    }
  }, [pathname, loading, role, router, logout]);

  if (loading || !user || !role) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Nib InternationalBank Logo" width={28} height={28} className="size-7" />
            <span className="text-lg font-semibold">Nib InternationalBank</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {accessibleNavItems.map(item => (
                <SidebarMenuItem key={item.path}>
                    <Link href={item.path}>
                        <SidebarMenuButton
                        isActive={pathname.startsWith(item.path)}
                        tooltip={item.label}
                        >
                        <item.icon />
                        <span>{item.label}</span>
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
            {process.env.NODE_ENV === 'development' && <RoleSwitcher />}
          <div className="p-2">
            <Button variant="ghost" className="w-full justify-start" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="md:hidden" />
            <Breadcrumbs />
          </div>
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            <span className="text-sm text-muted-foreground">{user.name}</span>
            <Avatar>
              <AvatarImage
                src="https://picsum.photos/40/40"
                data-ai-hint="profile picture"
              />
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
