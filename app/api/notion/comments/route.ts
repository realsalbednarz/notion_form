import { Client } from '@notionhq/client';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCurrentFormUser } from '@/lib/form-auth';

// GET - Fetch comments for a page
export async function GET(request: NextRequest) {
  const adminUser = await getCurrentUser();
  const formUser = await getCurrentFormUser();

  if (!adminUser && !formUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const notionApiKey = process.env.NOTION_API_KEY;
  if (!notionApiKey) {
    return NextResponse.json(
      { error: 'NOTION_API_KEY is not configured' },
      { status: 500 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const pageId = searchParams.get('page_id');

  if (!pageId) {
    return NextResponse.json(
      { error: 'page_id is required' },
      { status: 400 }
    );
  }

  try {
    const notion = new Client({ auth: notionApiKey });

    const response = await notion.comments.list({
      block_id: pageId,
    });

    const comments = response.results.map((comment: any) => ({
      id: comment.id,
      discussionId: comment.discussion_id,
      createdTime: comment.created_time,
      createdBy: {
        id: comment.created_by?.id,
        name: comment.created_by?.name || 'Unknown',
        avatarUrl: comment.created_by?.avatar_url,
      },
      richText: comment.rich_text,
      plainText: comment.rich_text?.map((t: any) => t.plain_text).join('') || '',
    }));

    return NextResponse.json({
      comments,
      count: comments.length,
    });
  } catch (error: any) {
    console.error('Error fetching comments:', error.message);

    if (error.code === 'object_not_found') {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

// POST - Create a new comment on a page
export async function POST(request: NextRequest) {
  const adminUser = await getCurrentUser();
  const formUser = await getCurrentFormUser();

  if (!adminUser && !formUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const notionApiKey = process.env.NOTION_API_KEY;
  if (!notionApiKey) {
    return NextResponse.json(
      { error: 'NOTION_API_KEY is not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { pageId, content, discussionId } = body;

    if (!pageId || !content) {
      return NextResponse.json(
        { error: 'pageId and content are required' },
        { status: 400 }
      );
    }

    const notion = new Client({ auth: notionApiKey });

    const commentData: any = {
      parent: { page_id: pageId },
      rich_text: [
        {
          type: 'text',
          text: { content },
        },
      ],
    };

    // If replying to an existing discussion
    if (discussionId) {
      commentData.discussion_id = discussionId;
    }

    const response = await notion.comments.create(commentData);

    return NextResponse.json({
      success: true,
      comment: {
        id: response.id,
        discussionId: (response as any).discussion_id,
        createdTime: (response as any).created_time,
        plainText: content,
      },
    });
  } catch (error: any) {
    console.error('Error creating comment:', error.message);

    if (error.code === 'object_not_found') {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    if (error.code === 'validation_error') {
      return NextResponse.json(
        { error: error.message || 'Validation error' },
        { status: 400 }
      );
    }

    if (error.code === 'unauthorized' || error.code === 'restricted_resource') {
      return NextResponse.json(
        { error: 'Integration does not have permission to create comments' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}
