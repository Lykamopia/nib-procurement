
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
import { RfqSettings } from './settings/rfq-settings';


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
        <RfqSettings />
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
         <Card>
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
            <CardDescription>
              Manage how and when you receive notifications. This page is under construction.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Future notification settings will be available here.</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
