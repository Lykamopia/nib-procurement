'use server';

/**
 * @fileOverview This file defines a Genkit flow for automatically checking purchase requisitions against predefined budget and compliance policies.
 *
 * - automatedPolicyCheck - A function that triggers the policy check flow.
 * - AutomatedPolicyCheckInput - The input type for the automatedPolicyCheck function.
 * - AutomatedPolicyCheckOutput - The return type for the automatedPolicyCheck function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AutomatedPolicyCheckInputSchema = z.object({
  requisitionDetails: z
    .string()
    .describe("Detailed information about the purchase requisition, including items, quantities, and justification."),
  compliancePolicies: z
    .string()
    .describe("The company's compliance policies as a string."),
});
export type AutomatedPolicyCheckInput = z.infer<typeof AutomatedPolicyCheckInputSchema>;

const AutomatedPolicyCheckOutputSchema = z.object({
  exceptions: z.array(
    z.string().describe("A list of potential policy exceptions identified in the purchase requisition.")
  ).describe("List of exceptions found during policy check."),
  summary: z.string().describe("A summary of the policy check, including any identified exceptions and overall compliance status."),
});
export type AutomatedPolicyCheckOutput = z.infer<typeof AutomatedPolicyCheckOutputSchema>;

export async function automatedPolicyCheck(input: AutomatedPolicyCheckInput): Promise<AutomatedPolicyCheckOutput> {
  return automatedPolicyCheckFlow(input);
}

const prompt = ai.definePrompt({
  name: 'automatedPolicyCheckPrompt',
  input: {schema: AutomatedPolicyCheckInputSchema},
  output: {schema: AutomatedPolicyCheckOutputSchema},
  prompt: `You are an AI assistant designed to check purchase requisitions against compliance policies.

  Analyze the provided requisition details against the given compliance policies to identify any potential exceptions.

  Requisition Details: {{{requisitionDetails}}}
  Compliance Policies: {{{compliancePolicies}}}

  Identify any exceptions and provide a summary of the policy check, including the compliance status.
  Return the exceptions in a numbered list, followed by the summary.
  `,
});

const automatedPolicyCheckFlow = ai.defineFlow(
  {
    name: 'automatedPolicyCheckFlow',
    inputSchema: AutomatedPolicyCheckInputSchema,
    outputSchema: AutomatedPolicyCheckOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
