const nodemailer = require('nodemailer');
require('dotenv').config();

// Create reusable transporter object using default SMTP transport or mock
let transporter = null;

if (process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.EMAIL_USER !== 'your_email@gmail.com') {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

/**
 * Sends an email
 * @param {string} to - Recipient email
 * @param {string} subject - Subject line
 * @param {string} text - Plain text body
 * @param {string} html - HTML body
 */
const sendEmail = async (to, subject, text, html) => {
  console.log(`\n======================================================`);
  console.log(`📧 [MOCK EMAIL DISPATCH]`);
  console.log(`TO:      ${to}`);
  console.log(`SUBJECT: ${subject}`);
  console.log(`CONTENT: ${text}`);
  console.log(`======================================================\n`);

  if (!transporter) {
    // If no credentials, we gracefully mock success so developer doesn't get blocked
    return { message: 'Mock email printed to console successfully.', mock: true };
  }

  try {
    const info = await transporter.sendMail({
      from: `"SmartFix Services" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html
    });
    return info;
  } catch (error) {
    console.error('❌ [Email Error] Failed to send email via SMTP:', error.message);
    return { error: error.message, mock: true };
  }
};

module.exports = { sendEmail };
