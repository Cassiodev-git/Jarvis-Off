import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const projects = sqliteTable('projects', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    path: text('path'),
    status: text('status').notNull().default('active'), // active, paused, archived
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
});

export type ProjectEntity = typeof projects.$inferSelect;
export type NewProjectEntity = typeof projects.$inferInsert;