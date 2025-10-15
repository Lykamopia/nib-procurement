
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Users, Search, UserX, UserCheck } from 'lucide-react';
import { User, UserRole, Department } from '@/lib/types';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface CommitteeConfig {
    min: number;
    max: number;
}

export function CommitteeSettings() {
    const { allUsers, updateUserRole, committeeConfig, updateCommitteeConfig } = useAuth();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [searchTerms, setSearchTerms] = useState({ a: '', b: '' });
    const [departmentFilters, setDepartmentFilters] = useState({ a: 'all', b: 'all' });
    const [localConfig, setLocalConfig] = useState(committeeConfig);

    useEffect(() => {
        setLocalConfig(committeeConfig);
    }, [committeeConfig]);

    useEffect(() => {
        const fetchDepts = async () => {
            try {
                const res = await fetch('/api/departments');
                const data = await res.json();
                setDepartments(data);
            } catch (e) {
                console.error("Failed to fetch departments", e);
            }
        };
        fetchDepts();
    }, []);

    const handleSave = () => {
        setIsSaving(true);
        updateCommitteeConfig(localConfig);
        setTimeout(() => {
            toast({
                title: 'Settings Saved',
                description: 'Committee configurations have been updated.',
            });
            setIsSaving(false);
        }, 500);
    };

    const handleRoleChange = (user: User, newRole: UserRole) => {
        updateUserRole(user.id, newRole);
        toast({
            title: `User Role Updated`,
            description: `${user.name} is now a ${newRole.replace(/([A-Z])/g, ' $1').trim()}.`,
        });
    }

    const renderCommitteeSection = (committee: 'A' | 'B') => {
        const role: UserRole = committee === 'A' ? 'CommitteeAMember' : 'CommitteeBMember';
        const members = allUsers.filter(u => u.role === role);
        const nonMembers = allUsers.filter(u => u.role !== role && u.role !== 'Admin' && u.role !== 'Vendor')
            .filter(u => departmentFilters[committee.toLowerCase() as 'a'|'b'] === 'all' || u.departmentId === departmentFilters[committee.toLowerCase() as 'a'|'b'])
            .filter(u => u.name.toLowerCase().includes(searchTerms[committee.toLowerCase() as 'a'|'b'].toLowerCase()));

        return (
            <Card>
                <CardHeader>
                    <CardTitle>Procurement Committee {committee}</CardTitle>
                    <CardDescription>
                        {committee === 'A' ? 'Reviews and recommends on bids over the defined threshold.' : 'Reviews and recommends on bids within the defined range.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                             <Label>Min Amount (ETB)</Label>
                             <Input type="number" value={localConfig[committee]?.min || ''} onChange={(e) => setLocalConfig(prev => ({...prev, [committee]: {...prev[committee], min: Number(e.target.value)}}))} />
                        </div>
                         <div>
                             <Label>Max Amount (ETB)</Label>
                             <Input type="number" value={localConfig[committee]?.max || ''} onChange={(e) => setLocalConfig(prev => ({...prev, [committee]: {...prev[committee], max: Number(e.target.value)}}))} />
                        </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6 pt-4">
                        <div className="space-y-2">
                             <h4 className="font-semibold flex items-center gap-2"><Users /> Current Members</h4>
                             <ScrollArea className="h-60 border rounded-md p-2">
                                {members.length > 0 ? members.map(user => (
                                    <div key={user.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                                         <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8"><AvatarImage src={`https://picsum.photos/seed/${user.id}/32/32`} /><AvatarFallback>{user.name.charAt(0)}</AvatarFallback></Avatar>
                                            <div>
                                                <p className="text-sm font-medium">{user.name}</p>
                                                <p className="text-xs text-muted-foreground">{user.department}</p>
                                            </div>
                                        </div>
                                        <Button size="sm" variant="ghost" onClick={() => handleRoleChange(user, 'CommitteeMember')}><UserX className="h-4 w-4" /></Button>
                                    </div>
                                )) : <p className="text-sm text-muted-foreground text-center py-4">No members assigned.</p>}
                             </ScrollArea>
                        </div>
                        <div className="space-y-2">
                             <h4 className="font-semibold">Add Members</h4>
                             <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="Search users..." className="pl-8" value={searchTerms[committee.toLowerCase() as 'a'|'b']} onChange={(e) => setSearchTerms(prev => ({...prev, [committee.toLowerCase()]: e.target.value}))}/>
                                </div>
                                <Select value={departmentFilters[committee.toLowerCase() as 'a'|'b']} onValueChange={(val) => setDepartmentFilters(prev => ({...prev, [committee.toLowerCase()]: val}))}>
                                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Departments</SelectItem>
                                        {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                             </div>
                             <ScrollArea className="h-60 border rounded-md p-2">
                                 {nonMembers.map(user => (
                                    <div key={user.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8"><AvatarImage src={`https://picsum.photos/seed/${user.id}/32/32`} /><AvatarFallback>{user.name.charAt(0)}</AvatarFallback></Avatar>
                                            <div>
                                                <p className="text-sm font-medium">{user.name}</p>
                                                <p className="text-xs text-muted-foreground">{user.department}</p>
                                            </div>
                                        </div>
                                        <Button size="sm" variant="outline" onClick={() => handleRoleChange(user, role)}><UserCheck className="h-4 w-4 mr-2" /> Add</Button>
                                    </div>
                                ))}
                             </ScrollArea>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {renderCommitteeSection('A')}
            {renderCommitteeSection('B')}
            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save All Changes
                </Button>
            </div>
        </div>
    );
}
