import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    city: text('city').notNull(),
    email: text('email').notNull(),
    state: text('state').notNull(),
    nickname: text('nickname'),
    language: text('language').default('pt-BR').notNull(),
    createdAt: text('created_at').default('CURRENT_TIMESTAMP').notNull(),
});