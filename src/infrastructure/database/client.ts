import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema/index.js';
import path from 'node:path';
import fs from 'node:fs';

// Garante que a pasta de storage exista
const storageDir = path.resolve(process.cwd(), 'src/infrastructure/database/storage');
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

const dbPath = process.env.DATABASE_URL || path.join(storageDir, 'jarvis.db');
const sqlite = new Database(dbPath);


sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
export type DatabaseInstance = typeof db;