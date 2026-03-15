import nodemailer, { SentMessageInfo } from 'nodemailer';
import { otpEmailTemplate } from './emailTemplates';

const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('SMTP config missing: SMTP_HOST, SMTP_USER, SMTP_PASS are required');
  }

  console.log({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  }, ">>>>>");

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
};

export const generateOtp = (): string =>
  Math.floor(100000 + Math.random() * 900000).toString();

export const sendOtpEmail = async (to: string, name: string, otp: string): Promise<SentMessageInfo> => {
  const transporter = createTransporter();
  const from = `"CallShot" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`;

  console.log({
    from,
    to,
    subject: `${otp} is your CallShot verification code`,
    html: otpEmailTemplate(name, otp),
  }, "<<<<<<<");

  await new Promise((resolve, reject) => {
    // verify connection configuration
    transporter.verify(function (error, success) {
      if (error) {
        console.log(error);
        reject(error);
      } else {
        console.log("Server is ready to take our messages");
        resolve(success);
      }
    });
  });

  const mailData = {
    from,
    to,
    subject: `${otp} is your CallShot verification code`,
    html: otpEmailTemplate(name, otp),
  };

  return await new Promise((resolve, reject) => {
    // send mail
    transporter.sendMail(mailData, (err, info) => {
      if (err) {
        console.error(err);
        reject(err);
      } else {
        console.log(info);
        resolve(info);
      }
    });
  });
};
