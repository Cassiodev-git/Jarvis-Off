import 'dotenv/config';
import fastify from 'fastify';
import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';

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
import { PiperProvider } from './infrastructure/providers/PiperProvider.js';
import { ContinuousVoiceListener } from './infrastructure/speech/ContinuousVoiceListener.js';
import { HybridSpeechProvider } from './infrastructure/speech/HybridSpeechProvider.js';
import { env } from './config/env.js';
import { CommandDispatcher } from './modules/system/CommandDispatcher.js';
import { AppError } from './shared/errors/AppError.js';
import { WttrWeatherProvider } from './infrastructure/providers/WttrWeatherProvider.js';
import { ExchangeRateProvider } from './infrastructure/providers/ExchangeRateProvider.js';
import { MorningBriefingService } from './core/services/MorningBriefingService.js';
import { WakePhraseMatcher } from './core/services/WakePhraseMatcher.js';
import { GoogleNewsRssProvider } from './infrastructure/providers/GoogleNewsRssProvider.js';
import { BrowserAutomationService } from './infrastructure/browser/BrowserAutomationService.js';
import { OllamaVisionProvider } from './infrastructure/providers/OllamaVisionProvider.js';
import { PluginRegistry } from './core/plugins/PluginRegistry.js';
import { registerCorePlugins } from './plugins/index.js';

async function bootstrap() {
    const logger = new ConsoleLoggerProvider();
    logger.info('🚀 Inicializando J.A.R.V.I.S. Engine...');
    const pluginRegistry = new PluginRegistry();
    await registerCorePlugins(pluginRegistry, logger);
    logger.info('Plugins carregados.', { plugins: pluginRegistry.list().map((plugin) => plugin.id) });

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
    const commandDispatcher = new CommandDispatcher(logger);
    const morningBriefingService = new MorningBriefingService(
        new WttrWeatherProvider(),
        new ExchangeRateProvider(),
        env.WEATHER_CITY,
    );
    const ttsProvider = new PiperProvider({
        piperPath: env.PIPER_PATH,
        modelPath: env.PIPER_MODEL_PATH,
    });
    const wakeWordProvider = env.VOICE_MODE ? undefined : new VoskProvider();
    const browserAutomation = new BrowserAutomationService();
    const app: FastifyInstance = fastify({ logger: false });
    await app.register(cors, { origin: env.CORS_ORIGINS });
    let voiceListener: ContinuousVoiceListener | undefined;

    // 4. Instanciação do Núcleo JarvisCore
    const jarvis = new JarvisCore({
        aiProvider,
        memoryController,
        contextBuilder,
        intentManager,
        sessionState,
        logger,
        commandDispatcher,
        morningBriefingService,
        newsProvider: new GoogleNewsRssProvider(),
        browserAutomation,
        visionProvider: new OllamaVisionProvider(),
        ttsProvider,
        wakeWordProvider,
        pluginRegistry,
        onShutdownRequested: async () => {
            await voiceListener?.stop();
            await browserAutomation.close();
            await pluginRegistry.shutdown();
            await app.close();
        },
    });

    // 5. Configuração do Servidor Fastify (API HTTP)
    // Rota de verificação do estado do sistema
    app.get('/health', async () => ({
        status: 'online',
        session: jarvis.getSessionState().getSnapshot(),
        timestamp: new Date().toISOString(),
    }));

    // Rota principal para interação por texto
    app.post<{ Body: { prompt: string; history?: ChatMessage[] } }>('/chat', async (request, reply) => {
        const { prompt, history = [] } = request.body;

        if (typeof prompt !== 'string' || !prompt.trim()) {
            reply.code(400);
            return { error: 'O parâmetro "prompt" é obrigatório.' };
        }

        try {
            const response = await jarvis.handleUserPrompt(prompt, history, {
                awaitSpeech: false,
            });
            return {
                response,
                state: jarvis.getSessionState().getSnapshot(),
            };
        } catch (error) {
            logger.error('Erro na rota /chat:', error as Error);
            const statusCode = error instanceof AppError ? error.statusCode : 500;
            reply.code(statusCode);
            return { error: error instanceof Error ? error.message : 'Erro interno do servidor.' };
        }
    });

    // 6. Inicialização do Servidor
    const PORT = env.PORT;
    const HOST = env.HOST;

    await app.listen({ port: PORT, host: HOST });
    logger.info(`✅ J.A.R.V.I.S. ativo e escutando em http://${HOST}:${PORT}`);

    if (env.VOICE_MODE) {
        const speechProvider = new HybridSpeechProvider({
            modelPath: env.VOSK_MODEL_PATH,
            device: env.VOICE_AUDIO_DEVICE,
            soxPath: env.SOX_PATH,
            audioEnhancement: env.VOICE_AUDIO_ENHANCEMENT,
            executable: env.WHISPER_PATH,
            model: env.WHISPER_MODEL,
            longPhraseWordThreshold: env.STT_LONG_PHRASE_WORDS,
            longPhraseSecondsThreshold: env.STT_LONG_PHRASE_SECONDS,
        }, logger);
        voiceListener = new ContinuousVoiceListener(
            speechProvider,
            async (transcription) => {
                await jarvis.handleUserPrompt(transcription);
            },
            logger,
            {
                idleTimeoutMs: env.VOICE_IDLE_TIMEOUT_MS,
                isWakePhrase: (transcription) => WakePhraseMatcher.matches(transcription),
                onWake: async () => jarvis.speak('Estou acordado, senhor.'),
            },
        );

        voiceListener.start();
        process.once('SIGINT', async () => {
            await voiceListener?.stop();
            await app.close();
            await browserAutomation.close();
            await pluginRegistry.shutdown();
            process.exit(0);
        });
    }

    // Opcional: Ativar detecção da palavra de ativação via áudio em segundo plano
    // await jarvis.startWakeWordListening();
}

bootstrap().catch((err) => {
    console.error('💥 Falha crítica durante a inicialização do JARVIS:', err);
    process.exit(1);
});
