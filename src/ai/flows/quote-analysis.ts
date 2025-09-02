'use server';

/**
 * @fileOverview This file defines a Genkit flow for analyzing vendor quotations and recommending the best option based on specified criteria.
 *
 * - analyzeQuotes - A function that triggers the quote analysis flow.
 */

import {ai} from '@/ai/genkit';
import {
    QuoteAnalysisInputSchema,
    QuoteAnalysisOutputSchema,
    type QuoteAnalysisInput,
    type QuoteAnalysisOutput
} from './quote-analysis.types';


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
