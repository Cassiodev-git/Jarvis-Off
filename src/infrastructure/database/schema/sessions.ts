import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { users } from './users.js';
import { projects } from './projects.js';

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  mode: text('mode').notNull().default('development'), // development, conversation, study, etc.
  startedAt: text('started_at').notNull(),
  endedAt: text('ended_at'),
  status: text('status').notNull().default('active'), // active, finished
});

export type SessionEntity = typeof sessions.$inferSelect;
export type NewSessionEntity = typeof sessions.$inferInsert;