import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sessions } from './sessions.js';

export const conversationMessages = sqliteTable('conversation_messages', {
    id: text('id').primaryKey(),
    sessionId: text('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
    role: text('role').notNull(), // user, assistant, system, tool
    content: text('content').notNull(),
    createdAt: text('created_at').notNull(),
    metadata: text('metadata'), // JSON string para dados extras/ferramentas
});

export type ConversationMessageEntity = typeof conversationMessages.$inferSelect;
export type NewConversationMessageEntity = typeof conversationMessages.$inferInsert;