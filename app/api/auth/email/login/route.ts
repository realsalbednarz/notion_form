import { NextRequest, NextResponse } from 'next/server';
import { verifyWorkspaceMember, createMagicLinkToken } from '@/lib/form-auth';
import { sendMagicLinkEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Verify user is in Notion workspace
    const verification = await verifyWorkspaceMember(normalizedEmail);

    if (!verification.isValid) {
      // Don't reveal whether email exists in workspace (security)
      // Still return success to prevent email enumeration
      return NextResponse.json({
        success: true,
        message: 'If your email is registered, you will receive a sign-in link.',
      });
    }

    // Create magic link token
    const token = await createMagicLinkToken(normalizedEmail);

    // Send email
    await sendMagicLinkEmail(normalizedEmail, token);

    return NextResponse.json({
      success: true,
      message: 'If your email is registered, you will receive a sign-in link.',
    });
  } catch (error) {
    console.error('Error in email login:', error);
    return NextResponse.json(
      { error: 'Failed to process login request' },
      { status: 500 }
    );
  }
}
