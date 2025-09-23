
'use client';

import { useState, useEffect, useRef } from 'react';
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
import { Loader2, Save, Eye, Bold, Italic, Link, Code, Heading1, Heading2, Pilcrow } from 'lucide-react';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { useAuth } from '@/contexts/auth-context';
import { AppSettings } from '@/lib/settings';

const placeholders = [
    { value: '{{{vendorName}}}', label: 'Vendor Name' },
    { value: '{{{requisitionTitle}}}', label: 'Requisition Title' },
    { value: '{{{portalLink}}}', label: 'Portal Link' },
];

export function NotificationSettingsEditor() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
  
  const insertText = (text: string, isTag = false) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    let newText;

    if (isTag) {
        const [openingTag, closingTag] = text.split('}{');
        newText = `${openingTag}${selectedText}${closingTag}`;
    } else {
        newText = text;
    }
    
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);
    
    const fullText = before + newText + after;

    if (settings) {
         setSettings({
            ...settings,
            notificationTemplates: {
              ...settings.notificationTemplates,
              awardAnnouncement: fullText,
            },
        });
    }

    // Set focus and cursor position after state update
    setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + newText.length - (isTag ? 0 : selectedText.length);
        textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };


  const templatePreview = (template: string) => {
    const sampleData = {
        vendorName: 'ACME Corp.',
        requisitionTitle: 'New Laptops for Design Team',
        portalLink: '#'
    };
    return template
        .replace(/{{{vendorName}}}/g, `<span class="font-bold text-primary">${sampleData.vendorName}</span>`)
        .replace(/{{{requisitionTitle}}}/g, `<span class="italic text-primary">${sampleData.requisitionTitle}</span>`)
        .replace(/{{{portalLink}}}/g, `<a href="#" class="text-blue-500 underline">${sampleData.portalLink}</a>`);
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
                <div className="flex flex-wrap gap-1 my-2">
                    {placeholders.map(p => (
                         <Button key={p.value} type="button" variant="outline" size="sm" onClick={() => insertText(p.value)}>
                            <Code className="mr-2 h-3 w-3"/>
                            {p.label}
                        </Button>
                    ))}
                </div>
                 <div className="flex items-center gap-1 p-2 rounded-md border bg-muted">
                    <Button type="button" variant="ghost" size="icon" onClick={() => insertText('<strong>}{</strong>', true)}><Bold/></Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => insertText('<em>}{</em>', true)}><Italic/></Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => insertText('<a href="#">}{</a>', true)}><Link/></Button>
                     <Button type="button" variant="ghost" size="icon" onClick={() => insertText('<h1>}{</h1>', true)}><Heading1/></Button>
                     <Button type="button" variant="ghost" size="icon" onClick={() => insertText('<h2>}{</h2>', true)}><Heading2/></Button>
                     <Button type="button" variant="ghost" size="icon" onClick={() => insertText('<p>}{</p>', true)}><Pilcrow/></Button>
                </div>
                <Textarea
                    id="award-template"
                    ref={textareaRef}
                    value={settings?.notificationTemplates.awardAnnouncement || ''}
                    onChange={handleTemplateChange}
                    rows={20}
                    className="font-mono text-xs mt-2"
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
