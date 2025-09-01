
'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
  LayoutDashboard,
  FilePlus,
  Bot,
  MailQuestion,
  History,
  LogOut,
  User as UserIcon,
  FileText,
  GanttChartSquare,
  Building2,
  FileBadge,
  FileSignature
} from 'lucide-react';
import { Icons } from '@/components/icons';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout, loading, role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const pageTitle = useMemo(() => {
    switch (pathname) {
      case '/dashboard':
        return 'Dashboard';
      case '/new-requisition':
        return 'Create Purchase Requisition';
      case '/requisitions':
        return 'View Requisitions';
      case '/approvals':
        return 'Approvals';
      case '/vendors':
        return 'Vendors';
       case '/quotations':
        return 'Quotations';
       case '/contracts':
        return 'Contracts';
      case '/policy-check':
        return 'Automated Policy Check';
      case '/rfq-generator':
        return 'RFQ Generator';
      case '/audit-log':
        return 'Audit Log';
      default:
        return 'ProcurCtrl';
    }
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
            <Icons.logo className="size-7 text-primary" />
            <span className="text-lg font-semibold">ProcurCtrl</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/dashboard">
                <SidebarMenuButton
                  isActive={pathname === '/dashboard'}
                  tooltip="Dashboard"
                >
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/new-requisition">
                <SidebarMenuButton
                  isActive={pathname === '/new-requisition'}
                  tooltip="New Requisition"
                >
                  <FilePlus />
                  <span>New Requisition</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <Link href="/requisitions">
                <SidebarMenuButton
                  isActive={pathname === '/requisitions'}
                  tooltip="View Requisitions"
                >
                  <FileText />
                  <span>Requisitions</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            {role === 'Approver' && (
              <SidebarMenuItem>
                <Link href="/approvals">
                  <SidebarMenuButton
                    isActive={pathname === '/approvals'}
                    tooltip="Approvals"
                  >
                    <GanttChartSquare />
                    <span>Approvals</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            )}
             {role === 'Procurement Officer' && (
              <>
                <SidebarMenuItem>
                  <Link href="/vendors">
                    <SidebarMenuButton
                      isActive={pathname === '/vendors'}
                      tooltip="Vendors"
                    >
                      <Building2 />
                      <span>Vendors</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                  <Link href="/quotations">
                    <SidebarMenuButton
                      isActive={pathname === '/quotations'}
                      tooltip="Quotations"
                    >
                      <FileBadge />
                      <span>Quotations</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                  <Link href="/contracts">
                    <SidebarMenuButton
                      isActive={pathname === '/contracts'}
                      tooltip="Contracts"
                    >
                      <FileSignature />
                      <span>Contracts</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              </>
            )}
          </SidebarMenu>

          <Separator className="my-2" />

          <SidebarMenu>
            <SidebarMenuItem className="px-2 text-xs font-medium text-muted-foreground">
              AI Tools
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/policy-check">
                <SidebarMenuButton
                  isActive={pathname === '/policy-check'}
                  tooltip="Policy Check"
                >
                  <Bot />
                  <span>Policy Check</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/rfq-generator">
                <SidebarMenuButton
                  isActive={pathname === '/rfq-generator'}
                  tooltip="RFQ Generator"
                >
                  <MailQuestion />
                  <span>RFQ Generator</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>

          <Separator className="my-2" />

          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/audit-log">
                <SidebarMenuButton
                  isActive={pathname === '/audit-log'}
                  tooltip="Audit Log"
                >
                  <History />
                  <span>Audit Log</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <div className="flex flex-col p-2 gap-1">
            <span className="text-xs text-muted-foreground ml-1">
              Current Role
            </span>
            <Badge
              variant="outline"
              className="flex items-center gap-2 w-full justify-start py-1.5 px-3"
            >
              <UserIcon className="h-4 w-4" />
              <span>{role}</span>
            </Badge>
          </div>
          <Separator className="my-2" />
          <Button variant="ghost" className="w-full justify-start" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Logout</span>
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center justify-between border-b bg-card px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-xl font-semibold">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-4">
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
