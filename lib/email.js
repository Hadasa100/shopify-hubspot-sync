// lib/email.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

export async function sendFailureEmail(failures) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const emailText = failures.reduce(
    (acc, failure) => acc + `SKU: ${failure.sku} - Reason: ${failure.reason}\n`,
    'The following products failed to update:\n\n'
  );

  const mailOptions = {
    from: '"Product Sync" <dev@leibish.com>',
    to: 'hadasa@leibish.com',
    subject: 'Failed SKU Report',
    text: emailText,
  };

  await transporter.sendMail(mailOptions);
  console.log('Failure email sent successfully.');
}
