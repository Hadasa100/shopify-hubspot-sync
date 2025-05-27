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
 * Send a notification email about request for reserved on HubSpot.
 */
export async function sendReservationChangeEmail({ sku, reservedBy, reservedFor, isReserved }) {
  const transporter = createTransporter();
  const subject = isReserved
    ? `Reservation Request for SKU ${sku}`
    : `Release Request for SKU ${sku}`;
  const text = isReserved
    ? `Hi Margalit,

The sale-person: ${reservedBy} requested to reserve the stone with SKU ${sku} for customer ${reservedFor}.

Please review and apply the reservation.

Thanks!`
  : `Hi Margalit,

The sale-person: ${reservedBy} requested to release the reservation of the stone with SKU ${sku}.

Please review and apply the release.

Thanks!`;

  await transporter.sendMail({
    from: '"Product Updates" <no-reply@leibish.com>',
    to: 'margalit@leibish.com',
    cc: ['stock@leibish.com', 'johanna@leibish.com'],
    bcc: 'hadasa@leibish.com',
    subject,
    text,
  });
  console.log(`📬 ${isReserved ? 'Reservation' : 'Release'} email sent for SKU ${sku}.`);
}
