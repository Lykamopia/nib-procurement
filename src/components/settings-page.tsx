
'use client';

import React, { Suspense } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';

// Lazy load the components for each tab
const RolePermissionsEditor = React.lazy(() => import('./role-permissions-editor').then(module => ({ default: module.RolePermissionsEditor })));
const RoleManagementEditor = React.lazy(() => import('./role-management-editor').then(module => ({ default: module.RoleManagementEditor })));
const DepartmentManagementEditor = React.lazy(() => import('./department-management-editor').then(module => ({ default: module.DepartmentManagementEditor })));
const UserManagementEditor = React.lazy(() => import('./user-management-editor').then(module => ({ default: module.UserManagementEditor })));
const NotificationSettingsEditor = React.lazy(() => import('./notification-settings-editor').then(module => ({ default: module.NotificationSettingsEditor })));


const LoadingFallback = () => (
  <div className="flex h-64 items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

export function SettingsPage() {
  return (
    <Tabs defaultValue="permissions" className="space-y-4">
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="permissions">Role Permissions</TabsTrigger>
        <TabsTrigger value="roles">Role Management</TabsTrigger>
        <TabsTrigger value="users">User Management</TabsTrigger>
        <TabsTrigger value="departments">Departments</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
      </TabsList>
      <TabsContent value="general">
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>
              Manage application settings and configurations here. This page is under construction.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Future general settings options will be available here.</p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="permissions">
        <Suspense fallback={<LoadingFallback />}>
          <RolePermissionsEditor />
        </Suspense>
      </TabsContent>
       <TabsContent value="roles">
        <Suspense fallback={<LoadingFallback />}>
          <RoleManagementEditor />
        </Suspense>
      </TabsContent>
       <TabsContent value="users">
        <Suspense fallback={<LoadingFallback />}>
          <UserManagementEditor />
        </Suspense>
      </TabsContent>
       <TabsContent value="departments">
        <Suspense fallback={<LoadingFallback />}>
          <DepartmentManagementEditor />
        </Suspense>
      </TabsContent>
      <TabsContent value="notifications">
        <Suspense fallback={<LoadingFallback />}>
          <NotificationSettingsEditor />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
}
