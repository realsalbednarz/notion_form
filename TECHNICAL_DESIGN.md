# Notion Form Builder - Technical Design Document

## Architecture Overview

### Tech Stack
- **Frontend Framework**: Next.js 14 (App Router)
- **UI Components**: React + Tailwind CSS
- **Database**: SQLite (development) → PostgreSQL (production)
- **ORM**: Drizzle ORM
- **Authentication**: Notion OAuth 2.0
- **Deployment**: Vercel
- **State Management**: React Server Components + React Query

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Browser                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         Next.js Frontend (React)                     │   │
│  │  - Form Builder UI                                   │   │
│  │  - Form Renderer (Create/Edit/View modes)           │   │
│  │  - Configuration Interface                           │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTP/REST
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   Next.js API Routes                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Auth       │  │   Forms      │  │   Notion     │      │
│  │   Routes     │  │   API        │  │   Proxy      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────┬───────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   App DB     │  │   Notion     │  │   Session    │
│  (SQLite/    │  │   API        │  │   Store      │
│   Postgres)  │  │              │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

## Database Schema

### App Database (SQLite/PostgreSQL)

```sql
-- Users table
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    notion_user_id TEXT UNIQUE NOT NULL,
    email TEXT,
    name TEXT,
    avatar_url TEXT,
    workspace_id TEXT NOT NULL,
    workspace_name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OAuth tokens table
CREATE TABLE oauth_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    token_type TEXT DEFAULT 'bearer',
    workspace_id TEXT NOT NULL,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, workspace_id)
);

-- Form configurations table
CREATE TABLE form_configs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    database_id TEXT NOT NULL,
    view_id TEXT,
    mode TEXT NOT NULL CHECK(mode IN ('create', 'edit', 'view')),
    config JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_form_configs_user ON form_configs(user_id);
CREATE INDEX idx_form_configs_database ON form_configs(database_id);

-- Form submissions tracking (optional, for analytics)
CREATE TABLE form_submissions (
    id TEXT PRIMARY KEY,
    form_config_id TEXT NOT NULL REFERENCES form_configs(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    notion_page_id TEXT NOT NULL,
    mode TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_submissions_form ON form_submissions(form_config_id);
CREATE INDEX idx_submissions_user ON form_submissions(user_id);
```

### Form Config JSON Schema

```typescript
interface FormConfig {
  // Database configuration
  databaseId: string;
  viewId?: string;
  
  // Fields configuration
  fields: FieldConfig[];
  
  // Filtering and sorting
  filters: NotionFilter[];
  sorts: NotionSort[];
  
  // Pagination
  pageSize: number;
  
  // Display configuration
  layout: {
    showTitle: boolean;
    titleTemplate?: string;
    columns?: number;
  };
  
  // Permissions
  permissions: {
    allowCreate: boolean;
    allowEdit: boolean;
    allowDelete: boolean;
  };
}

interface FieldConfig {
  // Notion field reference
  notionPropertyId: string;
  notionPropertyType: string;
  
  // Display configuration
  label: string;
  placeholder?: string;
  helpText?: string;
  
  // Behavior
  required: boolean;
  editable: boolean;
  visible: boolean;
  
  // Default values
  defaultValue?: DefaultValue;
  
  // Relation traversal (for displaying related data)
  relationPath?: string[]; // e.g., ['Project', 'Client', 'Name']
  
  // Validation
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

type DefaultValue = 
  | { type: 'static', value: any }
  | { type: 'function', name: 'today' | 'current_user' | 'now' }
  | { type: 'formula', expression: string };

interface NotionFilter {
  property: string;
  type: string;
  condition: any;
}

interface NotionSort {
  property: string;
  direction: 'ascending' | 'descending';
}
```

## API Design

### Authentication Endpoints

```
POST   /api/auth/notion/login
  → Initiates Notion OAuth flow
  → Returns: redirect URL

GET    /api/auth/notion/callback
  → Handles OAuth callback
  → Exchanges code for access token
  → Creates/updates user and token in database
  → Returns: redirect to dashboard

GET    /api/auth/me
  → Returns current user info
  → Returns: User object

POST   /api/auth/logout
  → Clears session
  → Returns: success
```

### Form Configuration Endpoints

```
GET    /api/forms
  → List all forms for current user
  → Query params: ?page=1&limit=20
  → Returns: { forms: FormConfig[], total: number }

POST   /api/forms
  → Create new form configuration
  → Body: FormConfig
  → Returns: FormConfig with id

GET    /api/forms/:id
  → Get form configuration
  → Returns: FormConfig

PUT    /api/forms/:id
  → Update form configuration
  → Body: Partial<FormConfig>
  → Returns: FormConfig

DELETE /api/forms/:id
  → Delete form configuration
  → Returns: success
```

### Notion Proxy Endpoints

```
GET    /api/notion/databases
  → List accessible databases
  → Returns: Database[]

GET    /api/notion/databases/:id
  → Get database schema
  → Returns: DatabaseSchema with properties

GET    /api/notion/databases/:id/views
  → Get database views
  → Returns: View[]

GET    /api/notion/databases/:id/query
  → Query database with filters/sorts
  → Query params: filters, sorts, cursor, page_size
  → Returns: { results: Page[], next_cursor?: string }

GET    /api/notion/pages/:id
  → Get single page
  → Returns: Page

POST   /api/notion/pages
  → Create new page
  → Body: { database_id, properties }
  → Returns: Page

PATCH  /api/notion/pages/:id
  → Update page
  → Body: { properties }
  → Returns: Page

GET    /api/notion/users
  → List workspace users
  → Returns: User[]
```

## Frontend Components Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── callback/
│   ├── (dashboard)/
│   │   ├── forms/
│   │   │   ├── page.tsx                 # Forms list
│   │   │   ├── new/
│   │   │   │   └── page.tsx             # Form builder
│   │   │   └── [id]/
│   │   │       ├── edit/
│   │   │       │   └── page.tsx         # Edit configuration
│   │   │       └── live/
│   │   │           └── page.tsx         # Live form
│   │   └── layout.tsx
│   ├── api/
│   │   ├── auth/
│   │   ├── forms/
│   │   └── notion/
│   └── layout.tsx
├── components/
│   ├── forms/
│   │   ├── FormBuilder/
│   │   │   ├── DatabaseSelector.tsx
│   │   │   ├── ViewSelector.tsx
│   │   │   ├── FieldConfigurator.tsx
│   │   │   ├── FilterBuilder.tsx
│   │   │   └── SortBuilder.tsx
│   │   ├── FormRenderer/
│   │   │   ├── FormContainer.tsx
│   │   │   ├── FormField.tsx
│   │   │   ├── FieldTypes/
│   │   │   │   ├── TextInput.tsx
│   │   │   │   ├── NumberInput.tsx
│   │   │   │   ├── DateInput.tsx
│   │   │   │   ├── SelectInput.tsx
│   │   │   │   ├── PersonSelect.tsx
│   │   │   │   ├── RelationDisplay.tsx
│   │   │   │   └── ...
│   │   │   └── FormActions.tsx
│   │   └── DataTable/
│   │       ├── DataTable.tsx
│   │       ├── TableRow.tsx
│   │       ├── Pagination.tsx
│   │       └── SearchBar.tsx
│   ├── ui/
│   │   └── ... (shadcn/ui components)
│   └── layout/
│       ├── Header.tsx
│       └── Sidebar.tsx
├── lib/
│   ├── notion/
│   │   ├── client.ts                    # Notion API wrapper
│   │   ├── types.ts
│   │   └── utils.ts
│   ├── db/
│   │   ├── schema.ts                    # Drizzle schema
│   │   ├── client.ts
│   │   └── queries.ts
│   ├── auth/
│   │   ├── session.ts
│   │   └── oauth.ts
│   └── utils/
│       ├── defaults.ts                  # Default value handlers
│       └── validation.ts
└── types/
    ├── form.ts
    ├── notion.ts
    └── database.ts
```

## Key Implementation Details

### 1. Notion OAuth Flow

```typescript
// /api/auth/notion/login
export async function GET() {
  const state = generateState();
  const authUrl = `https://api.notion.com/v1/oauth/authorize?` +
    `client_id=${process.env.NOTION_CLIENT_ID}&` +
    `response_type=code&` +
    `owner=user&` +
    `redirect_uri=${encodeURIComponent(process.env.NOTION_REDIRECT_URI)}&` +
    `state=${state}`;
  
  // Store state in session for CSRF protection
  return NextResponse.redirect(authUrl);
}

// /api/auth/notion/callback
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  
  // Exchange code for token
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
  
  const { access_token, workspace_id, owner } = await tokenResponse.json();
  
  // Store in database
  await storeUserAndToken(owner, access_token, workspace_id);
  
  return NextResponse.redirect('/dashboard');
}
```

### 2. Form Rendering Logic

```typescript
// FormRenderer component
export function FormRenderer({ 
  formConfig, 
  mode, 
  pageId 
}: FormRendererProps) {
  const [formData, setFormData] = useState({});
  const [originalData, setOriginalData] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  
  // Load data for edit/view modes
  useEffect(() => {
    if (mode !== 'create' && pageId) {
      loadPageData(pageId).then(data => {
        setFormData(data);
        setOriginalData(data);
      });
    } else if (mode === 'create') {
      // Apply default values
      const defaults = applyDefaultValues(formConfig.fields);
      setFormData(defaults);
    }
  }, [mode, pageId]);
  
  // Track changes for edit mode
  useEffect(() => {
    if (mode === 'edit') {
      setHasChanges(!isEqual(formData, originalData));
    }
  }, [formData, originalData]);
  
  const handleSubmit = async () => {
    if (mode === 'create') {
      await createPage(formConfig.databaseId, formData);
    } else if (mode === 'edit') {
      // Check for stale data
      const currentData = await fetchPageData(pageId);
      if (!isEqual(currentData, originalData)) {
        // Warn about stale data
        const confirmed = await showStaleDataWarning();
        if (!confirmed) return;
      }
      await updatePage(pageId, formData);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {formConfig.fields.map(field => (
        <FormField
          key={field.notionPropertyId}
          field={field}
          value={formData[field.notionPropertyId]}
          onChange={(value) => updateField(field.notionPropertyId, value)}
          readOnly={mode === 'view' || !field.editable}
        />
      ))}
      {mode !== 'view' && (
        <button type="submit">
          {mode === 'create' ? 'Create' : 'Update'}
        </button>
      )}
    </form>
  );
}
```

### 3. Default Value Implementation

```typescript
// lib/utils/defaults.ts
export function applyDefaultValues(fields: FieldConfig[]): Record<string, any> {
  const defaults: Record<string, any> = {};
  
  for (const field of fields) {
    if (!field.defaultValue) continue;
    
    switch (field.defaultValue.type) {
      case 'static':
        defaults[field.notionPropertyId] = field.defaultValue.value;
        break;
      
      case 'function':
        defaults[field.notionPropertyId] = evaluateFunction(
          field.defaultValue.name,
          field.notionPropertyType
        );
        break;
    }
  }
  
  return defaults;
}

function evaluateFunction(name: string, propertyType: string): any {
  switch (name) {
    case 'today':
      return new Date().toISOString().split('T')[0];
    
    case 'now':
      return new Date().toISOString();
    
    case 'current_user':
      // Get from session
      return getCurrentUser();
    
    default:
      return null;
  }
}
```

### 4. Relation Traversal

```typescript
// Display related data
export async function getRelatedData(
  pageId: string,
  relationPath: string[]
): Promise<any> {
  let currentPage = await getPage(pageId);
  
  for (const propertyName of relationPath) {
    const property = currentPage.properties[propertyName];
    
    if (property.type === 'relation' && property.relation.length > 0) {
      // Get first related page (for display)
      currentPage = await getPage(property.relation[0].id);
    } else {
      // Return the property value
      return extractPropertyValue(property);
    }
  }
  
  return null;
}
```

### 5. Stale Data Detection

```typescript
export async function checkStaleData(
  pageId: string,
  originalData: any
): Promise<{ isStale: boolean; currentData?: any }> {
  const currentData = await fetchPageData(pageId);
  const isStale = currentData.last_edited_time !== originalData.last_edited_time;
  
  return { isStale, currentData };
}
```

## Deployment Checklist

### Environment Variables

```env
# Notion OAuth
NOTION_CLIENT_ID=your_client_id
NOTION_CLIENT_SECRET=your_client_secret
NOTION_REDIRECT_URI=https://yourdomain.com/api/auth/notion/callback

# Database
DATABASE_URL=file:./dev.db  # SQLite for dev
# DATABASE_URL=postgresql://...  # Postgres for prod

# Session
SESSION_SECRET=your_random_secret

# App
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Vercel Deployment

1. Push code to GitHub
2. Connect repository to Vercel
3. Configure environment variables
4. Set up PostgreSQL database (Vercel Postgres)
5. Deploy

### Database Migration

```bash
# Generate migration
npm run db:generate

# Apply migration
npm run db:migrate

# Seed initial data (if needed)
npm run db:seed
```

## Phase 1 Implementation Plan (MVP)

### Week 1: Foundation
- [ ] Set up Next.js project with TypeScript
- [ ] Configure Tailwind CSS
- [ ] Set up Drizzle ORM with SQLite
- [ ] Implement database schema
- [ ] Create basic layout components

### Week 2: Authentication
- [ ] Implement Notion OAuth flow
- [ ] Create session management
- [ ] Build login/logout flow
- [ ] Set up protected routes

### Week 3: Form Builder
- [ ] Database selector component
- [ ] View selector component
- [ ] Field configuration interface
- [ ] Basic form config storage

### Week 4: Form Renderer
- [ ] Build field components (text, number, date, select)
- [ ] Implement create mode
- [ ] Implement edit mode with update button
- [ ] Implement view mode

### Week 5: Data Management
- [ ] Implement data listing with pagination
- [ ] Add sorting functionality
- [ ] Add per-field search
- [ ] Implement stale data warning

### Week 6: Polish & Deploy
- [ ] Add relation display (read-only)
- [ ] Implement person field
- [ ] Add default values (today, current_user)
- [ ] Deploy to Vercel
- [ ] Testing and bug fixes

## Future Enhancements (Post-MVP)

- Multi-user support with user management
- Inline relation editing
- Full-text search across fields
- Form sections and advanced layouts
- Conditional field visibility
- Webhooks for form submissions
- Export/import form configurations
- Form templates library
- Analytics and submission tracking
- Custom validation rules
- File upload support
