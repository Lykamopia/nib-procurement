
'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from './ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from './ui/checkbox';
import { navItems, rolePermissions as initialRolePermissions } from '@/lib/roles';
import { UserRole } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

type PermissionsState = Record<UserRole, string[]>;

export function RolePermissionsEditor() {
  const [permissions, setPermissions] = useState<PermissionsState>(initialRolePermissions);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Exclude Vendor and Admin roles from being edited
  const editableRoles = Object.keys(permissions).filter(
    role => role !== 'Vendor' && role !== 'Admin'
  ) as UserRole[];

  const handlePermissionChange = (
    role: UserRole,
    path: string,
    checked: boolean
  ) => {
    setPermissions(prev => {
      const currentPermissions = prev[role] || [];
      const newPermissions = checked
        ? [...currentPermissions, path]
        : currentPermissions.filter(p => p !== path);
      return { ...prev, [role]: newPermissions };
    });
  };

  const handleSave = () => {
    setIsSaving(true);
    // In a real app, you would make an API call to save the new permissions.
    console.log('Saving new permissions:', permissions);
    // For this demo, we'll just simulate a save.
    setTimeout(() => {
      toast({
        title: 'Permissions Saved',
        description: 'User role permissions have been updated.',
      });
      setIsSaving(false);
    }, 1000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role Permissions</CardTitle>
        <CardDescription>
          Define which pages each user role can access in the application.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-card z-10">Role</TableHead>
                {navItems.map(item => (
                  <TableHead key={item.path} className="text-center">{item.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {editableRoles.map(role => (
                <TableRow key={role}>
                  <TableCell className="font-semibold sticky left-0 bg-card z-10">{role}</TableCell>
                  {navItems.map(item => (
                    <TableCell key={`${role}-${item.path}`} className="text-center">
                      <Checkbox
                        checked={permissions[role]?.includes(item.path)}
                        onCheckedChange={checked =>
                          handlePermissionChange(role, item.path, !!checked)
                        }
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Changes
        </Button>
      </CardFooter>
    </Card>
  );
}
