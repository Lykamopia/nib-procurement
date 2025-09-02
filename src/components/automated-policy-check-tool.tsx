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

const exampleRequisition = `{
  "title": "New Laptops for Design Team",
  "department": "Design",
  "items": [
    { "name": "MacBook Pro 16-inch", "quantity": 5, "unitPrice": 75000 },
    { "name": "4K Monitor", "quantity": 5, "unitPrice": 25000 }
  ],
  "totalPrice": 500000,
  "justification": "Current laptops are over 5 years old and struggling with new design software. New machines will improve productivity significantly."
}`;

const exampleBudgetPolicies = `- All hardware purchases over 300,000 ETB require VP approval.
- Individual workstations (laptop + monitor) should not exceed 100,000 ETB.
- Unbudgeted expenses require a 2-week lead time for finance review.`;

const exampleCompliancePolicies = `- All computing hardware must be sourced from approved vendors: Apple, Dell, or Lenovo.
- Software purchases must be vetted by the IT security team.
- All data-handling equipment must be encrypted.`;


export function AutomatedPolicyCheckTool() {
  const [requisitionDetails, setRequisitionDetails] = useState(exampleRequisition);
  const [budgetPolicies, setBudgetPolicies] = useState(exampleBudgetPolicies);
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
        budgetPolicies,
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Automated Policy Check</CardTitle>
          <CardDescription>
            Use AI to check a requisition against business policies.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="requisition" className="block text-sm font-medium mb-1">
              Requisition Details (JSON)
            </label>
            <Textarea
              id="requisition"
              value={requisitionDetails}
              onChange={(e) => setRequisitionDetails(e.target.value)}
              rows={10}
              placeholder="Paste requisition details here..."
            />
          </div>
          <div>
            <label htmlFor="budget" className="block text-sm font-medium mb-1">
              Budget Policies
            </label>
            <Textarea
              id="budget"
              value={budgetPolicies}
              onChange={(e) => setBudgetPolicies(e.target.value)}
              rows={5}
              placeholder="Enter budget policies..."
            />
          </div>
          <div>
            <label htmlFor="compliance" className="block text-sm font-medium mb-1">
              Compliance Policies
            </label>
            <Textarea
              id="compliance"
              value={compliancePolicies}
              onChange={(e) => setCompliancePolicies(e.target.value)}
              rows={5}
              placeholder="Enter compliance policies..."
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleCheck} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Bot className="mr-2 h-4 w-4" />
            )}
            Check Policies
          </Button>
        </CardFooter>
      </Card>
      
      <div className="lg:col-span-1">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">AI is analyzing policies...</p>
            </div>
          </div>
        )}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Policy Check Results</CardTitle>
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
                 <Alert variant="default" className="border-green-500/50 text-green-700 dark:text-green-400">
                  <Lightbulb className="h-4 w-4" />
                  <AlertTitle>No Exceptions Found</AlertTitle>
                  <AlertDescription>
                    The requisition appears to be compliant with all policies.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <h4 className="font-semibold">AI Summary</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.summary}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
