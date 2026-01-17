# Implementation Guide

This guide provides step-by-step instructions for implementing the core features of the Notion Form Builder.

## Table of Contents

1. [Notion API Integration](#notion-api-integration)
2. [Authentication Flow](#authentication-flow)
3. [Form Configuration](#form-configuration)
4. [Form Rendering](#form-rendering)
5. [Data Operations](#data-operations)
6. [Advanced Features](#advanced-features)

## Notion API Integration

### Creating a Notion Client Wrapper

Create `lib/notion/client.ts`:

```typescript
import { Client } from '@notionhq/client';

export function createNotionClient(accessToken: string) {
  return new Client({ auth: accessToken });
}

export async function listDatabases(accessToken: string) {
  const notion = createNotionClient(accessToken);
  
  const response = await notion.search({
    filter: {
      value: 'database',
      property: 'object',
    },
  });
  
  return response.results;
}

export async function getDatabaseSchema(accessToken: string, databaseId: string) {
  const notion = createNotionClient(accessToken);
  const database = await notion.databases.retrieve({ database_id: databaseId });
  
  return {
    id: database.id,
    title: database.title[0]?.plain_text || 'Untitled',
    properties: Object.entries(database.properties).map(([key, prop]) => ({
      id: prop.id,
      name: key,
      type: prop.type,
      config: prop,
    })),
  };
}

export async function queryDatabase(
  accessToken: string,
  databaseId: string,
  options: {
    filter?: any;
    sorts?: any[];
    start_cursor?: string;
    page_size?: number;
  } = {}
) {
  const notion = createNotionClient(accessToken);
  
  return await notion.databases.query({
    database_id: databaseId,
    ...options,
  });
}

export async function getPage(accessToken: string, pageId: string) {
  const notion = createNotionClient(accessToken);
  return await notion.pages.retrieve({ page_id: pageId });
}

export async function createPage(
  accessToken: string,
  databaseId: string,
  properties: Record<string, any>
) {
  const notion = createNotionClient(accessToken);
  
  return await notion.pages.create({
    parent: { database_id: databaseId },
    properties: convertToNotionProperties(properties),
  });
}

export async function updatePage(
  accessToken: string,
  pageId: string,
  properties: Record<string, any>
) {
  const notion = createNotionClient(accessToken);
  
  return await notion.pages.update({
    page_id: pageId,
    properties: convertToNotionProperties(properties),
  });
}

// Helper to convert form values to Notion property format
function convertToNotionProperties(properties: Record<string, any>) {
  const notionProperties: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(properties)) {
    // This needs to be expanded based on property type
    if (typeof value === 'string') {
      notionProperties[key] = {
        rich_text: [{ text: { content: value } }],
      };
    } else if (typeof value === 'number') {
      notionProperties[key] = { number: value };
    } else if (value instanceof Date) {
      notionProperties[key] = { date: { start: value.toISOString() } };
    }
    // Add more type conversions as needed
  }
  
  return notionProperties;
}
```

### Property Type Handlers

Create `lib/notion/properties.ts`:

```typescript
export function extractPropertyValue(property: any): any {
  switch (property.type) {
    case 'title':
      return property.title.map((t: any) => t.plain_text).join('');
    
    case 'rich_text':
      return property.rich_text.map((t: any) => t.plain_text).join('');
    
    case 'number':
      return property.number;
    
    case 'select':
      return property.select?.name || null;
    
    case 'multi_select':
      return property.multi_select.map((s: any) => s.name);
    
    case 'date':
      return property.date?.start || null;
    
    case 'people':
      return property.people.map((p: any) => ({
        id: p.id,
        name: p.name,
        avatar_url: p.avatar_url,
      }));
    
    case 'files':
      return property.files.map((f: any) => ({
        name: f.name,
        url: f.file?.url || f.external?.url,
      }));
    
    case 'checkbox':
      return property.checkbox;
    
    case 'url':
      return property.url;
    
    case 'email':
      return property.email;
    
    case 'phone_number':
      return property.phone_number;
    
    case 'relation':
      return property.relation.map((r: any) => r.id);
    
    default:
      return null;
  }
}

export function convertToNotionProperty(type: string, value: any): any {
  switch (type) {
    case 'title':
      return { title: [{ text: { content: String(value) } }] };
    
    case 'rich_text':
      return { rich_text: [{ text: { content: String(value) } }] };
    
    case 'number':
      return { number: Number(value) };
    
    case 'select':
      return { select: { name: String(value) } };
    
    case 'multi_select':
      return { multi_select: Array.isArray(value) ? value.map(v => ({ name: String(v) })) : [] };
    
    case 'date':
      return { date: { start: new Date(value).toISOString() } };
    
    case 'people':
      return { people: Array.isArray(value) ? value.map(id => ({ id })) : [] };
    
    case 'checkbox':
      return { checkbox: Boolean(value) };
    
    case 'url':
      return { url: String(value) };
    
    case 'email':
      return { email: String(value) };
    
    case 'phone_number':
      return { phone_number: String(value) };
    
    default:
      return null;
  }
}
```

## Authentication Flow

### OAuth Implementation

Create `app/api/auth/notion/login/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

export async function GET() {
  const state = randomBytes(16).toString('hex');
  
  // Store state in session/cookie for CSRF protection
  // (Implementation depends on your session strategy)
  
  const params = new URLSearchParams({
    client_id: process.env.NOTION_CLIENT_ID!,
    response_type: 'code',
    owner: 'user',
    redirect_uri: process.env.NOTION_REDIRECT_URI!,
    state,
  });
  
  const authUrl = `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
  
  return NextResponse.redirect(authUrl);
}
```

Create `app/api/auth/notion/callback/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { users, oauthTokens } from '@/lib/db/schema';
import { randomBytes } from 'crypto';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  
  if (!code) {
    return NextResponse.redirect('/login?error=no_code');
  }
  
  // Verify state for CSRF protection
  // (Implementation depends on your session strategy)
  
  // Exchange code for access token
  const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(
        `${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`
      ).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.NOTION_REDIRECT_URI,
    }),
  });
  
  if (!tokenResponse.ok) {
    return NextResponse.redirect('/login?error=token_exchange_failed');
  }
  
  const tokenData = await tokenResponse.json();
  const { access_token, workspace_id, owner } = tokenData;
  
  // Create or update user
  const userId = randomBytes(16).toString('hex');
  
  await db.insert(users).values({
    id: userId,
    notionUserId: owner.user.id,
    email: owner.user.person?.email,
    name: owner.user.name,
    avatarUrl: owner.user.avatar_url,
    workspaceId: workspace_id,
    workspaceName: workspace_id, // You might want to fetch the actual name
  }).onConflictDoUpdate({
    target: users.notionUserId,
    set: {
      email: owner.user.person?.email,
      name: owner.user.name,
      avatarUrl: owner.user.avatar_url,
      updatedAt: new Date(),
    },
  });
  
  // Store access token
  const tokenId = randomBytes(16).toString('hex');
  
  await db.insert(oauthTokens).values({
    id: tokenId,
    userId,
    accessToken: access_token,
    workspaceId: workspace_id,
    tokenType: 'bearer',
  }).onConflictDoUpdate({
    target: [oauthTokens.userId, oauthTokens.workspaceId],
    set: {
      accessToken: access_token,
      updatedAt: new Date(),
    },
  });
  
  // Create session
  // (Implementation depends on your session strategy)
  
  return NextResponse.redirect('/dashboard');
}
```

## Form Configuration

### Form Builder Component

Create `components/forms/FormBuilder/FormBuilder.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { DatabaseSelector } from './DatabaseSelector';
import { FieldSelector } from './FieldSelector';
import { FieldConfigurator } from './FieldConfigurator';
import { FormPreview } from './FormPreview';
import type { FormConfigData, FieldConfig } from '@/types/form';

interface FormBuilderProps {
  onSave: (config: FormConfigData) => Promise<void>;
}

export function FormBuilder({ onSave }: FormBuilderProps) {
  const [step, setStep] = useState<'database' | 'fields' | 'configure' | 'preview'>('database');
  const [config, setConfig] = useState<Partial<FormConfigData>>({
    fields: [],
    filters: [],
    sorts: [],
    pageSize: 20,
    layout: {},
    permissions: {},
  });
  
  const handleDatabaseSelect = (databaseId: string, viewId?: string) => {
    setConfig({ ...config, databaseId, viewId });
    setStep('fields');
  };
  
  const handleFieldsSelect = (fields: FieldConfig[]) => {
    setConfig({ ...config, fields });
    setStep('configure');
  };
  
  const handleFieldsConfigure = (fields: FieldConfig[]) => {
    setConfig({ ...config, fields });
    setStep('preview');
  };
  
  const handleSave = async () => {
    await onSave(config as FormConfigData);
  };
  
  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Progress indicator */}
      <div className="mb-8">
        {/* Implementation */}
      </div>
      
      {step === 'database' && (
        <DatabaseSelector onSelect={handleDatabaseSelect} />
      )}
      
      {step === 'fields' && config.databaseId && (
        <FieldSelector
          databaseId={config.databaseId}
          onSelect={handleFieldsSelect}
        />
      )}
      
      {step === 'configure' && (
        <FieldConfigurator
          fields={config.fields!}
          onChange={handleFieldsConfigure}
        />
      )}
      
      {step === 'preview' && (
        <FormPreview
          config={config as FormConfigData}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
```

## Form Rendering

### Dynamic Form Renderer

Create `components/forms/FormRenderer/FormRenderer.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { FormField } from './FormField';
import { applyDefaultValues, checkStaleData } from '@/lib/utils/form-helpers';
import type { FormConfigData, FormMode } from '@/types/form';

interface FormRendererProps {
  config: FormConfigData;
  mode: FormMode;
  pageId?: string;
  onSubmit: (data: Record<string, any>) => Promise<void>;
}

export function FormRenderer({ config, mode, pageId, onSubmit }: FormRendererProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [originalData, setOriginalData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Load data for edit/view modes
  useEffect(() => {
    if (mode !== 'create' && pageId) {
      loadPageData();
    } else if (mode === 'create') {
      const defaults = applyDefaultValues(config.fields);
      setFormData(defaults);
    }
  }, [mode, pageId]);
  
  async function loadPageData() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/notion/pages/${pageId}`);
      const page = await response.json();
      
      const data = extractFormData(page, config.fields);
      setFormData(data);
      setOriginalData(data);
    } catch (error) {
      console.error('Failed to load page data:', error);
    } finally {
      setIsLoading(false);
    }
  }
  
  function updateField(fieldId: string, value: any) {
    setFormData({ ...formData, [fieldId]: value });
    // Clear error for this field
    if (errors[fieldId]) {
      const newErrors = { ...errors };
      delete newErrors[fieldId];
      setErrors(newErrors);
    }
  }
  
  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};
    
    for (const field of config.fields) {
      if (field.required && !formData[field.notionPropertyId]) {
        newErrors[field.notionPropertyId] = `${field.label} is required`;
      }
      
      if (field.validation) {
        const value = formData[field.notionPropertyId];
        
        if (field.validation.min && value < field.validation.min) {
          newErrors[field.notionPropertyId] = 
            field.validation.message || `Value must be at least ${field.validation.min}`;
        }
        
        if (field.validation.max && value > field.validation.max) {
          newErrors[field.notionPropertyId] = 
            field.validation.message || `Value must be at most ${field.validation.max}`;
        }
        
        if (field.validation.pattern && !new RegExp(field.validation.pattern).test(value)) {
          newErrors[field.notionPropertyId] = 
            field.validation.message || 'Invalid format';
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (mode === 'edit' && pageId) {
        // Check for stale data
        const { isStale } = await checkStaleData(pageId, originalData);
        
        if (isStale) {
          const confirmed = window.confirm(
            'This record has been modified by someone else. Do you want to overwrite their changes?'
          );
          if (!confirmed) {
            setIsLoading(false);
            return;
          }
        }
      }
      
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission failed:', error);
      alert('Failed to submit form. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {config.fields
        .filter(field => field.visible)
        .map(field => (
          <FormField
            key={field.notionPropertyId}
            field={field}
            value={formData[field.notionPropertyId]}
            onChange={(value) => updateField(field.notionPropertyId, value)}
            error={errors[field.notionPropertyId]}
            readOnly={mode === 'view' || !field.editable}
          />
        ))}
      
      {mode !== 'view' && (
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {mode === 'create' ? 'Create' : 'Update'}
          </button>
        </div>
      )}
    </form>
  );
}

function extractFormData(page: any, fields: FieldConfig[]): Record<string, any> {
  const data: Record<string, any> = {};
  
  for (const field of fields) {
    const property = page.properties[field.label];
    if (property) {
      data[field.notionPropertyId] = extractPropertyValue(property);
    }
  }
  
  return data;
}
```

### Field Component

Create `components/forms/FormRenderer/FormField.tsx`:

```typescript
'use client';

import { TextInput } from './FieldTypes/TextInput';
import { NumberInput } from './FieldTypes/NumberInput';
import { DateInput } from './FieldTypes/DateInput';
import { SelectInput } from './FieldTypes/SelectInput';
import { PersonSelect } from './FieldTypes/PersonSelect';
import { CheckboxInput } from './FieldTypes/CheckboxInput';
import type { FieldConfig } from '@/types/form';

interface FormFieldProps {
  field: FieldConfig;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  readOnly?: boolean;
}

export function FormField({ field, value, onChange, error, readOnly }: FormFieldProps) {
  const commonProps = {
    value,
    onChange,
    readOnly,
    placeholder: field.placeholder,
    required: field.required,
  };
  
  let input;
  
  switch (field.notionPropertyType) {
    case 'title':
    case 'rich_text':
    case 'email':
    case 'phone_number':
    case 'url':
      input = <TextInput {...commonProps} type={field.notionPropertyType} />;
      break;
    
    case 'number':
      input = <NumberInput {...commonProps} />;
      break;
    
    case 'date':
      input = <DateInput {...commonProps} />;
      break;
    
    case 'select':
    case 'multi_select':
      input = <SelectInput {...commonProps} multiple={field.notionPropertyType === 'multi_select'} />;
      break;
    
    case 'people':
      input = <PersonSelect {...commonProps} />;
      break;
    
    case 'checkbox':
      input = <CheckboxInput {...commonProps} />;
      break;
    
    default:
      input = <TextInput {...commonProps} type="text" />;
  }
  
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {field.helpText && (
        <p className="text-sm text-gray-500 mb-2">{field.helpText}</p>
      )}
      
      {input}
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
```

## Data Operations

### API Route for Creating Pages

Create `app/api/notion/pages/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createPage } from '@/lib/notion/client';
import { getAccessToken } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { database_id, properties } = body;
    
    const page = await createPage(accessToken, database_id, properties);
    
    return NextResponse.json(page);
  } catch (error) {
    console.error('Failed to create page:', error);
    return NextResponse.json(
      { error: 'Failed to create page' },
      { status: 500 }
    );
  }
}
```

### API Route for Updating Pages

Create `app/api/notion/pages/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getPage, updatePage } from '@/lib/notion/client';
import { getAccessToken } from '@/lib/auth/session';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const page = await getPage(accessToken, params.id);
    return NextResponse.json(page);
  } catch (error) {
    console.error('Failed to get page:', error);
    return NextResponse.json(
      { error: 'Failed to get page' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { properties } = body;
    
    const page = await updatePage(accessToken, params.id, properties);
    
    return NextResponse.json(page);
  } catch (error) {
    console.error('Failed to update page:', error);
    return NextResponse.json(
      { error: 'Failed to update page' },
      { status: 500 }
    );
  }
}
```

## Advanced Features

### Default Values Implementation

Create `lib/utils/defaults.ts`:

```typescript
import type { FieldConfig } from '@/types/form';

export function applyDefaultValues(fields: FieldConfig[]): Record<string, any> {
  const defaults: Record<string, any> = {};
  
  for (const field of fields) {
    if (!field.defaultValue) continue;
    
    switch (field.defaultValue.type) {
      case 'static':
        defaults[field.notionPropertyId] = field.defaultValue.value;
        break;
      
      case 'function':
        defaults[field.notionPropertyId] = evaluateDefaultFunction(
          field.defaultValue.name,
          field.notionPropertyType
        );
        break;
      
      case 'formula':
        // Future: implement formula evaluation
        break;
    }
  }
  
  return defaults;
}

function evaluateDefaultFunction(name: string, propertyType: string): any {
  switch (name) {
    case 'today':
      return new Date().toISOString().split('T')[0];
    
    case 'now':
      return new Date().toISOString();
    
    case 'current_user':
      // This should be fetched from session
      // For now, return a placeholder
      return null;
    
    default:
      return null;
  }
}

export function getCurrentUser() {
  // Implement based on your auth strategy
  return {
    id: 'user-id',
    name: 'Current User',
  };
}
```

### Stale Data Detection

Create `lib/utils/stale-data.ts`:

```typescript
export async function checkStaleData(
  pageId: string,
  originalData: any
): Promise<{ isStale: boolean; currentData?: any }> {
  try {
    const response = await fetch(`/api/notion/pages/${pageId}`);
    const currentData = await response.json();
    
    const isStale = 
      currentData.last_edited_time !== originalData.last_edited_time;
    
    return { isStale, currentData };
  } catch (error) {
    console.error('Failed to check stale data:', error);
    return { isStale: false };
  }
}
```

### Relation Display

Create `components/forms/FormRenderer/FieldTypes/RelationDisplay.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';

interface RelationDisplayProps {
  relationIds: string[];
  relationPath?: string[];
  maxDisplay?: number;
}

export function RelationDisplay({ 
  relationIds, 
  relationPath,
  maxDisplay = 10 
}: RelationDisplayProps) {
  const [relatedData, setRelatedData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    loadRelatedData();
  }, [relationIds]);
  
  async function loadRelatedData() {
    setIsLoading(true);
    try {
      const data = await Promise.all(
        relationIds.slice(0, maxDisplay).map(async (id) => {
          const response = await fetch(`/api/notion/pages/${id}`);
          const page = await response.json();
          
          if (relationPath && relationPath.length > 0) {
            return traverseRelation(page, relationPath);
          }
          
          return extractTitle(page);
        })
      );
      
      setRelatedData(data);
    } catch (error) {
      console.error('Failed to load related data:', error);
    } finally {
      setIsLoading(false);
    }
  }
  
  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading...</div>;
  }
  
  return (
    <div className="space-y-1">
      {relatedData.map((data, idx) => (
        <div key={idx} className="text-sm text-gray-700">
          {String(data)}
        </div>
      ))}
      {relationIds.length > maxDisplay && (
        <div className="text-xs text-gray-500">
          + {relationIds.length - maxDisplay} more
        </div>
      )}
    </div>
  );
}

function extractTitle(page: any): string {
  const titleProp = Object.values(page.properties).find(
    (prop: any) => prop.type === 'title'
  );
  
  if (titleProp && titleProp.title && titleProp.title.length > 0) {
    return titleProp.title[0].plain_text;
  }
  
  return 'Untitled';
}

async function traverseRelation(page: any, path: string[]): Promise<any> {
  let current = page;
  
  for (const propertyName of path) {
    const property = current.properties[propertyName];
    
    if (property.type === 'relation' && property.relation.length > 0) {
      const response = await fetch(`/api/notion/pages/${property.relation[0].id}`);
      current = await response.json();
    } else {
      return extractPropertyValue(property);
    }
  }
  
  return extractTitle(current);
}
```

## Testing

### Example Test for Form Validation

```typescript
import { describe, it, expect } from 'vitest';
import { applyDefaultValues } from '@/lib/utils/defaults';
import type { FieldConfig } from '@/types/form';

describe('Default Values', () => {
  it('should apply static default values', () => {
    const fields: FieldConfig[] = [
      {
        notionPropertyId: 'prop1',
        notionPropertyType: 'rich_text',
        label: 'Name',
        required: false,
        editable: true,
        visible: true,
        defaultValue: {
          type: 'static',
          value: 'Default Name',
        },
      },
    ];
    
    const defaults = applyDefaultValues(fields);
    expect(defaults.prop1).toBe('Default Name');
  });
  
  it('should apply today function', () => {
    const fields: FieldConfig[] = [
      {
        notionPropertyId: 'prop1',
        notionPropertyType: 'date',
        label: 'Date',
        required: false,
        editable: true,
        visible: true,
        defaultValue: {
          type: 'function',
          name: 'today',
        },
      },
    ];
    
    const defaults = applyDefaultValues(fields);
    const today = new Date().toISOString().split('T')[0];
    expect(defaults.prop1).toBe(today);
  });
});
```

This implementation guide provides the foundation for building the Notion Form Builder. Each section can be expanded with more detailed implementations as you progress through development.
