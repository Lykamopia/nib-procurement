
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, ShieldOff } from 'lucide-react';
import { Label } from './ui/label';
import { Permission, Role, PermissionAction, PermissionSubject } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

type PermissionsState = Record<string, { [key: string]: { [key: string]: boolean } }>;

export function RolePermissionsEditor() {
  const [permissions, setPermissions] = useState<PermissionsState>({});
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [rolesRes, permsRes] = await Promise.all([
          fetch('/api/roles'),
          fetch('/api/permissions'),
        ]);
        if (!rolesRes.ok || !permsRes.ok) throw new Error('Failed to fetch initial data.');

        const rolesData: Role[] = await rolesRes.json();
        const permsData: Permission[] = await permsRes.json();

        setRoles(rolesData.filter(r => r.name !== 'Admin' && r.name !== 'Vendor'));
        setAllPermissions(permsData);

        const initialState: PermissionsState = {};
        rolesData.forEach(role => {
          initialState[role.id] = {};
          permsData.forEach(perm => {
            if (!initialState[role.id][perm.subject]) {
              initialState[role.id][perm.subject] = {};
            }
            const hasPermission = role.permissions.some(p => p.id === perm.id);
            initialState[role.id][perm.subject][perm.action] = hasPermission;
          });
        });
        setPermissions(initialState);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load permissions data.' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const handlePermissionChange = (
    roleId: string,
    subject: PermissionSubject,
    action: PermissionAction,
    checked: boolean
  ) => {
    setPermissions(prev => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        [subject]: {
          ...prev[roleId]?.[subject],
          [action]: checked,
        },
      },
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
        const response = await fetch('/api/permissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ permissions }),
        });
        if (!response.ok) {
             const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save permissions.');
        }
        toast({ title: 'Permissions Saved', description: 'User role permissions have been successfully updated.' });
    } catch (error) {
         toast({ variant: 'destructive', title: 'Error', description: error instanceof Error ? error.message : 'An unknown error occurred.' });
    } finally {
        setIsLoading(false);
    }
  };
  
  const groupedPermissions = useMemo(() => {
    return allPermissions.reduce((acc, perm) => {
        if (!acc[perm.subject]) {
            acc[perm.subject] = [];
        }
        acc[perm.subject].push(perm);
        return acc;
    }, {} as Record<PermissionSubject, Permission[]>);
  }, [allPermissions]);


  if (isLoading) {
    return (
        <Card>
            <CardHeader><CardTitle>Role Permissions</CardTitle><CardDescription>Define which actions each user role can perform.</CardDescription></CardHeader>
            <CardContent><div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div></CardContent>
        </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role Permissions</CardTitle>
        <CardDescription>
          Define which actions each user role can perform in the application. Admins have all permissions by default.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full space-y-4">
            {roles.map(role => (
                <Card key={role.id}>
                    <AccordionItem value={role.id} className="border-b-0">
                        <AccordionTrigger className="p-6">
                             <h3 className="text-lg font-semibold">{role.name.replace(/_/g, ' ')}</h3>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {Object.entries(groupedPermissions).map(([subject, perms]) => (
                                    <div key={subject} className="space-y-3 rounded-lg border p-4">
                                        <h4 className="font-medium">{subject.replace(/_/g, ' ').charAt(0).toUpperCase() + subject.slice(1).toLowerCase().replace(/_/g, ' ')}</h4>
                                        <div className="space-y-2">
                                        {perms.map(perm => (
                                            <div key={perm.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`${role.id}-${perm.id}`}
                                                    checked={permissions[role.id]?.[perm.subject as PermissionSubject]?.[perm.action as PermissionAction] || false}
                                                    onCheckedChange={(checked) =>
                                                        handlePermissionChange(role.id, perm.subject, perm.action, !!checked)
                                                    }
                                                />
                                                <Label htmlFor={`${role.id}-${perm.id}`} className="text-sm font-normal">
                                                    {perm.action.charAt(0) + perm.action.slice(1).toLowerCase()}
                                                </Label>
                                            </div>
                                        ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Card>
            ))}
        </Accordion>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4"/>}
            Save All Permission Changes
        </Button>
      </CardFooter>
    </Card>
  );
}
