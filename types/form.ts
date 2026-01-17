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

// Notion filter
export const NotionFilterSchema = z.object({
  property: z.string(),
  type: z.string(),
  condition: z.any(),
});

export type NotionFilter = z.infer<typeof NotionFilterSchema>;

// Notion sort
export const NotionSortSchema = z.object({
  property: z.string(),
  direction: z.enum(['ascending', 'descending']),
});

export type NotionSort = z.infer<typeof NotionSortSchema>;

// Form configuration
export const FormConfigDataSchema = z.object({
  databaseId: z.string(),
  viewId: z.string().optional(),
  fields: z.array(FieldConfigSchema),
  filters: z.array(NotionFilterSchema).default([]),
  sorts: z.array(NotionSortSchema).default([]),
  pageSize: z.number().default(20),
  layout: z.object({
    showTitle: z.boolean().default(true),
    titleTemplate: z.string().optional(),
    columns: z.number().optional(),
  }).default({}),
  permissions: z.object({
    allowCreate: z.boolean().default(true),
    allowEdit: z.boolean().default(true),
    allowDelete: z.boolean().default(false),
  }).default({}),
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
