import { NextRequest, NextResponse } from 'next/server';
import {
  verifyMagicLinkToken,
  verifyWorkspaceMember,
  createOrUpdateFormUser,
  setFormUserSessionCookie,
} from '@/lib/form-auth';

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(`${appUrl}/forms/login?error=missing_token`);
  }

  try {
    // Verify the magic link token
    const email = await verifyMagicLinkToken(token);

    if (!email) {
      return NextResponse.redirect(`${appUrl}/forms/login?error=invalid_token`);
    }

    // Re-verify workspace membership (token could be old)
    const verification = await verifyWorkspaceMember(email);

    if (!verification.isValid) {
      return NextResponse.redirect(`${appUrl}/forms/login?error=not_workspace_member`);
    }

    // Create or update form user
    const formUser = await createOrUpdateFormUser(
      email,
      verification.notionUserId,
      verification.name,
      verification.avatarUrl
    );

    // Set session cookie
    await setFormUserSessionCookie(formUser.id, email);

    // Redirect to forms page (or back to the form they were trying to access)
    const returnTo = searchParams.get('returnTo') || '/forms';
    return NextResponse.redirect(`${appUrl}${returnTo}`);
  } catch (error) {
    console.error('Error verifying magic link:', error);
    return NextResponse.redirect(`${appUrl}/forms/login?error=verification_failed`);
  }
}
