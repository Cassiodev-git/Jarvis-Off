import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const devices = sqliteTable('devices', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    type: text('type').notNull(), // computer, server, robot, iot
    hostname: text('hostname'),
    address: text('address'),
    status: text('status').notNull().default('offline'),
    configuration: text('configuration'), // JSON string para hardware/specs
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
});

export type DeviceEntity = typeof devices.$inferSelect;
export type NewDeviceEntity = typeof devices.$inferInsert;