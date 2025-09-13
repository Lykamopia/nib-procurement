
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
import { Bot, Lightbulb, Loader2, TriangleAlert } from 'lucide-react';
import { automatedPolicyCheck, AutomatedPolicyCheckOutput } from '@/ai/flows/automated-policy-check';
import { useToast } from '@/hooks/use-toast';

const exampleRequisition = `Title: New Laptops for Design Team
Department: Design
Items:
- 5 x MacBook Pro 16-inch @ 75,000 ETB each
- 5 x 4K Monitor @ 25,000 ETB each
Total Price: 500,000 ETB
Justification: Current laptops are over 5 years old and struggling with new design software. New machines will improve productivity significantly.`;

const exampleCompliancePolicies = `- All computing hardware must be sourced from approved vendors.
- All data-handling equipment must be encrypted.`;


export function AutomatedPolicyCheckTool() {
  const [requisitionDetails, setRequisitionDetails] = useState(exampleRequisition);
  const [compliancePolicies, setCompliancePolicies] = useState(exampleCompliancePolicies);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AutomatedPolicyCheckOutput | null>(null);
  const { toast } = useToast();

  const handleCheck = async () => {
    setLoading(true);
    setResult(null);
    try {
      const output = await automatedPolicyCheck({
        requisitionDetails,
        compliancePolicies,
      });
      setResult(output);
    } catch (error) {
      console.error('Policy check failed:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to perform policy check. Please try again.',
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
            <Bot /> AI-Powered Policy Check
          </CardTitle>
          <CardDescription>
            Enter the details of a purchase request and the relevant business rules. The AI will analyze them for potential compliance issues.
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
              rows={10}
              placeholder="Paste or type the requisition details here. You can use the example as a template."
            />
          </div>
          <div>
            <label htmlFor="compliance" className="block text-sm font-medium mb-1">
              Company Compliance Policies
            </label>
            <Textarea
              id="compliance"
              value={compliancePolicies}
              onChange={(e) => setCompliancePolicies(e.target.value)}
              rows={5}
              placeholder="Enter one policy per line..."
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleCheck} disabled={loading} size="lg">
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <TriangleAlert className="mr-2 h-4 w-4" />
            )}
            Analyze for Issues
          </Button>
        </CardFooter>
      </Card>
      
      <div className="lg:col-span-1 sticky top-8">
        {loading && (
          <Card className="flex items-center justify-center h-96">
            <div className="text-center">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">AI is analyzing policies...</p>
              <p className="text-xs text-muted-foreground mt-2">This may take a moment.</p>
            </div>
          </Card>
        )}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Analysis Complete</CardTitle>
               <CardDescription>
                The AI has reviewed the requisition against the provided policies.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {result.exceptions.length > 0 ? (
                <Alert variant="destructive">
                  <TriangleAlert className="h-4 w-4" />
                  <AlertTitle>Potential Exceptions Found!</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-5 space-y-1 mt-2">
                      {result.exceptions.map((ex, index) => (
                        <li key={index}>{ex}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              ) : (
                 <Alert variant="default" className="border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400">
                  <Lightbulb className="h-4 w-4" />
                  <AlertTitle>No Exceptions Found</AlertTitle>
                  <AlertDescription>
                    The requisition appears to be compliant with all policies provided.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <h4 className="font-semibold">AI Summary & Explanation</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap p-4 bg-muted/50 rounded-md">{result.summary}</p>
              </div>
            </CardContent>
          </Card>
        )}
         {!loading && !result && (
            <Card className="flex items-center justify-center h-96 border-dashed">
                <div className="text-center text-muted-foreground">
                    <Bot className="mx-auto h-12 w-12 mb-4" />
                    <p className="font-semibold">Analysis results will appear here.</p>
                    <p className="text-sm">Click "Analyze for Issues" to start.</p>
                </div>
            </Card>
        )}
      </div>
    </div>
  );
}
