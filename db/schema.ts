import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const saves = sqliteTable('saves', {
  id: text('id').primaryKey(),
  state: text('state').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const cases = sqliteTable('cases', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  statusLabel: text('status_label').notNull(),
  summary: text('summary').notNull(),
  data: text('data').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
