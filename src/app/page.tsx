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
} from 'lucide-react';
import { Icons } from '@/components/icons';
import { Dashboard } from '@/components/dashboard';
import { NeedsRecognitionForm } from '@/components/needs-recognition-form';
import { AutomatedPolicyCheckTool } from '@/components/automated-policy-check-tool';
import { RfqGeneratorTool } from '@/components/rfq-generator-tool';
import { AuditLog } from '@/components/audit-log';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type View =
  | 'dashboard'
  | 'new-requisition'
  | 'policy-check'
  | 'rfq-generator'
  | 'audit-log';

export default function ProcurCtrlPage() {
  const [view, setView] = useState<View>('dashboard');
  const { user, logout, loading, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);


  const handleMenuClick = (selectedView: View) => {
    setView(selectedView);
  };

  const pageTitle = useMemo(() => {
    switch (view) {
      case 'dashboard':
        return 'Dashboard';
      case 'new-requisition':
        return 'Create Purchase Requisition';
      case 'policy-check':
        return 'Automated Policy Check';
      case 'rfq-generator':
        return 'RFQ Generator';
      case 'audit-log':
        return 'Audit Log';
      default:
        return 'ProcurCtrl';
    }
  }, [view]);

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <Dashboard setActiveView={setView} />;
      case 'new-requisition':
        return <NeedsRecognitionForm />;
      case 'policy-check':
        return <AutomatedPolicyCheckTool />;
      case 'rfq-generator':
        return <RfqGeneratorTool />;
      case 'audit-log':
        return <AuditLog />;
      default:
        return <Dashboard setActiveView={setView} />;
    }
  };
  
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
              <SidebarMenuButton
                onClick={() => handleMenuClick('dashboard')}
                isActive={view === 'dashboard'}
                tooltip="Dashboard"
              >
                <LayoutDashboard />
                <span>Dashboard</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => handleMenuClick('new-requisition')}
                isActive={view === 'new-requisition'}
                tooltip="New Requisition"
              >
                <FilePlus />
                <span>New Requisition</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          <Separator className="my-2" />

          <SidebarMenu>
            <SidebarMenuItem className="px-2 text-xs font-medium text-muted-foreground">
              AI Tools
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => handleMenuClick('policy-check')}
                isActive={view === 'policy-check'}
                tooltip="Policy Check"
              >
                <Bot />
                <span>Policy Check</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => handleMenuClick('rfq-generator')}
                isActive={view === 'rfq-generator'}
                tooltip="RFQ Generator"
              >
                <MailQuestion />
                <span>RFQ Generator</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          <Separator className="my-2" />

          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => handleMenuClick('audit-log')}
                isActive={view === 'audit-log'}
                tooltip="Audit Log"
              >
                <History />
                <span>Audit Log</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <div className="flex flex-col p-2 gap-1">
             <span className="text-xs text-muted-foreground ml-1">Current Role</span>
             <Badge variant="outline" className="flex items-center gap-2 w-full justify-start py-1.5 px-3">
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
              <AvatarImage src="https://picsum.photos/40/40" data-ai-hint="profile picture" />
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {renderView()}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
