import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'path';
import fs from 'fs';
import * as schema from './schema/index.js';

const storageDir = path.resolve('src/infrastructure/database/storage');

if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
}

const dbPath = path.join(storageDir, 'jarvis.db');
const sqliteClient = new Database(dbPath);

export const db = drizzle(sqliteClient, { schema });