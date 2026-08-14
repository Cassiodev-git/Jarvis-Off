import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const systemState = sqliteTable('system_state', {
    id: text('id').primaryKey(),
    key: text('key').notNull().unique(),
    value: text('value').notNull(),
    updatedAt: text('updated_at').notNull(),
});

export type SystemStateEntity = typeof systemState.$inferSelect;
export type NewSystemStateEntity = typeof systemState.$inferInsert;