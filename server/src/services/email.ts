import { BrevoClient } from '@getbrevo/brevo';
import { otpEmailTemplate } from './emailTemplates';

export const generateOtp = (): string =>
  Math.floor(100000 + Math.random() * 900000).toString();

export const sendOtpEmail =  (to: string, name: string, otp: string): void => {
  const client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY || '' });

  client.transactionalEmails.sendTransacEmail({
    sender: {
      name: process.env.SMTP_FROM_NAME || 'CallShot',
      email: process.env.SMTP_FROM_EMAIL || '',
    },
    to: [{ email: to }],
    subject: `${otp} is your CallShot verification code`,
    htmlContent: otpEmailTemplate(name, otp),
  });

};
