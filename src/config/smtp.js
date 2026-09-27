const nodemailer = require('nodemailer');

let transporter = null;

/**
 * Get or create the SMTP transporter singleton.
 * @returns {import('nodemailer').Transporter}
 */
function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

/**
 * Send an email.
 * @param {object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email body in HTML
 * @returns {Promise<import('nodemailer').SentMessageInfo>}
 */
async function sendEmail({ to, subject, html }) {
  const transport = getTransporter();
  const fromName = process.env.SMTP_FROM_NAME || 'Jeda App';
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

  return transport.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    html,
  });
}

module.exports = { getTransporter, sendEmail };
