import { NextResponse } from 'next/server';

// Returns the authentication mode based on environment configuration
// - 'password': Use admin password login (for internal integrations / local dev)
// - 'oauth': Use Notion OAuth (for public integrations / production)
export async function GET() {
  const hasAdminPassword = !!process.env.ADMIN_PASSWORD;
  const hasOAuthConfig = !!(process.env.NOTION_CLIENT_ID && process.env.NOTION_CLIENT_SECRET);

  // Prefer password auth if ADMIN_PASSWORD is set (local dev / internal integration)
  // Otherwise use OAuth if configured
  const mode = hasAdminPassword ? 'password' : hasOAuthConfig ? 'oauth' : 'password';

  return NextResponse.json({ mode });
}
