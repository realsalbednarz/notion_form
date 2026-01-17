import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  notionUserId: text('notion_user_id').notNull().unique(),
  email: text('email'),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  workspaceId: text('workspace_id').notNull(),
  workspaceName: text('workspace_name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// OAuth tokens table
export const oauthTokens = pgTable('oauth_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token').notNull(),
  tokenType: text('token_type').default('bearer'),
  workspaceId: text('workspace_id').notNull(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Form configurations table
export const formConfigs = pgTable('form_configs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  databaseId: text('database_id').notNull(),
  viewId: text('view_id'),
  mode: text('mode').notNull(), // 'create' | 'edit' | 'view'
  config: text('config').notNull(), // JSON string
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Form submissions tracking
export const formSubmissions = pgTable('form_submissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  formConfigId: uuid('form_config_id')
    .notNull()
    .references(() => formConfigs.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  notionPageId: text('notion_page_id').notNull(),
  mode: text('mode').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type OAuthToken = typeof oauthTokens.$inferSelect;
export type NewOAuthToken = typeof oauthTokens.$inferInsert;
export type FormConfig = typeof formConfigs.$inferSelect;
export type NewFormConfig = typeof formConfigs.$inferInsert;
export type FormSubmission = typeof formSubmissions.$inferSelect;
export type NewFormSubmission = typeof formSubmissions.$inferInsert;
