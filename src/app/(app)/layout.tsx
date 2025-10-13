
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
import { navItems } from '@/lib/roles';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { useToast } from '@/hooks/use-toast';
import { RoleSwitcher } from '@/components/role-switcher';

const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout, loading, role, rolePermissions } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const accessibleNavItems = useMemo(() => {
    if (!role) return [];
    const allowedPaths = rolePermissions[role] || [];
    return navItems.filter(item => allowedPaths.includes(item.path));
  }, [role, rolePermissions]);

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

  // Page-level access check - This logic is correct and should remain.
  // It ensures that once a user is authenticated, they cannot access pages outside their role's permissions.
  useEffect(() => {
    if (loading || !role) return;
    
    // If there is no user, logout will handle the redirect.
    if (!user) {
        logout();
        return;
    }

    const allowedPaths = rolePermissions[role] || [];
    if (allowedPaths.length === 0) {
        logout();
        return;
    }

    const currentPath = pathname.split('?')[0];

    // Check if current path is allowed. This handles dynamic routes by checking the base path.
    const isAllowed = allowedPaths.some(p => {
        if (p.includes('[')) { // It's a dynamic route
            const basePath = p.split('/[')[0];
            return currentPath.startsWith(basePath);
        }
        return currentPath === p;
    });

    if (!isAllowed) {
        // If not allowed, redirect to the first allowed path, which is considered the default.
        const defaultPath = allowedPaths[0];
        if (defaultPath) {
            router.push(defaultPath);
        } else {
            // If for some reason there's no default path, logout.
            logout();
        }
    }
  }, [pathname, loading, role, user, router, rolePermissions, logout]);


  if (loading || !user) {
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
