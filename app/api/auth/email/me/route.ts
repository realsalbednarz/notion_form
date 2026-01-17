import { NextResponse } from 'next/server';
import { getCurrentFormUser } from '@/lib/form-auth';

export async function GET() {
  const formUser = await getCurrentFormUser();

  if (!formUser) {
    return NextResponse.json(null, { status: 401 });
  }

  return NextResponse.json({
    id: formUser.id,
    email: formUser.email,
    name: formUser.name,
    avatarUrl: formUser.avatarUrl,
  });
}
