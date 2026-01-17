import { Client } from '@notionhq/client';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  // Require authentication
  const user = await getCurrentUser();
  if (!user) {
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

    const response = await notion.search({
      filter: {
        value: 'database',
        property: 'object',
      },
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time',
      },
    });

    const databases = response.results.map((db: any) => ({
      id: db.id,
      title: db.title?.[0]?.plain_text || 'Untitled',
      url: db.url,
      lastEditedTime: db.last_edited_time,
    }));

    return NextResponse.json({ databases });
  } catch (error) {
    console.error('Error fetching databases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch databases from Notion' },
      { status: 500 }
    );
  }
}
