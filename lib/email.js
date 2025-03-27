// lib/email.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { Parser } from 'json2csv';

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

  const emailText = 'The following products failed to update:\n';
  const fields = ['sku', 'reason'];
  const parser = new Parser({ fields });
  const csv = parser.parse(failures);

  const mailOptions = {
    from: '"Product Sync" <dev@leibish.com>',
    to: 'hadasa@leibish.com',
    subject: 'Failed SKU Report',
    text: emailText,
    attachments: [
      {
        filename: 'sku_failures.csv',
        content: csv,
      },
    ],
  };

  await transporter.sendMail(mailOptions);
  console.log('Failure email sent successfully.');
}

export async function sendSummaryEmail(successes, failures) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const successFields = ['sku', 'title', 'status'];
  const failureFields = ['sku', 'reason'];

  const successCsv = new Parser({ fields: successFields }).parse(successes);
  const failureCsv = new Parser({ fields: failureFields }).parse(failures);

  const mailOptions = {
    from: '"Product Sync" <dev@leibish.com>',
    to: 'hadasa@leibish.com',
    subject: 'Sync Summary Report',
    text: `Attached are the results of the latest product sync.\nSuccesses: ${successes.length}\nFailures: ${failures.length}`,
    attachments: [
      {
        filename: 'sku_successes.csv',
        content: successCsv,
      },
      {
        filename: 'sku_failures.csv',
        content: failureCsv,
      },
    ],
  };

  await transporter.sendMail(mailOptions);
  console.log('Summary email sent successfully.');
}