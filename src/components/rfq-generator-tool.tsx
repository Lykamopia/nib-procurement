
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
import { Bot, Copy, Loader2, Mail, X } from 'lucide-react';
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
  const [vendorList, setVendorList] = useState<string[]>(['sales@apple.com', 'pro-sales@dell.com', 'corporate@bestbuy.com']);
  const [newVendor, setNewVendor] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('Please provide pricing in ETB. Include detailed warranty information and estimated delivery times for all items. Your quotation should be valid for 30 days.');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateRfqOutput | null>(null);
  const { toast } = useToast();

  const handleAddVendor = () => {
    if (newVendor && !vendorList.includes(newVendor) && newVendor.includes('@')) {
      setVendorList([...vendorList, newVendor]);
      setNewVendor('');
    } else {
        toast({
            variant: 'destructive',
            title: 'Invalid Email',
            description: 'Please enter a valid vendor email address.',
        })
    }
  };

  const handleRemoveVendor = (vendorToRemove: string) => {
    setVendorList(vendorList.filter(vendor => vendor !== vendorToRemove));
  };
  
  const handleGenerate = async () => {
    if (vendorList.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Vendors',
        description: 'Please add at least one vendor email before generating the RFQ.',
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
        description: 'Failed to generate RFQ. Please try again later.',
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bot /> AI-Powered RFQ Generator</CardTitle>
          <CardDescription>
            Provide the details of an approved requisition, and the AI will generate a professional Request for Quotation (RFQ) document ready to be sent to vendors.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="requisition-rfq" className="block text-sm font-medium mb-1">
              Approved Requisition Details
            </label>
            <Textarea
              id="requisition-rfq"
              value={requisitionDetails}
              onChange={(e) => setRequisitionDetails(e.target.value)}
              rows={10}
              placeholder="Paste the full, approved requisition details here. Include items, quantities, and delivery requirements."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Vendor Email List
            </label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={newVendor}
                onChange={(e) => setNewVendor(e.target.value)}
                placeholder="vendor@example.com"
                onKeyDown={(e) => {if (e.key === 'Enter') { e.preventDefault(); handleAddVendor();}}}
              />
              <Button type="button" onClick={handleAddVendor}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {vendorList.map(vendor => (
                <Badge key={vendor} variant="secondary" className="text-sm font-normal">
                  {vendor}
                  <button onClick={() => handleRemoveVendor(vendor)} className="ml-2 rounded-full hover:bg-muted-foreground/20 p-0.5">
                    <span className="sr-only">Remove {vendor}</span>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="instructions" className="block text-sm font-medium mb-1">
              Additional Instructions for Vendors
            </label>
            <Textarea
              id="instructions"
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              rows={4}
              placeholder="e.g., pricing currency, warranty info, quote validity period..."
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleGenerate} disabled={loading} size="lg">
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            Generate RFQ Document
          </Button>
        </CardFooter>
      </Card>
      
      <div className="lg:col-span-1 sticky top-8">
        {loading && (
          <Card className="flex items-center justify-center h-96">
            <div className="text-center">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">AI is drafting the RFQ...</p>
              <p className="text-xs text-muted-foreground mt-2">This may take a moment.</p>
            </div>
          </Card>
        )}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Generated RFQ Document</CardTitle>
              <CardDescription>Review the generated text below. You can copy it or send it directly.</CardDescription>
            </CardHeader>
            <CardContent>
               <Textarea
                readOnly
                value={result.rfqDocument}
                className="min-h-[400px] font-mono text-xs bg-muted/20"
                aria-label="Generated RFQ Document"
              />
            </CardContent>
            <CardFooter className="justify-end gap-2">
                <Button variant="outline" onClick={copyToClipboard}>
                    <Copy className="mr-2 h-4 w-4"/>
                    Copy Text
                </Button>
                <Button>
                    <Mail className="mr-2 h-4 w-4"/>
                    Send to Vendors
                </Button>
            </CardFooter>
          </Card>
        )}
         {!loading && !result && (
            <Card className="flex items-center justify-center h-96 border-dashed">
                <div className="text-center text-muted-foreground">
                    <Bot className="mx-auto h-12 w-12 mb-4" />
                    <p className="font-semibold">The generated RFQ will appear here.</p>
                    <p className="text-sm">Click "Generate RFQ Document" to start.</p>
                </div>
            </Card>
        )}
      </div>
    </div>
  );
}
