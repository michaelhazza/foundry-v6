import { env, features } from '../config/env';
import { logger } from '../lib/logger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface EmailResult {
  sent: boolean;
  messageId?: string;
  devFallback?: {
    content: string;
    url?: string;
  };
}

/**
 * Send an email using SendGrid or fallback to console logging
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const { to, subject, html, text } = options;

  if (!features.email) {
    // Development fallback: log email content
    logger.info('Email would be sent (dev mode):', {
      to,
      subject,
      content: text || html,
    });

    return {
      sent: false,
      devFallback: {
        content: text || html,
      },
    };
  }

  try {
    // In production with SendGrid configured
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: env.FROM_EMAIL || 'noreply@foundry.app' },
        subject,
        content: [
          ...(text ? [{ type: 'text/plain', value: text }] : []),
          { type: 'text/html', value: html },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('SendGrid error:', error);
      throw new Error('Failed to send email');
    }

    const messageId = response.headers.get('x-message-id') || undefined;

    logger.info('Email sent successfully', { to, subject, messageId });

    return {
      sent: true,
      messageId,
    };
  } catch (error) {
    logger.error('Failed to send email:', error);
    throw error;
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  to: string,
  token: string
): Promise<EmailResult> {
  const resetUrl = `${env.APP_URL}/reset-password?token=${token}`;

  const result = await sendEmail({
    to,
    subject: 'Reset Your Password - Foundry',
    html: `
      <h1>Reset Your Password</h1>
      <p>You requested to reset your password. Click the link below to set a new password:</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
    text: `Reset your password by visiting: ${resetUrl}`,
  });

  // Include URL in dev fallback for testing
  if (result.devFallback) {
    result.devFallback.url = resetUrl;
  }

  return result;
}

/**
 * Send invitation email
 */
export async function sendInvitationEmail(
  to: string,
  organizationName: string,
  inviterName: string,
  token: string
): Promise<EmailResult> {
  const inviteUrl = `${env.APP_URL}/accept-invitation?token=${token}`;

  const result = await sendEmail({
    to,
    subject: `You've been invited to join ${organizationName} on Foundry`,
    html: `
      <h1>You're Invited!</h1>
      <p>${inviterName} has invited you to join ${organizationName} on Foundry.</p>
      <p><a href="${inviteUrl}">Accept Invitation</a></p>
      <p>This invitation will expire in 7 days.</p>
    `,
    text: `You've been invited to join ${organizationName}. Accept your invitation at: ${inviteUrl}`,
  });

  // Include URL in dev fallback for testing
  if (result.devFallback) {
    result.devFallback.url = inviteUrl;
  }

  return result;
}
