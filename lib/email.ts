import { Resend } from 'resend';

const APP_NAME = 'Notion Form Builder';

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  return new Resend(apiKey);
}

export async function sendMagicLinkEmail(email: string, token: string): Promise<void> {
  const resend = getResendClient();
  const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const magicLink = `${appUrl}/api/auth/email/verify?token=${token}`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `Sign in to ${APP_NAME}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px; background-color: #f9fafb;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: 600; color: #111827;">
              Sign in to ${APP_NAME}
            </h1>
            <p style="margin: 0 0 24px; color: #6b7280; line-height: 1.6;">
              Click the button below to sign in. This link will expire in 15 minutes.
            </p>
            <a href="${magicLink}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
              Sign in
            </a>
            <p style="margin: 24px 0 0; font-size: 14px; color: #9ca3af;">
              If you didn't request this email, you can safely ignore it.
            </p>
            <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">
              This link can only be used once and expires in 15 minutes.
            </p>
          </div>
        </body>
      </html>
    `,
    text: `Sign in to ${APP_NAME}\n\nClick this link to sign in: ${magicLink}\n\nThis link will expire in 15 minutes.\n\nIf you didn't request this email, you can safely ignore it.`,
  });
}
