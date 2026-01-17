import { Client } from '@notionhq/client';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const notionApiKey = process.env.NOTION_API_KEY;

  if (!notionApiKey) {
    return NextResponse.json(
      { error: 'NOTION_API_KEY is not configured' },
      { status: 500 }
    );
  }

  try {
    const notion = new Client({ auth: notionApiKey });

    const database = await notion.databases.retrieve({
      database_id: params.id,
    });

    const db = database as any;

    const properties = Object.entries(db.properties).map(([name, prop]: [string, any]) => ({
      id: prop.id,
      name,
      type: prop.type,
      ...(prop.type === 'select' && { options: prop.select?.options }),
      ...(prop.type === 'multi_select' && { options: prop.multi_select?.options }),
      ...(prop.type === 'relation' && { relation: prop.relation }),
      ...(prop.type === 'rollup' && { rollup: prop.rollup }),
      ...(prop.type === 'formula' && { formula: prop.formula }),
      ...(prop.type === 'number' && { format: prop.number?.format }),
    }));

    return NextResponse.json({
      id: db.id,
      title: db.title?.[0]?.plain_text || 'Untitled',
      url: db.url,
      properties,
    });
  } catch (error: any) {
    console.error('Error fetching database:', error);

    if (error.code === 'object_not_found') {
      return NextResponse.json(
        { error: 'Database not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch database from Notion' },
      { status: 500 }
    );
  }
}
