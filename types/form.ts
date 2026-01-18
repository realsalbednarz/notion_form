import { z } from 'zod';

// Form modes
export type FormMode = 'create' | 'edit' | 'view';

// Default value types
export const DefaultValueSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('static'),
    value: z.any(),
  }),
  z.object({
    type: z.literal('function'),
    name: z.enum(['today', 'current_user', 'now']),
  }),
  z.object({
    type: z.literal('formula'),
    expression: z.string(),
  }),
]);

export type DefaultValue = z.infer<typeof DefaultValueSchema>;

// Field configuration
export const FieldConfigSchema = z.object({
  notionPropertyId: z.string(),
  notionPropertyType: z.string(),
  label: z.string(),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  required: z.boolean().default(false),
  editable: z.boolean().default(true),
  visible: z.boolean().default(true),
  showInList: z.boolean().default(true),  // Show as column in list view (default: shown)
  defaultValue: DefaultValueSchema.optional(),
  relationPath: z.array(z.string()).optional(),
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    message: z.string().optional(),
  }).optional(),
});

export type FieldConfig = z.infer<typeof FieldConfigSchema>;

// Notion filter (raw format)
export const NotionFilterSchema = z.object({
  property: z.string(),
  type: z.string(),
  condition: z.any(),
});

export type NotionFilter = z.infer<typeof NotionFilterSchema>;

// Design-time filter for list views
export const FilterOperatorSchema = z.enum([
  'equals',
  'does_not_equal',
  'contains',
  'does_not_contain',
  'starts_with',
  'ends_with',
  'greater_than',
  'less_than',
  'greater_than_or_equal_to',
  'less_than_or_equal_to',
  'is_empty',
  'is_not_empty',
]);

export type FilterOperator = z.infer<typeof FilterOperatorSchema>;

export const DesignTimeFilterSchema = z.object({
  propertyId: z.string(),
  propertyType: z.string(),  // needed to build correct Notion filter
  operator: FilterOperatorSchema,
  value: z.any().optional(),  // optional for is_empty/is_not_empty
});

export type DesignTimeFilter = z.infer<typeof DesignTimeFilterSchema>;

// Notion sort
export const NotionSortSchema = z.object({
  property: z.string(),
  direction: z.enum(['ascending', 'descending']),
});

export type NotionSort = z.infer<typeof NotionSortSchema>;

// List configuration for list-enabled forms
export const ListConfigSchema = z.object({
  pageSize: z.number().default(20),
  filters: z.array(DesignTimeFilterSchema).default([]),
});

export type ListConfig = z.infer<typeof ListConfigSchema>;

// Form configuration
export const FormConfigDataSchema = z.object({
  databaseId: z.string(),
  viewId: z.string().optional(),
  fields: z.array(FieldConfigSchema),
  filters: z.array(NotionFilterSchema).default([]),  // legacy, keeping for compatibility
  sorts: z.array(NotionSortSchema).default([]),
  pageSize: z.number().default(20),  // legacy, keeping for compatibility
  layout: z.object({
    showTitle: z.boolean().default(true),
    titleTemplate: z.string().optional(),
    columns: z.number().optional(),
  }).default({}),
  permissions: z.object({
    allowCreate: z.boolean().default(true),
    allowEdit: z.boolean().default(false),
    allowDelete: z.boolean().default(false),
    allowList: z.boolean().default(false),  // Enable list view
  }).default({}),
  listConfig: ListConfigSchema.optional(),  // Config for list view
});

export type FormConfigData = z.infer<typeof FormConfigDataSchema>;

// Complete form configuration (with metadata)
export interface FormConfiguration {
  id: string;
  userId: string;
  name: string;
  description?: string;
  databaseId: string;
  viewId?: string;
  mode: FormMode;
  config: FormConfigData;
  createdAt: Date;
  updatedAt: Date;
}

// Notion property types we support
export type NotionPropertyType =
  | 'title'
  | 'rich_text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'date'
  | 'people'
  | 'files'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'phone_number'
  | 'formula'
  | 'relation'
  | 'rollup'
  | 'created_time'
  | 'created_by'
  | 'last_edited_time'
  | 'last_edited_by';

// Notion database schema
export interface NotionDatabase {
  id: string;
  title: string;
  properties: Record<string, NotionProperty>;
  url: string;
}

export interface NotionProperty {
  id: string;
  name: string;
  type: NotionPropertyType;
  [key: string]: any; // Additional type-specific properties
}

// Notion page data
export interface NotionPage {
  id: string;
  created_time: string;
  last_edited_time: string;
  properties: Record<string, any>;
  url: string;
}

// Form submission data
export interface FormSubmission {
  id: string;
  formConfigId: string;
  userId: string;
  notionPageId: string;
  mode: FormMode;
  createdAt: Date;
}
