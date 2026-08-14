import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { users } from './users.js';
import { projects } from './projects.js';

export const memories = sqliteTable('memories', {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    category: text('category').notNull().default('personal'), // personal, hardware, project, study, preference, technical, system
    importance: integer('importance').notNull().default(1),    // Nível de 1 a 5
    source: text('source').notNull().default('user'),         // user, assistant, system
    projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    lastAccessedAt: text('last_accessed_at'),
});

export type MemoryEntity = typeof memories.$inferSelect;
export type NewMemoryEntity = typeof memories.$inferInsert;