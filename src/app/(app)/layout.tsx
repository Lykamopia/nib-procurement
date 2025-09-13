

'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { RoleSwitcher } from '@/components/role-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { navItems, rolePermissions } from '@/lib/roles';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout, loading, role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const accessibleNavItems = useMemo(() => {
    if (!role) return [];
    const allowedPaths = rolePermissions[role] || [];
    return navItems.filter(item => allowedPaths.includes(item.path));
  }, [role]);

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
      // Allow access to sub-pages like /purchase-orders/[id]
      const isAllowed = allowedPaths.some(path => currentPath.startsWith(path));

      if (!isAllowed) {
        // Redirect to the first accessible page or dashboard if available
        const defaultPath = allowedPaths.includes('/dashboard') ? '/dashboard' : allowedPaths[0];
        if(defaultPath) {
          router.push(defaultPath);
        } else if (role !== 'Vendor') {
          // If no default path and not a vendor, maybe they have no permissions
           router.push('/login');
        }
      }
    }
  }, [pathname, loading, role, router]);

  const pageTitle = useMemo(() => {
     const currentNavItem = navItems.find(item => {
      // Handle dynamic routes like /purchase-orders/[id]
      if (item.path.includes('[')) {
        const basePath = item.path.split('/[')[0];
        return pathname.startsWith(basePath);
      }
      return pathname === item.path;
    });
    return currentNavItem?.label || 'Nib Procurement';
  }, [pathname]);

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Nib Procurement Logo" width={28} height={28} className="size-7" />
            <span className="text-lg font-semibold">Nib Procurement</span>
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
             {role === 'Procurement Officer' && (
              <>
                <SidebarMenuItem>
                  <Link href="/records">
                    <SidebarMenuButton
                      isActive={pathname === '/records'}
                      tooltip="Records"
                    >
                      <navItems.find(i => i.path === '/records')?.icon />
                      <span>Records</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <Link href="/audit-log">
                    <SidebarMenuButton
                      isActive={pathname === '/audit-log'}
                      tooltip="Audit Log"
                    >
                      <navItems.find(i => i.path === '/audit-log')?.icon />
                      <span>Audit Log</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              </>
            )}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
         <RoleSwitcher />
          <Separator className="my-2" />
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
            <h1 className="text-xl font-semibold">{pageTitle}</h1>
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
