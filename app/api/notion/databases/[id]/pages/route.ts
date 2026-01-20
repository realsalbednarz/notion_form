import { Client } from '@notionhq/client';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCurrentFormUser } from '@/lib/form-auth';

// GET /api/notion/databases/[id]/pages - Fetch pages for relation picker
// Returns simplified page list with ID and title for use in relation selectors
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Allow both admin users and form users to fetch related pages
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

  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get('search') || '';
  const pageSize = Math.min(parseInt(searchParams.get('page_size') || '50'), 100);

  try {
    const notion = new Client({ auth: notionApiKey });

    // Query the database to get pages
    const queryParams: any = {
      database_id: params.id,
      page_size: pageSize,
    };

    // If search term provided, we'll filter client-side since Notion doesn't support text search
    // For better performance, you could use filter if you know the title property name

    const response = await notion.databases.query(queryParams);

    // Extract page ID and title from each result
    const pages = response.results.map((page: any) => {
      // Find the title property
      let title = 'Untitled';

      if (page.properties) {
        for (const [propName, prop] of Object.entries(page.properties)) {
          const propData = prop as any;
          if (propData.type === 'title' && propData.title?.length > 0) {
            title = propData.title.map((t: any) => t.plain_text).join('');
            break;
          }
        }
      }

      return {
        id: page.id,
        title,
      };
    });

    // Filter by search term if provided (case-insensitive)
    const filteredPages = search
      ? pages.filter(p => p.title.toLowerCase().includes(search.toLowerCase()))
      : pages;

    return NextResponse.json({
      pages: filteredPages,
      hasMore: response.has_more,
    });
  } catch (error: any) {
    console.error('Error fetching database pages:', error);

    if (error.code === 'object_not_found') {
      return NextResponse.json(
        { error: 'Database not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch pages from Notion' },
      { status: 500 }
    );
  }
}
