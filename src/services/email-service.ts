
'use server';

import nodemailer from 'nodemailer';

interface EmailOptions {
    to: string;
    subject: string;
    text?: string;
    html: string;
}

export async function sendEmail(options: EmailOptions) {
    // For demo purposes, we'll log to the console.
    // In a real app, you'd configure a real SMTP transport.
    console.log('--- SENDING EMAIL ---');
    console.log('To:', options.to);
    console.log('Subject:', options.subject);
    console.log('Body:', options.html);
    console.log('---------------------');
    
    // Example of a real transporter using environment variables
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER || 'your-email@example.com', // Your email
            pass: process.env.SMTP_PASS || 'your-password', // Your password
        },
    });

    try {
        const info = await transporter.sendMail({
            from: '"Nib Procurement" <no-reply@nib-procurement.com>',
            ...options
        });
        console.log('Message sent: %s', info.messageId);
        // Preview only available when sending through an Ethereal account
        if (process.env.SMTP_HOST === 'smtp.ethereal.email') {
            console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
        }
    } catch (error) {
        console.error('Error sending email:', error);
        // Don't throw error to prevent crashing the server process in a demo
        // In a real app, you might want to handle this more gracefully
    }
}
