

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
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Bot, Lightbulb, Loader2, Sparkles, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateRfq, GenerateRfqOutput } from '@/ai/flows/rfq-generation';

const exampleRequisition = `Title: New Laptops for Design Team
Department: Design
Items:
- 5 x MacBook Pro 16-inch
- 5 x 4K Monitor
Justification: Current laptops are over 5 years old and struggling with new design software. New machines will improve productivity significantly.`;

const exampleVendors = `sales@apple.com, sales@dell.com, contact@bestbuy.com`;

export function RfqGeneratorTool() {
  const [requisitionDetails, setRequisitionDetails] = useState(exampleRequisition);
  const [vendorList, setVendorList] = useState(exampleVendors);
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateRfqOutput | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const output = await generateRfq({
        requisitionDetails,
        vendorList: vendorList.split(',').map(v => v.trim()),
        additionalInstructions
      });
      setResult(output);
      toast({
        title: 'RFQ Generated!',
        description: 'The AI has drafted an RFQ based on your input.',
      });
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot /> AI-Powered RFQ Generator
          </CardTitle>
          <CardDescription>
            Provide requisition details and a vendor list, and the AI will generate a professional Request for Quotation email.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="requisition" className="block text-sm font-medium mb-1">
              Purchase Requisition Details
            </label>
            <Textarea
              id="requisition"
              value={requisitionDetails}
              onChange={(e) => setRequisitionDetails(e.target.value)}
              rows={8}
              placeholder="Paste or type the requisition details here."
            />
          </div>
          <div>
            <label htmlFor="vendors" className="block text-sm font-medium mb-1">
              Vendor Email List (comma-separated)
            </label>
            <Textarea
              id="vendors"
              value={vendorList}
              onChange={(e) => setVendorList(e.target.value)}
              rows={2}
              placeholder="e.g., sales@vendor1.com, contact@vendor2.com"
            />
          </div>
           <div>
            <label htmlFor="instructions" className="block text-sm font-medium mb-1">
              Additional Instructions (Optional)
            </label>
            <Textarea
              id="instructions"
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              rows={3}
              placeholder="e.g., Please include warranty information and delivery timelines."
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleGenerate} disabled={loading} size="lg">
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Generate RFQ
          </Button>
        </CardFooter>
      </Card>
      
      <div className="lg:col-span-1 sticky top-8">
        {loading && (
          <Card className="flex items-center justify-center h-96">
            <div className="text-center">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">AI is drafting the RFQ...</p>
            </div>
          </Card>
        )}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Generated RFQ Email</CardTitle>
               <CardDescription>
                Review the AI-generated content below. You can copy it and send it to your vendors.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-1">
                    <h4 className="font-semibold">Subject:</h4>
                    <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md">{result.subject}</p>
                </div>
                 <div className="space-y-2">
                    <h4 className="font-semibold">Body:</h4>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap p-4 bg-muted/50 rounded-md border h-96 overflow-y-auto">{result.body}</div>
                </div>
            </CardContent>
             <CardFooter>
                <Button onClick={() => navigator.clipboard.writeText(`Subject: ${result.subject}\n\n${result.body}`)}>
                    <Mail className="mr-2"/> Copy to Clipboard
                </Button>
             </CardFooter>
          </Card>
        )}
         {!loading && !result && (
            <Card className="flex items-center justify-center h-96 border-dashed">
                <div className="text-center text-muted-foreground">
                    <Bot className="mx-auto h-12 w-12 mb-4" />
                    <p className="font-semibold">Generated RFQ will appear here.</p>
                </div>
            </Card>
        )}
      </div>
    </div>
  );
}
