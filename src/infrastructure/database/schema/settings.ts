import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { users } from './users.js';

export const settings = sqliteTable('settings', {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    value: text('value').notNull(),
    updatedAt: text('updated_at').notNull(),
});

export type SettingEntity = typeof settings.$inferSelect;
export type NewSettingEntity = typeof settings.$inferInsert;