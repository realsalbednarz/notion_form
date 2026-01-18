# List View Feature Implementation Plan

## Overview
Add data retrieval capabilities to forms - display database records in a paginated table, with the ability to edit records via a slide-over panel.

## Design Decisions Made

### Form Capabilities Model
Forms have **capabilities** (what they CAN do), not modes:
- `allowCreate` - can create new records
- `allowEdit` - can edit existing records
- `allowList` - can display record list

**Runtime mode** is determined by URL context:
- `/f/[formId]` → list mode (if allowList) or create form (if only allowCreate)
- `/f/[formId]?new` → create mode (slide-over if list exists, full page otherwise)
- `/f/[formId]?edit=[recordId]` → edit mode (slide-over)

### Field Configuration
Each field has:
- `visible` - show in create/edit form (existing)
- `showInList` - show as column in list view (new)
- Field order in picker controls both form field order and list column order

### List View Features
- Paginated table with configurable columns
- Design-time filters (configured in form builder, runtime filters deferred)
- Explicit "Edit" button per row (no row click, no bulk edit)
- "New" button if allowCreate is enabled

### Edit/Create UX
- Slide-over panel from right side
- Fixed width (600px)
- Same validation UI as existing forms
- On save: close slide-over, refresh list

### Permissions
- Notion handles edit permissions - we pass through errors
- "Only my records" achieved via form-level filters (e.g., created_by = current_user)

### Data Model Changes

```typescript
interface FormConfig {
  fields: FieldConfig[];

  // Capabilities
  allowCreate?: boolean;  // default true for existing forms
  allowEdit?: boolean;
  allowList?: boolean;

  // List settings
  listConfig?: {
    pageSize: number;  // default 20
    filters: DesignTimeFilter[];
  };
}

interface FieldConfig {
  // ...existing fields (notionPropertyId, label, visible, required, etc.)
  showInList?: boolean;  // NEW - show as table column
}

interface DesignTimeFilter {
  propertyId: string;
  operator: 'equals' | 'does_not_equal' | 'contains' | 'does_not_contain' |
            'starts_with' | 'ends_with' | 'greater_than' | 'less_than' |
            'greater_than_or_equal_to' | 'less_than_or_equal_to' |
            'is_empty' | 'is_not_empty';
  value?: any;  // optional for is_empty/is_not_empty
}
```

---

## Implementation Tasks

### Phase 1: Schema & API Foundation
- [x] Update `types/form.ts` with new interfaces (DesignTimeFilter, updated FormConfig)
- [x] Add `showInList` to FieldConfig type
- [x] Create `GET /api/notion/databases/[id]/rows` - query records with filters, pagination
- [x] Create `PATCH /api/notion/pages/[id]` - update existing record (also added GET for single page)

### Phase 2: Form Builder Updates
- [x] Add capability toggles UI (allowCreate, allowEdit, allowList checkboxes)
- [x] Add `showInList` checkbox to field picker (per field)
- [x] Add list config section when allowList is enabled:
  - [x] Page size input
  - [ ] Filter builder UI (add/remove filters, property/operator/value) - DEFERRED
- [x] Update form save logic to include new config
- [x] Update edit form page to load/display new config

### Phase 3: New UI Components
- [x] Create `SlideOver` component - reusable slide-over panel
- [x] Create `ListRenderer` component - paginated table
  - [x] Column headers from showInList fields
  - [x] Row rendering with appropriate formatting per field type
  - [x] Pagination controls (Load more with Notion cursors)
  - [x] Loading states
  - [x] Empty state
- [ ] Create `FilterBuilder` component for form builder - DEFERRED

### Phase 4: Public Form Integration
- [x] Update `/f/[formId]/page.tsx` to detect capabilities
- [x] Render ListRenderer when allowList and no edit/new param
- [x] Handle `?new` param - show create in slide-over (or full page if no list)
- [x] Handle `?edit=[id]` param - fetch record, show edit in slide-over
- [x] Integrate slide-over with FormRenderer for create/edit
- [x] On successful save: close slide-over, refresh list
- [x] Handle Notion permission errors gracefully

### Phase 5: Polish & Edge Cases
- [x] Loading states for all async operations
- [x] Error handling for failed fetches, failed saves
- [ ] Optimistic UI updates (optional) - DEFERRED
- [ ] Mobile responsiveness for list view - NEEDS TESTING
- [x] Keyboard navigation (Escape to close slide-over)

---

## API Specifications

### GET /api/notion/databases/[id]/rows
Query parameters:
- `page_size` (number, default 20)
- `start_cursor` (string, optional - for pagination)
- `filters` (JSON string of DesignTimeFilter[], optional)

Response:
```json
{
  "rows": [
    {
      "id": "page-id",
      "properties": {
        "propertyId1": { "type": "title", "value": "..." },
        "propertyId2": { "type": "number", "value": 42 }
      }
    }
  ],
  "has_more": true,
  "next_cursor": "cursor-string"
}
```

### PATCH /api/notion/pages/[id]
Request body:
```json
{
  "fields": [
    { "propertyId": "...", "propertyType": "...", "value": "..." }
  ]
}
```

Response:
```json
{
  "success": true,
  "pageId": "...",
  "url": "..."
}
```

---

## Notes
- Existing forms should continue to work unchanged (default allowCreate: true)
- Runtime filters deferred to future iteration
- Inline editing deferred to future iteration
- Bulk operations deferred to future iteration
