import { Client } from '@notionhq/client';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCurrentFormUser } from '@/lib/form-auth';

interface FieldUpdate {
  propertyId: string;
  propertyType: string;
  value: any;
}

// Convert form field values to Notion property format (same as in pages/route.ts)
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
      const pageIds = Array.isArray(value)
        ? value
        : String(value).split(',').map(id => id.trim()).filter(Boolean);
      return {
        relation: pageIds.map((id: string) => ({ id })),
      };

    case 'people':
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
      return {
        rich_text: [{ text: { content: String(value) } }],
      };
  }
}

// Extract displayable value from Notion property
function extractPropertyValue(property: any): any {
  if (!property) return null;

  switch (property.type) {
    case 'title':
      return property.title?.map((t: any) => t.plain_text).join('') || '';
    case 'rich_text':
      return property.rich_text?.map((t: any) => t.plain_text).join('') || '';
    case 'number':
      return property.number;
    case 'select':
      return property.select?.name || null;
    case 'multi_select':
      return property.multi_select?.map((s: any) => s.name) || [];
    case 'date':
      return property.date?.start || null;
    case 'checkbox':
      return property.checkbox;
    case 'url':
      return property.url;
    case 'email':
      return property.email;
    case 'phone_number':
      return property.phone_number;
    case 'status':
      return property.status?.name || null;
    case 'people':
      return property.people?.map((p: any) => p.id) || [];
    case 'files':
      return property.files?.map((f: any) => ({
        name: f.name,
        url: f.file?.url || f.external?.url,
      })) || [];
    case 'created_time':
      return property.created_time;
    case 'created_by':
      return property.created_by?.id;
    case 'last_edited_time':
      return property.last_edited_time;
    case 'last_edited_by':
      return property.last_edited_by?.id;
    case 'formula':
      const formula = property.formula;
      return formula?.[formula.type] ?? null;
    case 'rollup':
      const rollup = property.rollup;
      if (rollup?.type === 'array') {
        return rollup.array?.map((item: any) => extractPropertyValue(item)) || [];
      }
      return rollup?.[rollup.type] ?? null;
    case 'relation':
      return property.relation?.map((r: any) => r.id) || [];
    case 'unique_id':
      // Return the unique_id object with prefix and number
      if (property.unique_id) {
        return {
          prefix: property.unique_id.prefix || '',
          number: property.unique_id.number,
        };
      }
      return null;
    default:
      return null;
  }
}

// GET - Fetch a single page for editing
export async function GET(
  request: NextRequest,
  { params }: { params: { pageId: string } }
) {
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

    const page = await notion.pages.retrieve({
      page_id: params.pageId,
    });

    const pageData = page as any;

    // Extract property values
    const properties: Record<string, { type: string; value: any }> = {};

    Object.entries(pageData.properties).forEach(([name, prop]: [string, any]) => {
      properties[prop.id] = {
        type: prop.type,
        value: extractPropertyValue(prop),
      };
    });

    return NextResponse.json({
      id: pageData.id,
      url: pageData.url,
      createdTime: pageData.created_time,
      lastEditedTime: pageData.last_edited_time,
      properties,
    });
  } catch (error: any) {
    console.error('Error fetching page:', error);

    if (error.code === 'object_not_found') {
      return NextResponse.json(
        { error: 'Page not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch page' },
      { status: 500 }
    );
  }
}

// PATCH - Update an existing page
export async function PATCH(
  request: NextRequest,
  { params }: { params: { pageId: string } }
) {
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
    const body = await request.json();
    const { fields } = body as { fields: FieldUpdate[] };

    if (!fields || !Array.isArray(fields)) {
      return NextResponse.json(
        { error: 'fields array is required' },
        { status: 400 }
      );
    }

    const notion = new Client({ auth: notionApiKey });

    // First, get the page to find the database and property names
    const existingPage = await notion.pages.retrieve({
      page_id: params.pageId,
    });

    const pageData = existingPage as any;

    // Build a map from property ID to property name
    const propIdToName: Record<string, string> = {};
    Object.entries(pageData.properties).forEach(([name, prop]: [string, any]) => {
      propIdToName[prop.id] = name;
    });

    // Build properties object for update
    const properties: Record<string, any> = {};

    for (const field of fields) {
      const propName = propIdToName[field.propertyId];

      if (!propName) {
        console.warn(`Property with ID ${field.propertyId} not found on page`);
        continue;
      }

      const notionValue = convertToNotionProperty(field.propertyType, field.value);

      if (notionValue !== undefined) {
        properties[propName] = notionValue;
      }
    }

    // Update the page
    const updatedPage = await notion.pages.update({
      page_id: params.pageId,
      properties,
    });

    return NextResponse.json({
      success: true,
      pageId: updatedPage.id,
      url: (updatedPage as any).url,
    });
  } catch (error: any) {
    console.error('Error updating page:', error);

    if (error.code === 'validation_error') {
      return NextResponse.json(
        { error: `Validation error: ${error.message}` },
        { status: 400 }
      );
    }

    if (error.code === 'object_not_found') {
      return NextResponse.json(
        { error: 'Page not found' },
        { status: 404 }
      );
    }

    if (error.status === 403) {
      return NextResponse.json(
        { error: 'You do not have permission to edit this page' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update page' },
      { status: 500 }
    );
  }
}
