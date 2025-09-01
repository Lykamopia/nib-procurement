'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Bot, Copy, Loader2, Send } from 'lucide-react';
import { generateRfq, GenerateRfqOutput } from '@/ai/flows/rfq-generation';
import { useToast } from '@/hooks/use-toast';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';

const exampleRequisition = `Requisition ID: REQ-2023-08-001
Title: New Laptops for Design Team
Department: Design
Items:
- 5x MacBook Pro 16-inch (Model A2485 or newer)
- 5x 4K UHD Monitor (27-inch, USB-C connectivity)
Required Delivery Date: 2023-11-30
Delivery Address: 123 Tech Park, Innovation City, 12345`;

export function RfqGeneratorTool() {
  const [requisitionDetails, setRequisitionDetails] = useState(exampleRequisition);
  const [vendorList, setVendorList] = useState<string[]>(['vendor-a@example.com', 'vendor-b@example.com']);
  const [newVendor, setNewVendor] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('Please provide pricing in USD. Include warranty information and estimated delivery time.');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateRfqOutput | null>(null);
  const { toast } = useToast();

  const handleAddVendor = () => {
    if (newVendor && !vendorList.includes(newVendor)) {
      setVendorList([...vendorList, newVendor]);
      setNewVendor('');
    }
  };

  const handleRemoveVendor = (vendorToRemove: string) => {
    setVendorList(vendorList.filter(vendor => vendor !== vendorToRemove));
  };
  
  const handleGenerate = async () => {
    if (vendorList.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No vendors',
        description: 'Please add at least one vendor email.',
      });
      return;
    }
    
    setLoading(true);
    setResult(null);
    try {
      const output = await generateRfq({
        requisitionDetails,
        vendorList,
        additionalInstructions,
      });
      setResult(output);
    } catch (error) {
      console.error('RFQ generation failed:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate RFQ. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const copyToClipboard = () => {
    if (result?.rfqDocument) {
      navigator.clipboard.writeText(result.rfqDocument);
      toast({ title: 'Copied to clipboard!' });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>RFQ Generator</CardTitle>
          <CardDescription>
            Automatically generate a Request for Quotation document.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="requisition-rfq" className="block text-sm font-medium mb-1">
              Requisition Details
            </label>
            <Textarea
              id="requisition-rfq"
              value={requisitionDetails}
              onChange={(e) => setRequisitionDetails(e.target.value)}
              rows={10}
              placeholder="Paste approved requisition details here..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Vendor List
            </label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={newVendor}
                onChange={(e) => setNewVendor(e.target.value)}
                placeholder="vendor@example.com"
                onKeyDown={(e) => e.key === 'Enter' && handleAddVendor()}
              />
              <Button type="button" onClick={handleAddVendor}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {vendorList.map(vendor => (
                <Badge key={vendor} variant="secondary" className="text-sm">
                  {vendor}
                  <button onClick={() => handleRemoveVendor(vendor)} className="ml-2 rounded-full hover:bg-muted-foreground/20 p-0.5">
                    <span className="sr-only">Remove {vendor}</span>
                    &times;
                  </button>
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="instructions" className="block text-sm font-medium mb-1">
              Additional Instructions
            </label>
            <Textarea
              id="instructions"
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              rows={4}
              placeholder="e.g., pricing currency, warranty info..."
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Bot className="mr-2 h-4 w-4" />
            )}
            Generate RFQ
          </Button>
        </CardFooter>
      </Card>
      
      <div className="lg:col-span-1">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">AI is drafting the RFQ...</p>
            </div>
          </div>
        )}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Generated RFQ Document</CardTitle>
            </CardHeader>
            <CardContent>
               <Textarea
                readOnly
                value={result.rfqDocument}
                className="min-h-[400px] font-mono text-xs"
              />
            </CardContent>
            <CardFooter className="justify-end gap-2">
                <Button variant="outline" onClick={copyToClipboard}>
                    <Copy className="mr-2 h-4 w-4"/>
                    Copy Text
                </Button>
                <Button>
                    <Send className="mr-2 h-4 w-4"/>
                    Send to Vendors
                </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
