
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Loader2, ShieldCheck, User } from 'lucide-react';
import { Label } from './ui/label';
import { Permission, Role, PermissionAction, PermissionSubject } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { useAuth } from '@/contexts/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

type PermissionsState = Record<string, { [key: string]: { [key: string]: boolean } }>;

export function RolePermissionsEditor() {
  const [permissions, setPermissions] = useState<PermissionsState>({});
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { token } = useAuth();

  const fetchData = useCallback(async () => {
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
        initialState[role.name] = {};
        permsData.forEach(perm => {
          if (!initialState[role.name][perm.subject]) {
            initialState[role.name][perm.subject] = {};
          }
          const hasPermission = role.permissions.some(p => p.id === perm.id);
          initialState[role.name][perm.subject][perm.action] = hasPermission;
        });
      });
      setPermissions(initialState);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load permissions data.' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePermissionChange = (
    roleName: string,
    subject: PermissionSubject,
    action: PermissionAction,
    checked: boolean
  ) => {
    setPermissions(prev => ({
      ...prev,
      [roleName]: {
        ...prev[roleName],
        [subject]: {
          ...prev[roleName]?.[subject],
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
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
    const pageSubjects: PermissionSubject[] = ['DASHBOARD', 'REQUISITIONS', 'APPROVALS', 'VENDORS', 'QUOTATIONS', 'CONTRACTS', 'PURCHASE_ORDERS', 'INVOICES', 'GOODS_RECEIPT', 'RECORDS', 'AUDIT_LOG', 'SETTINGS'];
    const pageLevel = allPermissions.filter(p => pageSubjects.includes(p.subject));
    const actionLevel = allPermissions.filter(p => !pageSubjects.includes(p.subject));

    const group = (perms: Permission[]) => perms.reduce((acc, perm) => {
        if (!acc[perm.subject]) {
            acc[perm.subject] = [];
        }
        acc[perm.subject].push(perm);
        return acc;
    }, {} as Record<PermissionSubject, Permission[]>);

    return {
        page: group(pageLevel),
        action: group(actionLevel),
    }

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
                <AccordionItem value={role.id} key={role.id} className="border rounded-md">
                    <AccordionTrigger className="p-6 hover:no-underline">
                         <div className='flex flex-col text-left'>
                            <h3 className="text-lg font-semibold">{role.name.replace(/_/g, ' ')}</h3>
                            <div className="flex items-center text-sm text-muted-foreground mt-1">
                                <User className="mr-2 h-4 w-4"/>
                                <span>{role.users.length} User(s)</span>
                            </div>
                         </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6 space-y-6">
                        <div>
                            <h4 className="font-semibold text-base mb-3">Users in this Role</h4>
                            {role.users && role.users.length > 0 ? (
                                <div className="flex flex-wrap gap-4">
                                    {role.users.map(user => (
                                        <div key={user.id} className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                                             <Avatar className="h-6 w-6">
                                                <AvatarImage src={`https://picsum.photos/seed/${user.id}/24/24`} data-ai-hint="profile picture" />
                                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-medium">{user.name}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">No users are currently assigned to this role.</p>
                            )}
                        </div>
                        <div>
                            <h4 className="font-semibold text-base mb-3">Page Access Permissions</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {Object.entries(groupedPermissions.page).map(([subject, perms]) => (
                                    <div key={subject} className="space-y-3 rounded-lg border p-4">
                                        <h5 className="font-medium">{subject.charAt(0) + subject.slice(1).toLowerCase()}</h5>
                                        <div className="space-y-2">
                                        {perms.map(perm => (
                                            <div key={perm.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`${role.id}-${perm.id}`}
                                                    checked={permissions[role.name]?.[perm.subject as PermissionSubject]?.[perm.action as PermissionAction] || false}
                                                    onCheckedChange={(checked) =>
                                                        handlePermissionChange(role.name, perm.subject, perm.action, !!checked)
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
                        </div>
                         <div>
                            <h4 className="font-semibold text-base mb-3">Action-Level Permissions</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {Object.entries(groupedPermissions.action).map(([subject, perms]) => (
                                    <div key={subject} className="space-y-3 rounded-lg border p-4">
                                        <h5 className="font-medium">{subject.replace(/_/g, ' ').charAt(0).toUpperCase() + subject.slice(1).toLowerCase().replace(/_/g, ' ')}</h5>
                                        <div className="space-y-2">
                                        {perms.map(perm => (
                                            <div key={perm.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`${role.id}-${perm.id}`}
                                                    checked={permissions[role.name]?.[perm.subject as PermissionSubject]?.[perm.action as PermissionAction] || false}
                                                    onCheckedChange={(checked) =>
                                                        handlePermissionChange(role.name, perm.subject, perm.action, !!checked)
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
                        </div>
                    </AccordionContent>
                </AccordionItem>
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
