
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


export function SettingsPage() {
  return (
    <Tabs defaultValue="permissions" className="space-y-4">
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="permissions">Role Permissions</TabsTrigger>
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
