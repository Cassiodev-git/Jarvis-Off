import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from './client.js';
import path from 'path';

async function runMigrations() {
    console.log('🔄 Executando migrations...');
    try {
        migrate(db, {
            migrationsFolder: path.resolve('src/infrastructure/database/migrations'),
        });
        console.log('✅ Migrations executadas com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao executar migrations:', error);
        process.exit(1);
    }
}

runMigrations();