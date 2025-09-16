
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
import { Loader2, PlusCircle, Trash2, Edit } from 'lucide-react';
import { Department } from '@/lib/types';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { useAuth } from '@/contexts/auth-context';

export function DepartmentManagementEditor() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [departmentToEdit, setDepartmentToEdit] = useState<Department | null>(null);
  const [editedDepartmentName, setEditedDepartmentName] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchDepartments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/departments');
      if (!response.ok) throw new Error('Failed to fetch departments');
      const data = await response.json();
      setDepartments(data);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load departments.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleAddNewDepartment = async () => {
    if (!newDepartmentName.trim()) {
        toast({ variant: 'destructive', title: 'Error', description: 'Department name cannot be empty.' });
        return;
    }
    if (!user) return;
    
    setIsLoading(true);
    try {
        const response = await fetch('/api/departments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newDepartmentName, userId: user.id }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create department.');
        }
        toast({
            title: 'Department Added',
            description: `The department "${newDepartmentName}" has been successfully added.`,
        });
        setNewDepartmentName('');
        setAddDialogOpen(false);
        fetchDepartments();
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: error instanceof Error ? error.message : 'An unknown error occurred.'});
    } finally {
        setIsLoading(false);
    }
  };

  const handleEditDepartment = async () => {
    if (!departmentToEdit || !editedDepartmentName.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Department name cannot be empty.' });
      return;
    }
    if (!user) return;

    setIsLoading(true);
    try {
        const response = await fetch(`/api/departments`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: departmentToEdit.id, name: editedDepartmentName, userId: user.id }),
        });
        if (!response.ok) {
             const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update department.');
        }
        toast({
            title: 'Department Updated',
            description: `The department has been renamed to "${editedDepartmentName}".`,
        });
        setDepartmentToEdit(null);
        setEditedDepartmentName('');
        setEditDialogOpen(false);
        fetchDepartments();
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: error instanceof Error ? error.message : 'An unknown error occurred.'});
    } finally {
        setIsLoading(false);
    }
  };

  const handleDeleteDepartment = async (departmentId: string) => {
    if (!user) return;
    setIsLoading(true);
    try {
         const response = await fetch(`/api/departments`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: departmentId, userId: user.id }),
        });
         if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete department.');
        }
        toast({
            title: 'Department Deleted',
            description: `The department has been deleted.`,
        });
        fetchDepartments();
    } catch (error) {
         toast({ variant: 'destructive', title: 'Error', description: error instanceof Error ? error.message : 'An unknown error occurred.'});
    } finally {
        setIsLoading(false);
    }
  };

  const openEditDialog = (dept: Department) => {
    setDepartmentToEdit(dept);
    setEditedDepartmentName(dept.name);
    setEditDialogOpen(true);
  }


  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>Department Management</CardTitle>
                <CardDescription>
                Add, edit, and delete departments for user assignment.
                </CardDescription>
            </div>
             <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                    <Button><PlusCircle className="mr-2"/> Add New Department</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Department</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="dept-name">Department Name</Label>
                        <Input id="dept-name" placeholder="e.g., Human Resources" value={newDepartmentName} onChange={(e) => setNewDepartmentName(e.target.value)} />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                        <Button onClick={handleAddNewDepartment} disabled={isLoading}>
                             {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Create Department
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
      </CardHeader>
      <CardContent>
         <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-16">#</TableHead>
                        <TableHead>Department Name</TableHead>
                        <TableHead className="text-right w-40">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading && departments.length === 0 ? (
                         <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
                            </TableCell>
                        </TableRow>
                    ) : departments.length > 0 ? (
                        departments.map((dept, index) => (
                            <TableRow key={dept.id}>
                                <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                <TableCell className="font-semibold">{dept.name}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex gap-2 justify-end">
                                        <Button variant="outline" size="sm" onClick={() => openEditDialog(dept)}>
                                            <Edit className="mr-2 h-4 w-4"/>
                                            Edit
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" size="sm">
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete the <strong>{dept.name}</strong> department.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteDepartment(dept.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                                        Yes, delete department
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
                            <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                No departments found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
      </CardContent>
       <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit Department: {departmentToEdit?.name}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
                <Label htmlFor="edit-dept-name">New Department Name</Label>
                <Input id="edit-dept-name" value={editedDepartmentName} onChange={(e) => setEditedDepartmentName(e.target.value)} />
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                <Button onClick={handleEditDepartment} disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Save Changes
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
