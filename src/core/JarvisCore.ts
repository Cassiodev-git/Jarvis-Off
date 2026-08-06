import { IntentManager, Intent } from './IntentManager.js';
import { OllamaProvider, ChatMessage } from '../infrastructure/ai/OllamaProvider.js';
import { DevelopmentPlugin } from '../plugins/development/DevelopmentPlugin.js';
import { AppError } from '../shared/errors/AppError.js';

export class JarvisCore {
    private intentManager: IntentManager;
    private ollamaProvider: OllamaProvider;
    private devPlugin: DevelopmentPlugin;
    private chatHistory: ChatMessage[];

    constructor() {
        this.intentManager = new IntentManager();
        this.ollamaProvider = new OllamaProvider();
        this.devPlugin = new DevelopmentPlugin();
        this.chatHistory = [
            {
                role: 'system',
                content:
                    'Você é o Jarvis, um assistente virtual pessoal altamente eficiente, leal e sucinto. Responda em português brasileiro de forma direta e cortês.',
            },
        ];
    }

    /**
     * Processa qualquer entrada de texto (seja da CLI ou da voz) e retorna a resposta.
     */
    public async processInput(input: string): Promise<string> {
        try {
            const intent = this.intentManager.detectIntent(input);

            switch (intent) {
                case Intent.DEVELOPMENT_MODE:
                    return await this.devPlugin.openEnvironment();

                case Intent.EXIT:
                    return 'Desligando os sistemas, senhor. Até logo.';

                case Intent.GENERAL_CHAT:
                default:
                    this.chatHistory.push({ role: 'user', content: input });
                    const response = await this.ollamaProvider.chat(this.chatHistory);
                    this.chatHistory.push({ role: 'assistant', content: response });
                    return response;
            }
        } catch (error) {
            if (error instanceof AppError) {
                return `⚠️ [Erro de Sistema - Status ${error.statusCode}]: ${error.message}`;
            }
            return `⚠️ [Erro Inesperado]: ${(error as Error).message}`;
        }
    }
}