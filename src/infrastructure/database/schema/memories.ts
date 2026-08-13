import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const memories = sqliteTable('memories', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    category: text('category').notNull(), // ex: 'preference', 'fact', 'context'
    content: text('content').notNull(),
    importance: integer('importance').default(1).notNull(), // 1 a 5
    createdAt: text('created_at').default('CURRENT_TIMESTAMP').notNull(),
});