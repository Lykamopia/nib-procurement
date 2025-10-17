
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
import { CommitteeSettings } from './settings/committee-settings';
import { ApprovalMatrixEditor } from './settings/approval-matrix-editor';


export function SettingsPage() {
  return (
    <Tabs defaultValue="users" className="space-y-4">
      <TabsList>
        <TabsTrigger value="users">User Management</TabsTrigger>
        <TabsTrigger value="departments">Departments</TabsTrigger>
        <TabsTrigger value="roles">Role Management</TabsTrigger>
        <TabsTrigger value="permissions">Role Permissions</TabsTrigger>
        <TabsTrigger value="approval-flow">Approval Flow</TabsTrigger>
        <TabsTrigger value="committees">Committees</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
      </TabsList>
       <TabsContent value="users">
        <UserManagementEditor />
      </TabsContent>
       <TabsContent value="departments">
        <DepartmentManagementEditor />
      </TabsContent>
       <TabsContent value="roles">
        <RoleManagementEditor />
      </TabsContent>
      <TabsContent value="permissions">
        <div className="space-y-6">
          <RfqSettings />
          <RolePermissionsEditor />
        </div>
      </TabsContent>
       <TabsContent value="approval-flow">
        <ApprovalMatrixEditor />
      </TabsContent>
      <TabsContent value="committees">
        <CommitteeSettings />
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
