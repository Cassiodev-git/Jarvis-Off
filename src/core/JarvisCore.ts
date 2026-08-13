import { ContextBuilder } from './ContextBuilder.js';
import { IntentManager } from './IntentManager.js';
import { AIProvider, ChatMessage } from '../infrastructure/ai/AIProvider.js';
import { MemoryController } from '../modules/memory/controller/memory.controller.js';
import { LoggerProvider } from '../infrastructure/logger/LoggerProvider.js';

export class JarvisCore {
    private activeMode: string = 'NORMAL';
    private activeProject: string = 'J.A.R.V.I.S.';

    constructor(
        private readonly aiProvider: AIProvider,
        private readonly memoryController: MemoryController,
        private readonly contextBuilder: ContextBuilder,
        private readonly intentManager: IntentManager,
        private readonly logger: LoggerProvider
    ) {}

    public async handleUserPrompt(prompt: string, history: ChatMessage[] = []): Promise<string> {
        this.logger.info(`Processando solicitação: "${prompt}"`);

        const intentResult = await this.intentManager.analyze(prompt);
        this.logger.debug(`Intenção detectada: ${intentResult.intent}`);

        if (intentResult.intent === 'SAVE_MEMORY') {
            const contentToSave = prompt.replace(
                /^(jarvis,?\s*|ei jarvis,?\s*)?(memorize|lembre-se|salve essa memória|guarde essa informação)\s*(que\s*)?/i,
                ''
            ).trim();

            if (!contentToSave || contentToSave.length < 3) {
                return 'O que exatamente você gostaria que eu memorizasse, senhor?';
            }

            await this.memoryController.create({
                category: 'geral',
                content: contentToSave,
                importance: 3,
            });

            return 'Entendido, senhor. A informação foi armazenada no banco de memória.';
        }

        const messages = await this.contextBuilder.buildChatMessages(prompt, history, {
            activeMode: this.activeMode,
            activeProject: this.activeProject,
        });

        return await this.aiProvider.chat(messages);
    }

    public setMode(mode: string): void {
        this.activeMode = mode;
        this.logger.info(`Modo alterado para: ${mode}`);
    }

    public setProject(project: string): void {
        this.activeProject = project;
        this.logger.info(`Projeto ativo alterado para: ${project}`);
    }
}
