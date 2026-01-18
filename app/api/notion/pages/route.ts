import { Client } from '@notionhq/client';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCurrentFormUser } from '@/lib/form-auth';

interface FieldSubmission {
  propertyId: string;
  propertyType: string;
  value: any;
}

interface CreatePageRequest {
  databaseId: string;
  fields: FieldSubmission[];
}

// Convert form field values to Notion property format
function convertToNotionProperty(type: string, value: any): any {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  switch (type) {
    case 'title':
      return {
        title: [{ text: { content: String(value) } }],
      };

    case 'rich_text':
      return {
        rich_text: [{ text: { content: String(value) } }],
      };

    case 'number':
      return {
        number: Number(value),
      };

    case 'checkbox':
      return {
        checkbox: Boolean(value),
      };

    case 'select':
      return {
        select: { name: String(value) },
      };

    case 'multi_select':
      const values = Array.isArray(value) ? value : [value];
      return {
        multi_select: values.map((v: string) => ({ name: v })),
      };

    case 'date':
      return {
        date: { start: String(value) },
      };

    case 'url':
      return {
        url: String(value),
      };

    case 'email':
      return {
        email: String(value),
      };

    case 'phone_number':
      return {
        phone_number: String(value),
      };

    case 'status':
      return {
        status: { name: String(value) },
      };

    case 'relation':
      // Expect comma-separated page IDs
      const pageIds = Array.isArray(value)
        ? value
        : String(value).split(',').map(id => id.trim()).filter(Boolean);
      return {
        relation: pageIds.map((id: string) => ({ id })),
      };

    case 'people':
      // Expect a user ID or array of user IDs
      const userIds = Array.isArray(value)
        ? value
        : [value].filter(Boolean);
      return {
        people: userIds.map((id: string) => ({ object: 'user', id })),
      };

    // Read-only types - skip
    case 'formula':
    case 'rollup':
    case 'created_time':
    case 'created_by':
    case 'last_edited_time':
    case 'last_edited_by':
    case 'unique_id':
      return undefined;

    default:
      // For unknown types, try as rich_text
      return {
        rich_text: [{ text: { content: String(value) } }],
      };
  }
}

export async function POST(request: NextRequest) {
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
    const body: CreatePageRequest = await request.json();
    const { databaseId, fields } = body;

    if (!databaseId) {
      return NextResponse.json(
        { error: 'databaseId is required' },
        { status: 400 }
      );
    }

    if (!fields || !Array.isArray(fields)) {
      return NextResponse.json(
        { error: 'fields array is required' },
        { status: 400 }
      );
    }

    const notion = new Client({ auth: notionApiKey });

    // First, get the database schema to map property IDs to names
    const database = await notion.databases.retrieve({
      database_id: databaseId,
    });

    const dbProperties = (database as any).properties;

    // Build properties object for page creation
    const properties: Record<string, any> = {};

    for (const field of fields) {
      // Find the property name by ID
      const propEntry = Object.entries(dbProperties).find(
        ([_, prop]: [string, any]) => prop.id === field.propertyId
      );

      if (!propEntry) {
        console.warn(`Property with ID ${field.propertyId} not found in database`);
        continue;
      }

      const [propName, _] = propEntry;
      const notionValue = convertToNotionProperty(field.propertyType, field.value);

      if (notionValue !== undefined) {
        properties[propName] = notionValue;
      }
    }

    // Create the page
    const page = await notion.pages.create({
      parent: { database_id: databaseId },
      properties,
    });

    return NextResponse.json({
      success: true,
      pageId: page.id,
      url: (page as any).url,
    });
  } catch (error: any) {
    console.error('Error creating page:', error);

    if (error.code === 'validation_error') {
      return NextResponse.json(
        { error: `Validation error: ${error.message}` },
        { status: 400 }
      );
    }

    if (error.code === 'object_not_found') {
      return NextResponse.json(
        { error: 'Database not found or not accessible' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create page in Notion' },
      { status: 500 }
    );
  }
}
