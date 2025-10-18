
'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, Edit, Users } from 'lucide-react';
import { Department, User, UserRole } from '@/lib/types';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { rolePermissions } from '@/lib/roles';
import { useAuth } from '@/contexts/auth-context';

const userFormSchema = z.object({
  name: z.string().min(2, "Name is required."),
  email: z.string().email("Invalid email address."),
  role: z.string().min(1, "Role is required."),
  departmentId: z.string().min(1, "Department is required."),
  password: z.string().optional(),
  approvalLimit: z.coerce.number().min(0, "Approval limit must be a positive number.").optional(),
  managerId: z.string().optional(),
});

const userEditFormSchema = userFormSchema.extend({
    password: z.string().optional(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

export function UserManagementEditor() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const { toast } = useToast();
  const { user: actor } = useAuth();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userToEdit ? userEditFormSchema : userFormSchema),
    defaultValues: {
      name: '',
      email: '',
      role: '',
      departmentId: '',
      password: '',
      approvalLimit: 0,
      managerId: '',
    },
  });
  
  const availableRoles = Object.keys(rolePermissions).filter(role => role !== 'Vendor') as UserRole[];
  
  const selectedRole = form.watch('role');
  const currentApprovalLimit = form.watch('approvalLimit');
  
  const managerRoles: UserRole[] = ['Approver', 'Procurement_Officer', 'Admin', 'Finance'];
  const approvalRoles: UserRole[] = ['Approver', 'Procurement_Officer', 'Admin', 'Finance', 'Committee_Member'];
  const showApprovalFields = approvalRoles.includes(selectedRole as UserRole);

  const potentialManagers = users.filter(
    (u) => 
      u.id !== userToEdit?.id && 
      managerRoles.includes(u.role) &&
      (u.approvalLimit || 0) > (currentApprovalLimit || 0)
  );


  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usersResponse, deptsResponse] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/departments'),
      ]);
      if (!usersResponse.ok || !deptsResponse.ok) throw new Error('Failed to fetch data');
      const usersData = await usersResponse.json();
      const deptsData = await deptsResponse.json();
      setUsers(usersData);
      setDepartments(deptsData);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load user data.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFormSubmit = async (values: UserFormValues) => {
    if (!actor) return;
    setIsLoading(true);
    try {
      const isEditing = !!userToEdit;
      
       const apiValues = {
        ...values,
        managerId: values.managerId === 'null' ? null : values.managerId,
        approvalLimit: showApprovalFields ? values.approvalLimit || 0 : 0
      };

      if (isEditing && !values.password) {
        delete (apiValues as any).password;
      }

      const body = isEditing 
        ? { ...apiValues, id: userToEdit.id, actorUserId: actor.id }
        : { ...apiValues, actorUserId: actor.id };
        
      const response = await fetch('/api/users', {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${isEditing ? 'update' : 'create'} user.`);
      }

      toast({
        title: `User ${isEditing ? 'Updated' : 'Created'}`,
        description: `The user has been successfully ${isEditing ? 'updated' : 'created'}.`,
      });
      setDialogOpen(false);
      setUserToEdit(null);
      form.reset({ name: '', email: '', role: '', departmentId: '', password: '', approvalLimit: 0, managerId: '' });
      fetchData();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: error instanceof Error ? error.message : 'An unknown error occurred.' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteUser = async (userId: string) => {
    if (!actor) return;
    setIsLoading(true);
    try {
        const response = await fetch(`/api/users`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: userId, actorUserId: actor.id }),
        });
         if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete user.');
        }
        toast({
            title: 'User Deleted',
            description: `The user has been deleted.`,
        });
        fetchData();
    } catch (error) {
         toast({ variant: 'destructive', title: 'Error', description: error instanceof Error ? error.message : 'An unknown error occurred.'});
    } finally {
        setIsLoading(false);
    }
  };

  const openDialog = (user?: User) => {
    if (user) {
      setUserToEdit(user);
      form.reset({
        name: user.name,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId || '',
        password: '',
        approvalLimit: user.approvalLimit || 0,
        managerId: user.managerId || 'null',
      });
    } else {
      setUserToEdit(null);
      form.reset({ name: '', email: '', role: '', departmentId: '', password: '', approvalLimit: 0, managerId: 'null' });
    }
    setDialogOpen(true);
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                Add, edit, and manage application users and their roles.
                </CardDescription>
            </div>
            <Button onClick={() => openDialog()}><PlusCircle className="mr-2"/> Add New User</Button>
        </div>
      </CardHeader>
      <CardContent>
         <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-16">#</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead className="text-right w-40">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading && users.length === 0 ? (
                         <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
                            </TableCell>
                        </TableRow>
                    ) : users.length > 0 ? (
                        users.map((user, index) => (
                            <TableRow key={user.id}>
                                <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                <TableCell className="font-semibold">{user.name}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>{user.role.replace(/_/g, ' ')}</TableCell>
                                <TableCell>{user.department}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex gap-2 justify-end">
                                        <Button variant="outline" size="sm" onClick={() => openDialog(user)}>
                                            <Edit className="mr-2 h-4 w-4"/>
                                            Edit
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" size="sm" disabled={user.role === 'Admin'}>
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will permanently delete the user <strong>{user.name}</strong>. This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteUser(user.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                                        Yes, delete user
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                         <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                <div className="flex flex-col items-center gap-4">
                                    <Users className="h-16 w-16 text-muted-foreground/50" />
                                    <p className="font-semibold">No users found.</p>
                                    <p>Click "Add New User" to get started.</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
      </CardContent>
       <Dialog open={isDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) { setUserToEdit(null); form.reset(); } setDialogOpen(isOpen); }}>
        <DialogContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <DialogHeader>
                  <DialogTitle>{userToEdit ? 'Edit User' : 'Add New User'}</DialogTitle>
              </DialogHeader>
              <div className="py-4 grid grid-cols-2 gap-x-4 gap-y-6">
                <FormField control={form.control} name="name" render={({ field }) => ( <FormItem className="col-span-2"><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="e.g. John Doe" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="email" render={({ field }) => ( <FormItem className="col-span-2"><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="e.g. john.doe@example.com" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="password" render={({ field }) => ( <FormItem className="col-span-2"><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder={userToEdit ? "Leave blank to keep current password" : ""} {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="role" render={({ field }) => ( <FormItem><FormLabel>Role</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl><SelectContent>{availableRoles.map(role => <SelectItem key={role} value={role}>{role.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="departmentId" render={({ field }) => ( <FormItem><FormLabel>Department</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a department" /></SelectTrigger></FormControl><SelectContent>{departments.map(dept => <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                
                {showApprovalFields && (
                    <>
                        <FormField control={form.control} name="approvalLimit" render={({ field }) => ( <FormItem><FormLabel>Approval Limit (ETB)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField
                        control={form.control}
                        name="managerId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Reports To / Manager</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || 'null'}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a manager" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="null">None</SelectItem>
                                    {potentialManagers.map((u) => (
                                    <SelectItem key={u.id} value={u.id}>
                                        {u.name} ({u.approvalLimit?.toLocaleString()} ETB)
                                    </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </>
                )}
              </div>
              <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                  <Button type="submit" disabled={isLoading}>
                       {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                      {userToEdit ? 'Save Changes' : 'Create User'}
                  </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
