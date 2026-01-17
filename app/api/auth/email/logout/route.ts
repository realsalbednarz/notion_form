import { NextResponse } from 'next/server';
import { clearFormUserSessionCookie } from '@/lib/form-auth';

export async function POST() {
  await clearFormUserSessionCookie();

  return NextResponse.json({ success: true });
}
