import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  notionUserId: text('notion_user_id').notNull().unique(),
  email: text('email'),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  workspaceId: text('workspace_id').notNull(),
  workspaceName: text('workspace_name'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// OAuth tokens table
export const oauthTokens = sqliteTable('oauth_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token').notNull(),
  tokenType: text('token_type').default('bearer'),
  workspaceId: text('workspace_id').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// Form configurations table
export const formConfigs = sqliteTable('form_configs', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  databaseId: text('database_id').notNull(),
  viewId: text('view_id'),
  mode: text('mode', { enum: ['create', 'edit', 'view'] }).notNull(),
  config: text('config').notNull(), // JSON string
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// Form submissions tracking
export const formSubmissions = sqliteTable('form_submissions', {
  id: text('id').primaryKey(),
  formConfigId: text('form_config_id')
    .notNull()
    .references(() => formConfigs.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  notionPageId: text('notion_page_id').notNull(),
  mode: text('mode').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type OAuthToken = typeof oauthTokens.$inferSelect;
export type NewOAuthToken = typeof oauthTokens.$inferInsert;
export type FormConfig = typeof formConfigs.$inferSelect;
export type NewFormConfig = typeof formConfigs.$inferInsert;
export type FormSubmission = typeof formSubmissions.$inferSelect;
export type NewFormSubmission = typeof formSubmissions.$inferInsert;
