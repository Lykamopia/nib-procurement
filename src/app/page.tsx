'use client';

import React, { useState, useMemo } from 'react';
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
  FileText,
  FilePlus,
  Bot,
  MailQuestion,
  History,
  User,
} from 'lucide-react';
import { Icons } from '@/components/icons';
import { Dashboard } from '@/components/dashboard';
import { NeedsRecognitionForm } from '@/components/needs-recognition-form';
import { AutomatedPolicyCheckTool } from '@/components/automated-policy-check-tool';
import { RfqGeneratorTool } from '@/components/rfq-generator-tool';
import { AuditLog } from '@/components/audit-log';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRole } from '@/contexts/role-context';
import { RoleSwitcher } from '@/components/role-switcher';

type View =
  | 'dashboard'
  | 'new-requisition'
  | 'policy-check'
  | 'rfq-generator'
  | 'audit-log';

export default function ProcurCtrlPage() {
  const [view, setView] = useState<View>('dashboard');
  const { role } = useRole();

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
          <RoleSwitcher />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center justify-between border-b bg-card px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-xl font-semibold">{pageTitle}</h1>
          </div>
          <Avatar>
            <AvatarImage src="https://picsum.photos/40/40" data-ai-hint="profile picture" />
            <AvatarFallback>{role.charAt(0)}</AvatarFallback>
          </Avatar>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {renderView()}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
