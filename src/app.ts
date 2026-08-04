import Fastify from 'fastify';
import { env } from './config/env.js';
import { chatRoutes } from './routes/chat.js';
import { seedInitialMemory } from './modules/memory/seed.js';
import { startJarvisDaemon } from './voice/stt.service.js';

const app = Fastify({ logger: false });

app.register(chatRoutes);

const start = async () => {
    try {
        await seedInitialMemory();
        await app.listen({ port: env.PORT, host: env.HOST });
        console.log(`\n🤖 Servidor rodando em http://${env.HOST}:${env.PORT}\n`);

        // Inicia o orquestrador com Wake Word e Saudação Diária
        startJarvisDaemon();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

start();