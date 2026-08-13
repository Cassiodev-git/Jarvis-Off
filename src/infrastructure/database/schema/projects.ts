import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const projects = sqliteTable('projects', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    description: text('description'),
    path: text('path'),
    status: text('status').default('active').notNull(), // 'active', 'archived'
    createdAt: text('created_at').default('CURRENT_TIMESTAMP').notNull(),
});