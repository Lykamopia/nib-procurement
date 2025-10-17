
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, PlusCircle, Trash2, ArrowDown, ArrowUp, GripVertical } from 'lucide-react';
import { ApprovalStep, ApprovalThreshold, UserRole } from '@/lib/types';
import { rolePermissions } from '@/lib/roles';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Reorder } from 'framer-motion';

export function ApprovalMatrixEditor() {
    const { approvalThresholds, updateApprovalThresholds } = useAuth();
    const [localThresholds, setLocalThresholds] = useState<ApprovalThreshold[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        setLocalThresholds(JSON.parse(JSON.stringify(approvalThresholds)));
    }, [approvalThresholds]);

    const handleSave = () => {
        setIsSaving(true);
        // Basic validation
        for (const threshold of localThresholds) {
            if (threshold.min > (threshold.max || Infinity)) {
                toast({ variant: 'destructive', title: 'Invalid Range', description: `In "${threshold.name}", the minimum value cannot be greater than the maximum.`});
                setIsSaving(false);
                return;
            }
        }
        updateApprovalThresholds(localThresholds);
        setTimeout(() => {
            toast({
                title: 'Settings Saved',
                description: 'Approval matrix has been updated.',
            });
            setIsSaving(false);
        }, 500);
    };

    const handleThresholdChange = (id: string, field: 'min' | 'max' | 'name', value: string | number | null) => {
        setLocalThresholds(prev => prev.map(t => t.id === id ? {...t, [field]: value} : t));
    };

    const addThreshold = () => {
        const newId = `tier-${Date.now()}`;
        setLocalThresholds(prev => [...prev, { id: newId, name: 'New Tier', min: 0, max: null, steps: [] }]);
    };

    const removeThreshold = (id: string) => {
        setLocalThresholds(prev => prev.filter(t => t.id !== id));
    };

    const handleStepChange = (thresholdId: string, stepIndex: number, newRole: UserRole) => {
        setLocalThresholds(prev => prev.map(t => {
            if (t.id === thresholdId) {
                const newSteps = [...t.steps];
                newSteps[stepIndex] = { ...newSteps[stepIndex], role: newRole };
                return { ...t, steps: newSteps };
            }
            return t;
        }));
    };

    const addStep = (thresholdId: string) => {
        setLocalThresholds(prev => prev.map(t => {
            if (t.id === thresholdId) {
                return { ...t, steps: [...t.steps, { role: 'Approver' }] };
            }
            return t;
        }));
    };

    const removeStep = (thresholdId: string, stepIndex: number) => {
        setLocalThresholds(prev => prev.map(t => {
            if (t.id === thresholdId) {
                const newSteps = t.steps.filter((_, i) => i !== stepIndex);
                return { ...t, steps: newSteps };
            }
            return t;
        }));
    };
    
    const reorderSteps = (thresholdId: string, newOrder: ApprovalStep[]) => {
        setLocalThresholds(prev => prev.map(t => {
            if (t.id === thresholdId) {
                return { ...t, steps: newOrder };
            }
            return t;
        }));
    };

    const availableRoles = Object.keys(rolePermissions).filter(r => r !== 'Vendor' && r !== 'Requester');

    return (
        <Card>
            <CardHeader>
                <CardTitle>Approval Matrix</CardTitle>
                <CardDescription>
                    Define the approval chains for different procurement value thresholds.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {localThresholds.sort((a,b) => a.min - b.min).map(threshold => (
                    <Card key={threshold.id} className="p-4">
                        <div className="flex justify-between items-start">
                             <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <Label>Tier Name</Label>
                                    <Input value={threshold.name} onChange={(e) => handleThresholdChange(threshold.id, 'name', e.target.value)} />
                                </div>
                                 <div>
                                    <Label>Min Amount (ETB)</Label>
                                    <Input type="number" value={threshold.min} onChange={(e) => handleThresholdChange(threshold.id, 'min', Number(e.target.value))} />
                                </div>
                                 <div>
                                    <Label>Max Amount (ETB)</Label>
                                    <Input type="number" placeholder="No limit" value={threshold.max ?? ''} onChange={(e) => handleThresholdChange(threshold.id, 'max', e.target.value === '' ? null : Number(e.target.value))} />
                                </div>
                             </div>
                            <Button variant="ghost" size="icon" onClick={() => removeThreshold(threshold.id)} className="ml-4"><Trash2 className="h-4 w-4"/></Button>
                        </div>
                        <div className="mt-4 pl-4 border-l-2">
                             <h4 className="mb-2 font-medium text-sm">Approval Steps</h4>
                             <Reorder.Group axis="y" values={threshold.steps} onReorder={(newOrder) => reorderSteps(threshold.id, newOrder)} className="space-y-2">
                                {threshold.steps.map((step, index) => (
                                    <Reorder.Item key={`${threshold.id}-${index}`} value={step} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                                        <GripVertical className="cursor-grab text-muted-foreground" />
                                        <span className="font-mono text-xs">{index + 1}.</span>
                                        <Select value={step.role} onValueChange={(role: UserRole) => handleStepChange(threshold.id, index, role)}>
                                            <SelectTrigger><SelectValue/></SelectTrigger>
                                            <SelectContent>
                                                {availableRoles.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <Button variant="ghost" size="icon" onClick={() => removeStep(threshold.id, index)}><Trash2 className="h-4 w-4"/></Button>
                                    </Reorder.Item>
                                ))}
                            </Reorder.Group>
                            <Button variant="outline" size="sm" onClick={() => addStep(threshold.id)} className="mt-2"><PlusCircle className="mr-2"/>Add Step</Button>
                        </div>
                    </Card>
                ))}
                 <Button variant="secondary" onClick={addThreshold}><PlusCircle className="mr-2"/>Add New Approval Tier</Button>
            </CardContent>
            <CardFooter>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Approval Matrix
                </Button>
            </CardFooter>
        </Card>
    );
}
