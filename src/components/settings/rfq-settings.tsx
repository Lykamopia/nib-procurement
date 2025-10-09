
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import { UserRole } from '@/lib/types';
import { RfqSenderSetting } from '@/contexts/auth-context';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';

export function RfqSettings() {
    const { 
        allUsers, 
        rfqSenderSetting, 
        updateRfqSenderSetting,
        highestApproverCanOverride,
        updateHighestApproverOverride
    } = useAuth();
    const { toast } = useToast();
    
    const [senderSetting, setSenderSetting] = useState<RfqSenderSetting>(rfqSenderSetting);
    const [overrideSetting, setOverrideSetting] = useState(highestApproverCanOverride);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setSenderSetting(rfqSenderSetting);
        setOverrideSetting(highestApproverCanOverride);
    }, [rfqSenderSetting, highestApproverCanOverride]);

    const handleSave = () => {
        setIsSaving(true);
        updateRfqSenderSetting(senderSetting);
        updateHighestApproverOverride(overrideSetting);

        setTimeout(() => {
            toast({
                title: 'Settings Saved',
                description: 'General settings have been updated.',
            });
            setIsSaving(false);
        }, 500);
    };

    const procurementRoles: UserRole[] = ['Procurement Officer', 'Admin'];
    const procurementUsers = allUsers.filter(user => procurementRoles.includes(user.role));

    return (
        <Card>
            <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                    Configure core application behaviors for procurement workflows.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                 <div>
                    <h3 className="font-semibold text-lg mb-2">RFQ Sender Configuration</h3>
                     <p className="text-sm text-muted-foreground mb-4">
                        Define who has the permission to send RFQs to vendors.
                    </p>
                    <RadioGroup 
                        value={senderSetting.type} 
                        onValueChange={(value: 'all' | 'specific') => setSenderSetting({ type: value, userId: value === 'all' ? null : senderSetting.userId })}
                        className="space-y-2"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="all" id="rfq-all" />
                            <Label htmlFor="rfq-all">All Procurement Roles</Label>
                        </div>
                        <p className="pl-6 text-xs text-muted-foreground">
                            Any user with the "Procurement Officer" or "Admin" role can send RFQs.
                        </p>

                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="specific" id="rfq-specific" />
                            <Label htmlFor="rfq-specific">Specific Person</Label>
                        </div>
                        <p className="pl-6 text-xs text-muted-foreground">
                            Only one designated user can send RFQs.
                        </p>
                    </RadioGroup>

                    {senderSetting.type === 'specific' && (
                        <div className="pl-6 pt-4">
                            <Label htmlFor="specific-user-select">Select a user</Label>
                            <Select
                                value={senderSetting.userId || ''}
                                onValueChange={(userId) => setSenderSetting({ ...senderSetting, userId })}
                            >
                                <SelectTrigger id="specific-user-select" className="w-full md:w-1/2 mt-2">
                                    <SelectValue placeholder="Select a procurement user" />
                                </SelectTrigger>
                                <SelectContent>
                                    {procurementUsers.map(user => (
                                        <SelectItem key={user.id} value={user.id}>
                                            {user.name} ({user.role})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
                
                <Separator />

                <div>
                    <h3 className="font-semibold text-lg mb-2">Approval Limit Override</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Manage behavior for exceptionally high-value procurements.
                    </p>
                     <div className="flex items-center space-x-2">
                        <Switch 
                            id="override-switch"
                            checked={overrideSetting}
                            onCheckedChange={setOverrideSetting}
                        />
                        <Label htmlFor="override-switch">Allow highest-level approver to override their limit</Label>
                    </div>
                     <p className="pl-8 text-xs text-muted-foreground">
                        If enabled, the final person in an approval chain can approve an award even if it exceeds their defined limit.
                    </p>
                </div>

            </CardContent>
            <CardFooter>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Changes
                </Button>
            </CardFooter>
        </Card>
    );
}
