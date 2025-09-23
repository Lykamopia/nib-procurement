
'use server';
/**
 * @fileOverview A Genkit flow for sending emails.
 *
 * - sendEmailFlow - A function that triggers the email sending process.
 * - SendEmailInput - The input type for the sendEmailFlow function.
 */

import { ai } from '@/ai/genkit';
import { sendEmail as sendEmailService } from '@/services/email-service';
import { z } from 'genkit';

export const SendEmailInputSchema = z.object({
  to: z.string().email().describe('The recipient\'s email address.'),
  subject: z.string().describe('The subject line of the email.'),
  html: z.string().describe('The HTML body of the email.'),
});
export type SendEmailInput = z.infer<typeof SendEmailInputSchema>;

export const sendEmailFlow = ai.defineFlow(
  {
    name: 'sendEmailFlow',
    inputSchema: SendEmailInputSchema,
    outputSchema: z.object({ success: z.boolean(), message: z.string() }),
  },
  async (input) => {
    console.log(`[sendEmailFlow] Received request to send email to ${input.to}`);
    const result = await sendEmailService(input);
    console.log(`[sendEmailFlow] Email service result: ${result.message}`);
    return result;
  }
);
