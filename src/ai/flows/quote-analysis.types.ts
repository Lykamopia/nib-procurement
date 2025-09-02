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
  deliveryDate: z.string().datetime(),
  createdAt: z.string().datetime(),
  status: z.enum(['Submitted', 'Awarded', 'Rejected']),
  notes: z.string().optional(),
});


export const QuoteAnalysisInputSchema = z.object({
  quotations: z.array(QuotationSchema).describe("The list of vendor quotations to be analyzed."),
  decisionMetric: z.enum(["Lowest Price", "Fastest Delivery", "Best Balance"]).describe("The primary metric to use for the decision."),
  requisitionDetails: z.string().describe("The original requisition details for context.")
});
export type QuoteAnalysisInput = z.infer<typeof QuoteAnalysisInputSchema>;

const RecommendedQuoteSchema = z.object({
  quoteId: z.string().describe("The ID of a recommended quote."),
  reason: z.string().describe("A brief reason why this quote is recommended."),
});

export const QuoteAnalysisOutputSchema = z.object({
  recommendations: z.array(RecommendedQuoteSchema).describe("A list of the top 3 recommended quotations, ordered from best to worst."),
  justification: z.string().describe("A detailed justification for the overall recommendation ranking."),
  summary: z.string().describe("A brief summary of the recommendation analysis."),
});
export type QuoteAnalysisOutput = z.infer<typeof QuoteAnalysisOutputSchema>;
