import path from 'node:path';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from './client.js';

const migrationsFolder = path.resolve(process.cwd(), 'drizzle');

try {
    migrate(db, { migrationsFolder });
    console.log(`✅ Migrations aplicadas com sucesso a partir de ${migrationsFolder}.`);
} catch (error) {
    console.error('❌ Falha ao aplicar migrations:', error);
    process.exitCode = 1;
}
