import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// 1. User Profile (Identidade permanente)
export const userProfile = sqliteTable('user_profile', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull().default('Cássio'),
    title: text('title').notNull().default('Senhor'),
    language: text('language').notNull().default('Português'),
    personality: text('personality').notNull().default('Humor leve, formalidade alta'),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// 2. Devices (Hardware e rede)
export const devices = sqliteTable('devices', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    processor: text('processor'),
    ram: text('ram'),
    os: text('os'),
    ipAddress: text('ip_address'),
    isOnline: integer('is_online', { mode: 'boolean' }).default(true),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// 3. Projects (Projetos ativos e históricos)
export const projects = sqliteTable('projects', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    status: text('status').notNull(), // Ex: 'Em desenvolvimento', 'Pausado'
    techStack: text('tech_stack').notNull(), // Armazenado como String ou JSON
    importance: integer('importance').notNull().default(3), // 1 a 5
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// 4. Preferences (Comportamento e respostas)
export const preferences = sqliteTable('preferences', {
    key: text('key').primaryKey(),
    value: text('value').notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// 5. Commands (Catálogo de ações e intenções)
export const commands = sqliteTable('commands', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    intent: text('intent').notNull(),
    triggers: text('triggers').notNull(), // Array JSON de variações de frases
    action: text('action').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// 6. System State (Estado atual do ambiente)
export const systemState = sqliteTable('system_state', {
    key: text('key').primaryKey(), // Ex: 'current_mode', 'active_project'
    value: text('value').notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// 7. Memories (Longo prazo com sistema de importância 1-5)
export const memories = sqliteTable('memories', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    content: text('content').notNull(),
    category: text('category').notNull(), // Ex: 'aprendizado', 'preferencia', 'decisao'
    importance: integer('importance').notNull().default(3), // Nível 1 a 5
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// 8. Knowledge (Biblioteca de conhecimento local/Panzer)
export const knowledge = sqliteTable('knowledge', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
    category: text('category').notNull(),
    pathOrContent: text('path_or_content').notNull(),
    location: text('location', { enum: ['local', 'panzer'] }).notNull().default('local'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// 9. Conversation History (Histórico bruto auditável)
export const conversationHistory = sqliteTable('conversation_history', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
    content: text('content').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});