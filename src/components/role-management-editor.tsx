
'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, Edit } from 'lucide-react';
import { rolePermissions } from '@/lib/roles';
import { UserRole } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';

export function RoleManagementEditor() {
  const [roles, setRoles] = useState<UserRole[]>(Object.keys(rolePermissions) as UserRole[]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAddNewRole = () => {
    // In a real app, this would open a dialog to define the new role
    toast({
      title: 'Feature Coming Soon',
      description: 'The ability to add new roles is under development.',
    });
  };

  const handleEditRole = (role: UserRole) => {
    toast({
      title: 'Feature Coming Soon',
      description: `Editing the "${role}" role is under development.`,
    });
  }

  const handleDeleteRole = (roleToDelete: UserRole) => {
    setIsLoading(true);
    // This is a simulation. In a real app, you'd make an API call.
    setTimeout(() => {
        setRoles(roles.filter(role => role !== roleToDelete));
        toast({
            title: 'Role Deleted',
            description: `The role "${roleToDelete}" has been deleted.`,
        });
        setIsLoading(false);
    }, 1000);
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>Role Management</CardTitle>
                <CardDescription>
                Define, edit, and delete user roles in the application.
                </CardDescription>
            </div>
             <Dialog>
                <DialogTrigger asChild>
                    <Button><PlusCircle className="mr-2"/> Add New Role</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Role</DialogTitle>
                        <DialogDescription>
                            Define a name for the new role. You can set its permissions in the "Role Permissions" tab.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="role-name">Role Name</Label>
                        <Input id="role-name" placeholder="e.g., Quality Assurance" />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                        <Button onClick={handleAddNewRole}>Create Role</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {roles.map(role => (
            <Card key={role} className="flex justify-between items-center p-4">
                <p className="font-semibold">{role}</p>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditRole(role)}>
                        <Edit className="mr-2 h-4 w-4"/>
                        Edit
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={role === 'Admin' || role === 'Procurement Officer'}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the <strong>{role}</strong> role.
                                    Any users with this role will lose their assigned permissions.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteRole(role)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    Yes, delete role
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </Card>
        ))}
      </CardContent>
    </Card>
  );
}
