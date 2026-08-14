import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { users } from './users.js';

export const commands = sqliteTable('commands', {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    trigger: text('trigger').notNull(),
    action: text('action').notNull(),
    parameters: text('parameters'), 
    enabled: integer('enabled').notNull().default(1),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
});

export type CommandEntity = typeof commands.$inferSelect;
export type NewCommandEntity = typeof commands.$inferInsert;