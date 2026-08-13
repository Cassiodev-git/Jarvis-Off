import { defineConfig } from 'drizzle-kit';
import path from 'path';

export default defineConfig({
    schema: './src/infrastructure/database/schema/index.ts',
    out: './src/infrastructure/database/migrations',
    dialect: 'sqlite',
    dbCredentials: {
        url: path.resolve('src/infrastructure/database/storage/jarvis.db'),
    },
});