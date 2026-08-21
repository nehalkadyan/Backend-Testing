'use strict';

const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../config/logger');

let transporter;

const getTransporter = () => {
    if (transporter) return transporter;
    transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
        },
    });
    return transporter;
};

/**
 * Sends an email using the configured transporter.
 */
const sendEmail = async ({ to, subject, html, text }) => {
    try {
        const info = await getTransporter().sendMail({
            from: `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM}>`,
            to,
            subject,
            html,
            text: text || html.replace(/<[^>]+>/g, ''),
        });
        logger.info(`Email sent to ${to}: messageId=${info.messageId}`);
        return info;
    } catch (err) {
        logger.error(`Failed to send email to ${to}: ${err.message}`);
        throw err;
    }
};

// ── Email Templates ──────────────────────────────────────────────────────────
const sendVerificationEmail = (to, token) =>
    sendEmail({
        to,
        subject: 'Verify your email address',
        html: `
      <h2>Email Verification</h2>
      <p>Thank you for registering. Please verify your email by clicking the link below:</p>
      <a href="${env.API_BASE_URL}/api/v1/auth/verify-email?token=${token}">Verify Email</a>
      <p>This link expires in 24 hours.</p>
      <p>If you did not register, ignore this email.</p>
    `,
    });

const sendPasswordResetEmail = (to, token) =>
    sendEmail({
        to,
        subject: 'Password Reset Request',
        html: `
      <h2>Password Reset</h2>
      <p>You requested a password reset. Click the link below to set a new password:</p>
      <a href="${env.CLIENT_URL}/reset-password?token=${token}">Reset Password</a>
      <p>This link expires in 1 hour.</p>
      <p>If you did not request this, ignore this email. Your password will remain unchanged.</p>
    `,
    });

const sendPasswordChangedEmail = (to) =>
    sendEmail({
        to,
        subject: 'Your password has been changed',
        html: `
      <h2>Password Changed</h2>
      <p>Your account password was recently changed.</p>
      <p>If you did not make this change, please contact support immediately.</p>
    `,
    });

module.exports = {
    sendEmail,
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendPasswordChangedEmail,
};
