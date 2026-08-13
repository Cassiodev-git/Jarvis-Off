import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const settings = sqliteTable('settings', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    model: text('model').default('llama3.2:1b').notNull(),
    language: text('language').default('pt-BR').notNull(),
    wakeWord: text('wake_word').default('jarvis').notNull(),
    voice: text('voice').default('pt_BR-faber-medium').notNull(),
    volume: integer('volume').default(80).notNull(),
    updatedAt: text('updated_at').default('CURRENT_TIMESTAMP').notNull(),
});