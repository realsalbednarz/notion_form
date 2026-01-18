import { Client } from '@notionhq/client';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCurrentFormUser } from '@/lib/form-auth';
import { DesignTimeFilter, FilterOperator } from '@/types/form';

// Convert our design-time filter to Notion's filter format
function buildNotionFilter(filters: DesignTimeFilter[]): any {
  if (filters.length === 0) return undefined;

  const notionFilters = filters.map((filter) => {
    const { propertyId, propertyType, operator, value } = filter;

    // Map our operators to Notion's filter conditions
    const condition = mapOperatorToCondition(propertyType, operator, value);
    if (!condition) return null;

    return {
      property: propertyId,
      [propertyType]: condition,
    };
  }).filter(Boolean);

  if (notionFilters.length === 0) return undefined;
  if (notionFilters.length === 1) return notionFilters[0];

  return { and: notionFilters };
}

// Map our operators to Notion's filter conditions based on property type
function mapOperatorToCondition(
  propertyType: string,
  operator: FilterOperator,
  value: any
): any {
  // Handle empty/not empty for all types
  if (operator === 'is_empty') return { is_empty: true };
  if (operator === 'is_not_empty') return { is_not_empty: true };

  // Text-based types (title, rich_text, url, email, phone_number)
  if (['title', 'rich_text', 'url', 'email', 'phone_number'].includes(propertyType)) {
    switch (operator) {
      case 'equals': return { equals: value };
      case 'does_not_equal': return { does_not_equal: value };
      case 'contains': return { contains: value };
      case 'does_not_contain': return { does_not_contain: value };
      case 'starts_with': return { starts_with: value };
      case 'ends_with': return { ends_with: value };
    }
  }

  // Number type
  if (propertyType === 'number') {
    switch (operator) {
      case 'equals': return { equals: Number(value) };
      case 'does_not_equal': return { does_not_equal: Number(value) };
      case 'greater_than': return { greater_than: Number(value) };
      case 'less_than': return { less_than: Number(value) };
      case 'greater_than_or_equal_to': return { greater_than_or_equal_to: Number(value) };
      case 'less_than_or_equal_to': return { less_than_or_equal_to: Number(value) };
    }
  }

  // Select and status
  if (['select', 'status'].includes(propertyType)) {
    switch (operator) {
      case 'equals': return { equals: value };
      case 'does_not_equal': return { does_not_equal: value };
    }
  }

  // Multi-select
  if (propertyType === 'multi_select') {
    switch (operator) {
      case 'contains': return { contains: value };
      case 'does_not_contain': return { does_not_contain: value };
    }
  }

  // Checkbox
  if (propertyType === 'checkbox') {
    return { equals: value === true || value === 'true' };
  }

  // Date
  if (propertyType === 'date') {
    switch (operator) {
      case 'equals': return { equals: value };
      case 'greater_than': return { after: value };
      case 'less_than': return { before: value };
      case 'greater_than_or_equal_to': return { on_or_after: value };
      case 'less_than_or_equal_to': return { on_or_before: value };
    }
  }

  // People
  if (propertyType === 'people') {
    switch (operator) {
      case 'contains': return { contains: value };
      case 'does_not_contain': return { does_not_contain: value };
    }
  }

  return null;
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
      return property.people?.map((p: any) => ({
        id: p.id,
        name: p.name,
        email: p.person?.email,
      })) || [];
    case 'files':
      return property.files?.map((f: any) => ({
        name: f.name,
        url: f.file?.url || f.external?.url,
      })) || [];
    case 'created_time':
      return property.created_time;
    case 'created_by':
      return {
        id: property.created_by?.id,
        name: property.created_by?.name,
      };
    case 'last_edited_time':
      return property.last_edited_time;
    case 'last_edited_by':
      return {
        id: property.last_edited_by?.id,
        name: property.last_edited_by?.name,
      };
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
    default:
      return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Require authentication (admin or form user)
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
    const searchParams = request.nextUrl.searchParams;
    const pageSize = Math.min(parseInt(searchParams.get('page_size') || '20'), 100);
    const startCursor = searchParams.get('start_cursor') || undefined;
    const filtersParam = searchParams.get('filters');

    let filters: DesignTimeFilter[] = [];
    if (filtersParam) {
      try {
        filters = JSON.parse(filtersParam);
      } catch {
        return NextResponse.json(
          { error: 'Invalid filters parameter' },
          { status: 400 }
        );
      }
    }

    const notion = new Client({ auth: notionApiKey });

    const queryParams: any = {
      database_id: params.id,
      page_size: pageSize,
    };

    if (startCursor) {
      queryParams.start_cursor = startCursor;
    }

    const notionFilter = buildNotionFilter(filters);
    if (notionFilter) {
      queryParams.filter = notionFilter;
    }

    const response = await notion.databases.query(queryParams);

    // Also fetch database schema to get property names
    const database = await notion.databases.retrieve({
      database_id: params.id,
    });

    const dbProperties = (database as any).properties;
    const propertyIdToName: Record<string, string> = {};
    const propertyIdToType: Record<string, string> = {};

    Object.entries(dbProperties).forEach(([name, prop]: [string, any]) => {
      propertyIdToName[prop.id] = name;
      propertyIdToType[prop.id] = prop.type;
    });

    const rows = response.results.map((page: any) => {
      const properties: Record<string, { type: string; value: any }> = {};

      Object.entries(page.properties).forEach(([name, prop]: [string, any]) => {
        const propId = prop.id;
        properties[propId] = {
          type: prop.type,
          value: extractPropertyValue(prop),
        };
      });

      return {
        id: page.id,
        url: page.url,
        createdTime: page.created_time,
        lastEditedTime: page.last_edited_time,
        properties,
      };
    });

    return NextResponse.json({
      rows,
      hasMore: response.has_more,
      nextCursor: response.next_cursor,
    });
  } catch (error: any) {
    console.error('Error querying database:', error);

    if (error.code === 'object_not_found') {
      return NextResponse.json(
        { error: 'Database not found' },
        { status: 404 }
      );
    }

    if (error.code === 'validation_error') {
      return NextResponse.json(
        { error: `Filter validation error: ${error.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to query database' },
      { status: 500 }
    );
  }
}
