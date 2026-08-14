import 'dotenv/config';
import fastify from 'fastify';
import cors from '@fastify/cors';

// Core & Interfaces
import { JarvisCore } from './core/JarvisCore.js';
import { SessionState } from './core/services/SessionState.js';
import { ContextBuilder } from './core/services/ContextBuilder.js';
import { IntentManager } from './core/IntentManager.js';
import { ChatMessage } from './core/contracts/ILanguageModel.js';

// Módulo de Memória
import { MemoryRepository } from './modules/memory/repository/MemoryRepository.js';
import { MemoryService } from './modules/memory/service/memory.service.js';
import { MemoryController } from './modules/memory/controller/memory.controller.js';

// Infraestrutura & Provedores
import { ConsoleLoggerProvider } from './infrastructure/logger/ConsoleLoggerProvider.js';
import { VoskProvider } from './infrastructure/providers/VoskProvider.js';
import { OllamaProvider } from './infrastructure/providers/OllamaProvider.js'; // Ajuste conforme seu provedor concreto (ex: GeminiProvider)

async function bootstrap() {
    const logger = new ConsoleLoggerProvider();
    logger.info('🚀 Inicializando J.A.R.V.I.S. Engine...');

    // 1. Instanciação da Camada de Banco de Dados e Repositórios
    const memoryRepository = new MemoryRepository();
    const memoryService = new MemoryService(memoryRepository);
    const memoryController = new MemoryController(memoryService);

    // 2. Estado da Sessão e Gerenciadores de Contexto
    const sessionState = new SessionState();
    const contextBuilder = new ContextBuilder(memoryService, logger);

    // 3. Provedores de IA, Reconhecimento de Voz e Intenções
    const aiProvider = new OllamaProvider();
    const intentManager = new IntentManager(aiProvider, logger);
    const wakeWordProvider = new VoskProvider();

    // 4. Instanciação do Núcleo JarvisCore
    const jarvis = new JarvisCore({
        aiProvider,
        memoryController,
        contextBuilder,
        intentManager,
        sessionState,
        logger,
        wakeWordProvider,
    });

    // 5. Configuração do Servidor Fastify (API HTTP)
    const app = fastify({ logger: false });
    await app.register(cors, { origin: '*' });

    // Rota de verificação do estado do sistema
    app.get('/health', async () => ({
        status: 'online',
        session: jarvis.getSessionState().getSnapshot(),
        timestamp: new Date().toISOString(),
    }));

    // Rota principal para interação por texto
    app.post<{ Body: { prompt: string; history?: ChatMessage[] } }>('/chat', async (request, reply) => {
        const { prompt, history = [] } = request.body;

        if (!prompt) {
            reply.status(400);
            return { error: 'O parâmetro "prompt" é obrigatório.' };
        }

        try {
            const response = await jarvis.handleUserPrompt(prompt, history);
            return {
                response,
                state: jarvis.getSessionState().getSnapshot(),
            };
        } catch (error) {
            logger.error('Erro na rota /chat:', error as Error);
            reply.status(500);
            return { error: (error as Error).message };
        }
    });

    // 6. Inicialização do Servidor
    const PORT = Number(process.env.PORT) || 3000;
    const HOST = process.env.HOST || '0.0.0.0';

    await app.listen({ port: PORT, host: HOST });
    logger.info(`✅ J.A.R.V.I.S. ativo e escutando em http://${HOST}:${PORT}`);

    // Opcional: Ativar detecção da palavra de ativação via áudio em segundo plano
    // await jarvis.startWakeWordListening();
}

bootstrap().catch((err) => {
    console.error('💥 Falha crítica durante a inicialização do JARVIS:', err);
    process.exit(1);
});