
'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [roleToEdit, setRoleToEdit] = useState<UserRole | null>(null);
  const [editedRoleName, setEditedRoleName] = useState('');
  const { toast } = useToast();

  const handleAddNewRole = () => {
    if (!newRoleName.trim()) {
        toast({ variant: 'destructive', title: 'Error', description: 'Role name cannot be empty.' });
        return;
    }
    if (roles.includes(newRoleName as UserRole)) {
         toast({ variant: 'destructive', title: 'Error', description: 'This role already exists.' });
        return;
    }
    
    // This is a simulation. In a real app, this would make an API call.
    setIsLoading(true);
    setTimeout(() => {
        setRoles([...roles, newRoleName as UserRole]);
        toast({
            title: 'Role Added',
            description: `The role "${newRoleName}" has been successfully added.`,
        });
        setNewRoleName('');
        setAddDialogOpen(false);
        setIsLoading(false);
    }, 500);
  };

  const handleEditRole = () => {
    if (!roleToEdit || !editedRoleName.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Role name cannot be empty.' });
      return;
    }
     if (roles.includes(editedRoleName as UserRole) && editedRoleName !== roleToEdit) {
         toast({ variant: 'destructive', title: 'Error', description: 'This role name already exists.' });
        return;
    }

    setIsLoading(true);
    setTimeout(() => {
        setRoles(roles.map(role => role === roleToEdit ? editedRoleName as UserRole : role));
        toast({
            title: 'Role Updated',
            description: `The role "${roleToEdit}" has been renamed to "${editedRoleName}".`,
        });
        setRoleToEdit(null);
        setEditedRoleName('');
        setEditDialogOpen(false);
        setIsLoading(false);
    }, 500);
  };

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
    }, 500);
  };

  const openEditDialog = (role: UserRole) => {
    setRoleToEdit(role);
    setEditedRoleName(role);
    setEditDialogOpen(true);
  }


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
             <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
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
                        <Input id="role-name" placeholder="e.g., Quality Assurance" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                        <Button onClick={handleAddNewRole} disabled={isLoading}>
                             {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Create Role
                        </Button>
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
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(role)}>
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
       <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit Role: {roleToEdit}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
                <Label htmlFor="edit-role-name">New Role Name</Label>
                <Input id="edit-role-name" value={editedRoleName} onChange={(e) => setEditedRoleName(e.target.value)} />
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                <Button onClick={handleEditRole} disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Save Changes
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
