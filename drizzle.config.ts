import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    schema: './src/infrastructure/database/schema/index.ts',
    out: './drizzle',
    dialect: 'sqlite',
    dbCredentials: {
        url: './src/infrastructure/database/storage/jarvis.db',
    },
});