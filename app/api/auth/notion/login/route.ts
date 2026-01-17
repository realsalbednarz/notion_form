import { NextResponse } from 'next/server';
import { getNotionAuthUrl } from '@/lib/auth';

export async function GET() {
  try {
    // Generate a random state for CSRF protection
    const state = Math.random().toString(36).substring(7);

    const authUrl = getNotionAuthUrl(state);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error initiating OAuth:', error);

    // Redirect to login page with error
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(
      `${appUrl}/login?error=oauth_not_configured`
    );
  }
}
