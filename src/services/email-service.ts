
'use server';

import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends an email.
 * This is a placeholder for a real email sending service (e.g., SendGrid, Mailgun).
 * For this demo, it will log the email to the console.
 * @param options - The email options.
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; message: string }> {
  console.log('--- SIMULATING EMAIL SEND ---');
  console.log(`To: ${options.to}`);
  console.log(`Subject: ${options.subject}`);
  console.log('Body (HTML):');
  console.log(options.html);
  console.log('-----------------------------');

  // In a real implementation, you would use nodemailer with a transporter like this:
  /*
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: '"Nib Procurement" <noreply@procurctrl.com>',
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    console.log('Message sent: %s', info.messageId);
    return { success: true, message: `Email sent to ${options.to}` };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, message: 'Failed to send email.' };
  }
  */

  // For the simulation, we'll just assume it was successful.
  return Promise.resolve({ success: true, message: `Simulated email sent to ${options.to}` });
}
