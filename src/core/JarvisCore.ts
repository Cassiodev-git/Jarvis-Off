import { ILanguageModel, ChatMessage } from './contracts/ILanguageModel.js';
import { ITextToSpeech } from './contracts/ITextToSpeech.js';
import { IWakeWord } from './contracts/IWakeWord.js';
import { ContextBuilder } from './services/ContextBuilder.js';
import { IntentManager } from './IntentManager.js';
import { SessionState } from './services/SessionState.js';
import { MemoryController } from '../modules/memory/controller/memory.controller.js';
import { LoggerProvider } from '../infrastructure/logger/LoggerProvider.js';
import { AppError } from '../shared/errors/AppError.js';

export interface JarvisCoreDependencies {
    aiProvider: ILanguageModel;
    memoryController: MemoryController;
    contextBuilder: ContextBuilder;
    intentManager: IntentManager;
    sessionState: SessionState;
    logger: LoggerProvider;
    ttsProvider?: ITextToSpeech;
    wakeWordProvider?: IWakeWord;
}

export class JarvisCore {
    private readonly aiProvider: ILanguageModel;
    private readonly memoryController: MemoryController;
    private readonly contextBuilder: ContextBuilder;
    private readonly intentManager: IntentManager;
    private readonly sessionState: SessionState;
    private readonly logger: LoggerProvider;
    private readonly ttsProvider?: ITextToSpeech;
    private readonly wakeWordProvider?: IWakeWord;

    constructor(deps: JarvisCoreDependencies) {
        this.aiProvider = deps.aiProvider;
        this.memoryController = deps.memoryController;
        this.contextBuilder = deps.contextBuilder;
        this.intentManager = deps.intentManager;
        this.sessionState = deps.sessionState;
        this.logger = deps.logger;
        this.ttsProvider = deps.ttsProvider;
        this.wakeWordProvider = deps.wakeWordProvider;
    }

    /**
     * Processa um prompt de texto do usuário, analisa a intenção, gera a resposta
     * com o LLM e opcionalmente vocaliza o resultado.
     */
    public async handleUserPrompt(
        prompt: string,
        history: ChatMessage[] = [],
        options?: { speakResponse?: boolean }
    ): Promise<string> {
        if (!prompt || !prompt.trim()) {
            throw new AppError('O prompt do usuário não pode estar vazio.', 400);
        }

        this.logger.info(`Processando solicitação: "${prompt}"`);
        this.sessionState.setStatus('THINKING');

        try {
            // 1. Analisa a intenção da entrada do usuário
            const intentResult = await this.intentManager.analyze(prompt);
            this.logger.debug(`Intenção detectada: ${intentResult.intent}`);

            let responseText = '';

            // 2. Trata comandos determinísticos ou delega ao LLM
            if (intentResult.intent === 'SAVE_MEMORY') {
                responseText = await this.handleSaveMemoryIntent(
                    prompt,
                    intentResult.payload?.rawContent as string | undefined
                );
            } else if (intentResult.intent === 'CHANGE_MODE') {
                const targetMode = (intentResult.payload?.mode as string) || 'NORMAL';
                this.sessionState.setMode(targetMode);
                responseText = `Modo de operação alterado para ${targetMode}.`;
            } else {
                const snapshot = this.sessionState.getSnapshot();
                const messages = await this.contextBuilder.buildChatMessages(prompt, history, {
                    activeMode: snapshot.mode,
                    activeProject: snapshot.project,
                });

                responseText = await this.aiProvider.chat(messages);
            }

            // 3. Reproduz áudio via sintetizador de voz (caso configurado e solicitado)
            if (options?.speakResponse && this.ttsProvider) {
                this.sessionState.setStatus('SPEAKING');
                await this.ttsProvider.speak(responseText);
            }

            this.sessionState.setStatus('IDLE');
            return responseText;
        } catch (error) {
            this.sessionState.setStatus('ERROR');
            this.logger.error('Erro ao processar solicitação no JarvisCore:', error as Error);

            if (error instanceof AppError) {
                throw error;
            }

            throw new AppError(
                `Falha interna ao processar comando: ${(error as Error).message}`,
                500
            );
        }
    }

    /**
     * Inicia a escuta em segundo plano pela palavra de ativação (Ex: "Jarvis")
     */
    public async startWakeWordListening(onWakeDetected?: (word?: string) => void): Promise<void> {
        if (!this.wakeWordProvider) {
            this.logger.warn('Provedor de Wake Word não foi injetado no JarvisCore.');
            return;
        }

        this.logger.info('Iniciando detecção de palavra de ativação em segundo plano...');
        await this.wakeWordProvider.startListening((word) => {
            this.logger.info(`Palavra de ativação detectada: ${word || 'Jarvis'}`);
            this.sessionState.setStatus('LISTENING');
            if (onWakeDetected) {
                onWakeDetected(word);
            }
        });
    }

    /**
     * Interrompe a escuta passiva da palavra de ativação
     */
    public async stopWakeWordListening(): Promise<void> {
        if (this.wakeWordProvider && this.wakeWordProvider.isListening) {
            await this.wakeWordProvider.stopListening();
            this.sessionState.setStatus('IDLE');
            this.logger.info('Detecção de palavra de ativação interrompida.');
        }
    }

    /**
     * Vocaliza um texto diretamente usando o provedor de TTS injetado
     */
    public async speak(text: string): Promise<void> {
        if (!this.ttsProvider) {
            this.logger.warn('Provedor de síntese de voz (TTS) não configurado.');
            return;
        }

        this.sessionState.setStatus('SPEAKING');
        try {
            await this.ttsProvider.speak(text);
        } finally {
            this.sessionState.setStatus('IDLE');
        }
    }

    /**
     * Interrompe qualquer áudio em reprodução
     */
    public async stopSpeech(): Promise<void> {
        if (this.ttsProvider && this.ttsProvider.stop) {
            await this.ttsProvider.stop();
            this.sessionState.setStatus('IDLE');
        }
    }

    /**
     * Lógica isolada para tratar a gravação de memórias no banco de dados
     */
    private async handleSaveMemoryIntent(prompt: string, extractedContent?: string): Promise<string> {
        const contentToSave =
            extractedContent ||
            prompt
                .replace(
                    /^(jarvis,?\s*|ei jarvis,?\s*)?(memorize|lembre-se|salve essa memória|guarde essa informação)\s*(que\s*)?/i,
                    ''
                )
                .trim();

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

    // Delegação de métodos de estado para o SessionState
    public setMode(mode: string): void {
        this.sessionState.setMode(mode);
        this.logger.info(`Modo alterado para: ${this.sessionState.getMode()}`);
    }

    public setProject(project: string): void {
        this.sessionState.setProject(project);
        this.logger.info(`Projeto ativo alterado para: ${this.sessionState.getProject()}`);
    }

    public getMode(): string {
        return this.sessionState.getMode();
    }

    public getProject(): string {
        return this.sessionState.getProject();
    }

    public getSessionState(): SessionState {
        return this.sessionState;
    }
}