
'use server';

import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends an email using Nodemailer with credentials from environment variables.
 * @param options - The email options.
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; message: string }> {
  // Use environment variables for configuration
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
}
