// lib/email.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { Parser } from 'json2csv';

dotenv.config();

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function generateCSV(data, fields) {
  if (!data.length) return '';
  const parser = new Parser({ fields });
  return parser.parse(data);
}

export async function sendFailureEmail(failures) {
  if (!failures.length) return;

  const transporter = createTransporter();
  const failureCsv = generateCSV(failures, ['sku', 'reason']);

  const mailOptions = {
    from: '"Product Sync"',
    to: 'hadasa@leibish.com',
    subject: '❌ Failed SKU Report',
    text: 'The following products failed to update:',
    attachments: [
      {
        filename: 'sku_failures.csv',
        content: failureCsv,
      },
    ],
  };

  await transporter.sendMail(mailOptions);
  console.log('📬 Failure email sent successfully.');
}

export async function sendSummaryEmail(successes, failures) {
  if (!successes.length && !failures.length) return;

  const transporter = createTransporter();
  const successCsv = generateCSV(successes, ['sku', 'title', 'status']);
  const failureCsv = generateCSV(failures, ['sku', 'reason']);

  const mailOptions = {
    from: '"Product Sync"',
    to: 'hadasa@leibish.com',
    subject: '📦 Sync Summary Report',
    text: `Attached are the results of the latest product sync.\n\nSuccesses: ${successes.length}\nFailures: ${failures.length}`,
    attachments: [
      successCsv && {
        filename: 'sku_successes.csv',
        content: successCsv,
      },
      failureCsv && {
        filename: 'sku_failures.csv',
        content: failureCsv,
      },
    ].filter(Boolean),
  };

  await transporter.sendMail(mailOptions);
  console.log('📬 Summary email sent successfully.');
}


/**
 * Send a notification email about a metafield change on Hubspot.
 */
export async function sendMetafieldChangeEmail({ sku, key, value }) {
  const transporter = createTransporter();
  const mailOptions = {
    from: '"Product Updates"',
    to: 'margalit@leibish.com',
    cc: 'johanna@leibish.com',
    bcc: 'hadasa@leibish.com',
    subject: `Product Update Request: SKU ${sku}`,
    text: `Hi Margalit,

There is a request to update a product with SKU ${sku}.
The '${key}' field has been changed to '${value}'.

Please review and apply the update.

Thanks!`,  
  };
  await transporter.sendMail(mailOptions);
  console.log('📬 Notification email sent to Margalit.');
}