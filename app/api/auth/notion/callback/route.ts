import { NextRequest, NextResponse } from 'next/server';
import {
  exchangeCodeForToken,
  createOrUpdateUser,
  setSessionCookie,
} from '@/lib/auth';

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    console.error('OAuth error:', error);
    return NextResponse.redirect(`${appUrl}/login?error=${error}`);
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}/login?error=no_code`);
  }

  try {
    // Exchange code for token
    const tokenData = await exchangeCodeForToken(code);

    // Create or update user
    const user = await createOrUpdateUser(tokenData);

    // Set session cookie
    await setSessionCookie(user.id);

    // Redirect to dashboard
    return NextResponse.redirect(`${appUrl}/databases`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      `${appUrl}/login?error=auth_failed&message=${encodeURIComponent(
        error instanceof Error ? error.message : 'Unknown error'
      )}`
    );
  }
}
