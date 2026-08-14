import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email'),
    state: text('state'),
    city: text('city'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
});

export type UserEntity = typeof users.$inferSelect;
export type NewUserEntity = typeof users.$inferInsert;