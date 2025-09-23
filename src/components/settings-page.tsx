
'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RolePermissionsEditor } from './role-permissions-editor';
import { RoleManagementEditor } from './role-management-editor';
import { DepartmentManagementEditor } from './department-management-editor';
import { UserManagementEditor } from './user-management-editor';
import { NotificationSettingsEditor } from './notification-settings-editor';


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
        <RolePermissionsEditor />
      </TabsContent>
       <TabsContent value="roles">
        <RoleManagementEditor />
      </TabsContent>
       <TabsContent value="users">
        <UserManagementEditor />
      </TabsContent>
       <TabsContent value="departments">
        <DepartmentManagementEditor />
      </TabsContent>
      <TabsContent value="notifications">
         <NotificationSettingsEditor />
      </TabsContent>
    </Tabs>
  );
}
