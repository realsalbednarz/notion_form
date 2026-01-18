import { Client } from '@notionhq/client';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCurrentFormUser } from '@/lib/form-auth';

export async function GET() {
  // Require authentication (either admin user or form user)
  const adminUser = await getCurrentUser();
  const formUser = await getCurrentFormUser();

  if (!adminUser && !formUser) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const notionApiKey = process.env.NOTION_API_KEY;

  if (!notionApiKey) {
    return NextResponse.json(
      { error: 'NOTION_API_KEY is not configured' },
      { status: 500 }
    );
  }

  try {
    const notion = new Client({ auth: notionApiKey });

    // Fetch all users from the workspace
    const response = await notion.users.list({});

    const users = response.results
      .filter((user: any) => user.type === 'person')
      .map((user: any) => ({
        id: user.id,
        name: user.name || 'Unknown',
        email: user.person?.email || null,
        avatarUrl: user.avatar_url || null,
      }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users from Notion' },
      { status: 500 }
    );
  }
}
