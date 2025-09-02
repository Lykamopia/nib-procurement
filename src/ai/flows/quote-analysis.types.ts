/**
 * @fileOverview This file defines the types and schemas for the quote-analysis flow.
 */

import {z} from 'zod';

const QuotationSchema = z.object({
  id: z.string(),
  requisitionId: z.string(),
  vendorId: z.string(),
  vendorName: z.string(),
  items: z.array(z.object({
    requisitionItemId: z.string(),
    name: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    leadTimeDays: z.number(),
  })),
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
