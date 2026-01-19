import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db/client-postgres';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      return NextResponse.json(
        { error: 'Admin login not configured' },
        { status: 500 }
      );
    }

    if (password !== adminPassword) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Find or create admin user
    let adminUser = await db.query.users.findFirst({
      where: eq(users.email, 'admin@local'),
    });

    if (!adminUser) {
      const [newUser] = await db.insert(users)
        .values({
          notionUserId: 'admin-local',
          email: 'admin@local',
          name: 'Admin',
          workspaceId: 'local',
          workspaceName: 'Local Workspace',
        })
        .returning();
      adminUser = newUser;
    }

    // Create session
    const token = await createSession(adminUser.id);

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('notion_form_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
