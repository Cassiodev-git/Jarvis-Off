import 'dotenv/config';
import readline from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { JarvisCore } from './core/JarvisCore.js';
import { ContextBuilder } from './core/services/ContextBuilder.js';
import { IntentManager } from './core/IntentManager.js';
import { SessionState } from './core/services/SessionState.js';
import { MemoryRepository } from './modules/memory/repository/MemoryRepository.js';
import { MemoryService } from './modules/memory/service/memory.service.js';
import { MemoryController } from './modules/memory/controller/memory.controller.js';
import { ConsoleLoggerProvider } from './infrastructure/logger/ConsoleLoggerProvider.js';
import { OllamaProvider } from './infrastructure/providers/OllamaProvider.js';
import { PiperProvider } from './infrastructure/providers/PiperProvider.js';
import { CommandDispatcher } from './modules/system/CommandDispatcher.js';
import { WttrWeatherProvider } from './infrastructure/providers/WttrWeatherProvider.js';
import { ExchangeRateProvider } from './infrastructure/providers/ExchangeRateProvider.js';
import { MorningBriefingService } from './core/services/MorningBriefingService.js';
import { GoogleNewsRssProvider } from './infrastructure/providers/GoogleNewsRssProvider.js';
import { BrowserAutomationService } from './infrastructure/browser/BrowserAutomationService.js';
import { OllamaVisionProvider } from './infrastructure/providers/OllamaVisionProvider.js';
import { env } from './config/env.js';

const EXIT_COMMANDS = new Set(['sair', 'exit', 'quit']);

function createJarvis(): JarvisCore {
    const logger = new ConsoleLoggerProvider();
    const memoryService = new MemoryService(new MemoryRepository());
    const sessionState = new SessionState();
    const contextBuilder = new ContextBuilder(memoryService, logger);
    const ttsProvider = new PiperProvider({
        piperPath: env.PIPER_PATH,
        modelPath: env.PIPER_MODEL_PATH,
    });

    return new JarvisCore({
        aiProvider: new OllamaProvider(),
        memoryController: new MemoryController(memoryService),
        contextBuilder,
        intentManager: new IntentManager(undefined, logger),
        sessionState,
        logger,
        commandDispatcher: new CommandDispatcher(logger),
        morningBriefingService: new MorningBriefingService(
            new WttrWeatherProvider(),
            new ExchangeRateProvider(),
            env.WEATHER_CITY,
        ),
        newsProvider: new GoogleNewsRssProvider(),
        browserAutomation: new BrowserAutomationService(),
        visionProvider: new OllamaVisionProvider(),
        ttsProvider,
    });
}

export async function runCli(): Promise<void> {
    const jarvis = createJarvis();
    const terminal = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: 'jarvis > ',
    });
    terminal.on('SIGINT', () => terminal.close());

    console.log('J.A.R.V.I.S. CLI iniciado. Digite "sair", "exit" ou "quit" para encerrar.');
    terminal.prompt();

    try {
        for await (const line of terminal) {
            const prompt = line.trim();

            if (EXIT_COMMANDS.has(prompt.toLowerCase())) {
                terminal.close();
                break;
            }

            if (!prompt) {
                terminal.prompt();
                continue;
            }

            try {
                const response = await jarvis.processPrompt(prompt, [], { speakResponse: false });
                console.log(`Jarvis: ${response}`);
                await jarvis.speak(response);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Erro interno do assistente.';
                console.error(`Erro: ${message}`);
            }

            terminal.prompt();
        }
    } finally {
        terminal.close();
        await jarvis.stopSpeech();
    }
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : '';

if (currentFile === invokedFile) {
    runCli()
        .then(() => process.exit(0))
        .catch((error: unknown) => {
            console.error('Falha ao iniciar a CLI do J.A.R.V.I.S.:', error);
            process.exit(1);
        });
}
