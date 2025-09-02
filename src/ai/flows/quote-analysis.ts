'use server';

/**
 * @fileOverview This file defines a Genkit flow for analyzing vendor quotations and recommending the best option based on specified criteria.
 *
 * - analyzeQuotes - A function that triggers the quote analysis flow.
 * - QuoteAnalysisInput - The input type for the analyzeQuotes function.
 * - QuoteAnalysisOutput - The return type for the analyzeQuotes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { Quotation } from '@/lib/types';


const QuotationSchema = z.object({
  id: z.string(),
  vendorName: z.string(),
  totalPrice: z.number(),
  deliveryDate: z.date(),
  createdAt: z.date(),
  status: z.enum(['Submitted', 'Awarded', 'Rejected']),
  notes: z.string().optional(),
});


export const QuoteAnalysisInputSchema = z.object({
  quotations: z.array(QuotationSchema).describe("The list of vendor quotations to be analyzed."),
  decisionMetric: z.enum(["Lowest Price", "Fastest Delivery", "Best Balance"]).describe("The primary metric to use for the decision."),
  requisitionDetails: z.string().describe("The original requisition details for context.")
});
export type QuoteAnalysisInput = z.infer<typeof QuoteAnalysisInputSchema>;

export const QuoteAnalysisOutputSchema = z.object({
  recommendedQuoteId: z.string().describe("The ID of the recommended quotation."),
  justification: z.string().describe("A detailed justification for why this quote was recommended based on the metric."),
  summary: z.string().describe("A brief summary of the recommendation."),
});
export type QuoteAnalysisOutput = z.infer<typeof QuoteAnalysisOutputSchema>;

export async function analyzeQuotes(input: QuoteAnalysisInput): Promise<QuoteAnalysisOutput> {
  return quoteAnalysisFlow(input);
}


const prompt = ai.definePrompt({
  name: 'quoteAnalysisPrompt',
  input: {schema: QuoteAnalysisInputSchema},
  output: {schema: QuoteAnalysisOutputSchema},
  prompt: `You are an expert procurement advisor. Your task is to analyze the following vendor quotations for a given purchase requisition and recommend the best option based on the specified decision metric.

  Decision Metric: {{{decisionMetric}}}

  Requisition Context:
  {{{requisitionDetails}}}

  Vendor Quotations (JSON format):
  {{{json quotations}}}

  Your analysis should be thorough.
  - If the metric is "Lowest Price", prioritize the quote with the absolute lowest total price.
  - If the metric is "Fastest Delivery", prioritize the quote with the earliest delivery date.
  - If the metric is "Best Balance", you must weigh both price and delivery time, as well as other factors like notes (e.g., warranty, included services), to find the most advantageous offer. A slightly more expensive quote might be better if its delivery is significantly faster or it includes valuable extras.

  Provide a clear justification for your choice, explaining how it aligns with the selected metric. Then, provide a short summary.
  `,
});

const quoteAnalysisFlow = ai.defineFlow(
  {
    name: 'quoteAnalysisFlow',
    inputSchema: QuoteAnalysisInputSchema,
    outputSchema: QuoteAnalysisOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
