'use server';

/**
 * @fileOverview RFQ (Request for Quotation) generation flow.
 *
 * - generateRfq - A function that generates RFQ documents based on approved purchase requisitions.
 * - GenerateRfqInput - The input type for the generateRfq function.
 * - GenerateRfqOutput - The return type for the generateRfq function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateRfqInputSchema = z.object({
  requisitionDetails: z
    .string()
    .describe('Details of the approved purchase requisition.'),
  vendorList: z.array(z.string()).describe('List of potential vendors.'),
  additionalInstructions: z
    .string()
    .optional()
    .describe('Any additional instructions for the RFQ generation.'),
});
export type GenerateRfqInput = z.infer<typeof GenerateRfqInputSchema>;

const GenerateRfqOutputSchema = z.object({
  rfqDocument: z.string().describe('The generated RFQ document.'),
});
export type GenerateRfqOutput = z.infer<typeof GenerateRfqOutputSchema>;

export async function generateRfq(input: GenerateRfqInput): Promise<GenerateRfqOutput> {
  return generateRfqFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateRfqPrompt',
  input: {schema: GenerateRfqInputSchema},
  output: {schema: GenerateRfqOutputSchema},
  prompt: `You are an AI assistant specialized in generating Request for Quotation (RFQ) documents for procurement officers.

  Based on the approved purchase requisition details and the list of potential vendors, generate an RFQ document.

  Requisition Details: {{{requisitionDetails}}}
  Vendor List: {{#each vendorList}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  Additional Instructions: {{{additionalInstructions}}}

  Please ensure the RFQ document includes all necessary information, such as item descriptions, quantities, required delivery dates, and any other relevant details.
  The RFQ should be professional and ready to be sent to vendors.
  Remember to address the RFQ to all vendors in the vendor list.

  RFQ Document:`,
});

const generateRfqFlow = ai.defineFlow(
  {
    name: 'generateRfqFlow',
    inputSchema: GenerateRfqInputSchema,
    outputSchema: GenerateRfqOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
