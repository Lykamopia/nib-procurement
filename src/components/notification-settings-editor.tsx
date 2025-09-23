
'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Eye } from 'lucide-react';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { useAuth } from '@/contexts/auth-context';
import { AppSettings } from '@/lib/settings';
import { Separator } from './ui/separator';

export function NotificationSettingsEditor() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/settings');
        if (!response.ok) throw new Error('Failed to fetch settings');
        const data = await response.json();
        setSettings(data);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not load notification settings.',
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, [toast]);

  const handleSave = async () => {
    if (!settings || !user) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings, userId: user.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings.');
      }

      toast({
        title: 'Settings Saved',
        description: 'Your notification settings have been updated.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (settings) {
      setSettings({
        ...settings,
        notificationTemplates: {
          ...settings.notificationTemplates,
          awardAnnouncement: e.target.value,
        },
      });
    }
  };

  const templatePreview = (template: string) => {
    const sampleData = {
        vendorName: 'ACME Corp.',
        requisitionTitle: 'New Laptops for Design Team',
        portalLink: '#'
    };
    return template
        .replace(/{{{vendorName}}}/g, sampleData.vendorName)
        .replace(/{{{requisitionTitle}}}/g, sampleData.requisitionTitle)
        .replace(/{{{portalLink}}}/g, sampleData.portalLink);
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Templates</CardTitle>
        <CardDescription>
          Customize the content of automated emails sent by the system.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
            <div>
                <Label htmlFor="award-template" className="text-base font-semibold">
                    Vendor Award Announcement
                </Label>
                <p className="text-sm text-muted-foreground mb-2">
                    This email is sent to a vendor when they win a contract. Available placeholders:
                    <code className="mx-1 p-1 bg-muted rounded-sm text-xs font-mono">{`{{{vendorName}}}`}</code>
                    <code className="mx-1 p-1 bg-muted rounded-sm text-xs font-mono">{`{{{requisitionTitle}}}`}</code>
                    <code className="mx-1 p-1 bg-muted rounded-sm text-xs font-mono">{`{{{portalLink}}}`}</code>
                </p>
                <Textarea
                    id="award-template"
                    value={settings?.notificationTemplates.awardAnnouncement || ''}
                    onChange={handleTemplateChange}
                    rows={20}
                    className="font-mono text-xs"
                    placeholder="Enter your custom HTML email template here..."
                />
            </div>
        </div>
        <div className="space-y-4">
            <Label className="text-base font-semibold flex items-center gap-2">
                <Eye className="h-4 w-4"/>
                Live Preview
            </Label>
            <div className="rounded-lg border bg-background shadow-sm h-[500px]">
                <div className="p-4 border-b">
                    <p className="text-sm">To: vendor@example.com</p>
                    <p className="text-sm">Subject: You've Been Awarded a Contract!</p>
                </div>
                 <div
                    className="p-4 text-sm"
                    dangerouslySetInnerHTML={{ __html: templatePreview(settings?.notificationTemplates.awardAnnouncement || '') }}
                />
            </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Templates
        </Button>
      </CardFooter>
    </Card>
  );
}
