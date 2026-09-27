import { ILanguageModel, ChatMessage } from './contracts/ILanguageModel.js';
import { ITextToSpeech } from './contracts/ITextToSpeech.js';
import { IWakeWord } from './contracts/IWakeWord.js';
import { ContextBuilder } from './services/ContextBuilder.js';
import { IntentManager } from './IntentManager.js';
import { SessionState } from './services/SessionState.js';
import { MemoryController } from '../modules/memory/controller/memory.controller.js';
import { LoggerProvider } from '../infrastructure/logger/LoggerProvider.js';
import { AppError } from '../shared/errors/AppError.js';
import { CommandDispatcher } from '../modules/system/CommandDispatcher.js';
import { PhoneticNormalizer } from './services/PhoneticNormalizer.js';
import { ResponseFormatter } from './services/ResponseFormatter.js';
import { MorningBriefingService } from './services/MorningBriefingService.js';
import { INewsProvider, NewsItem } from './contracts/INewsProvider.js';
import { IBrowserAutomation } from './contracts/IBrowserAutomation.js';
import { IVisionProvider } from './contracts/IVisionProvider.js';
import { PluginRegistry } from './plugins/PluginRegistry.js';

export interface JarvisCoreDependencies {
    aiProvider: ILanguageModel;
    memoryController: MemoryController;
    contextBuilder: ContextBuilder;
    intentManager: IntentManager;
    sessionState: SessionState;
    logger: LoggerProvider;
    commandDispatcher?: CommandDispatcher;
    morningBriefingService?: MorningBriefingService;
    newsProvider?: INewsProvider;
    browserAutomation?: IBrowserAutomation;
    visionProvider?: IVisionProvider;
    ttsProvider?: ITextToSpeech;
    wakeWordProvider?: IWakeWord;
    pluginRegistry?: PluginRegistry;
    onShutdownRequested?: () => Promise<void> | void;
}

export class JarvisCore {
    private readonly aiProvider: ILanguageModel;
    private readonly memoryController: MemoryController;
    private readonly contextBuilder: ContextBuilder;
    private readonly intentManager: IntentManager;
    private readonly sessionState: SessionState;
    private readonly logger: LoggerProvider;
    private readonly commandDispatcher?: CommandDispatcher;
    private readonly morningBriefingService?: MorningBriefingService;
    private readonly newsProvider?: INewsProvider;
    private readonly browserAutomation?: IBrowserAutomation;
    private readonly visionProvider?: IVisionProvider;
    private readonly ttsProvider?: ITextToSpeech;
    private readonly wakeWordProvider?: IWakeWord;
    private readonly pluginRegistry?: PluginRegistry;
    private readonly onShutdownRequested?: () => Promise<void> | void;
    private pendingMemoryDeletion?: string;
    private pendingBrowserClick?: { kind: 'selector' | 'text'; value: string };

    constructor(deps: JarvisCoreDependencies) {
        this.aiProvider = deps.aiProvider;
        this.memoryController = deps.memoryController;
        this.contextBuilder = deps.contextBuilder;
        this.intentManager = deps.intentManager;
        this.sessionState = deps.sessionState;
        this.logger = deps.logger;
        this.commandDispatcher = deps.commandDispatcher;
        this.morningBriefingService = deps.morningBriefingService;
        this.newsProvider = deps.newsProvider;
        this.browserAutomation = deps.browserAutomation;
        this.visionProvider = deps.visionProvider;
        this.ttsProvider = deps.ttsProvider;
        this.wakeWordProvider = deps.wakeWordProvider;
        this.pluginRegistry = deps.pluginRegistry;
        this.onShutdownRequested = deps.onShutdownRequested;
    }

    /**
     * Processa um prompt de texto do usuário, analisa a intenção, gera a resposta
     * com o LLM e opcionalmente vocaliza o resultado.
     */
    public async handleUserPrompt(
        prompt: string,
        history: ChatMessage[] = [],
        options?: { speakResponse?: boolean; awaitSpeech?: boolean }
    ): Promise<string> {
        if (!prompt || !prompt.trim()) {
            throw new AppError('O prompt do usuário não pode estar vazio.', 400);
        }

        this.logger.info(`Processando solicitação: "${prompt}"`);
        this.sessionState.setStatus('THINKING');

        try {
            if (this.pendingMemoryDeletion) {
                if (/^(?:sim|s[ií]m|confirmo|confirma|pode apagar|pode remover)[.!\s]*$/i.test(prompt.trim())) {
                    const id = this.pendingMemoryDeletion;
                    this.pendingMemoryDeletion = undefined;
                    await this.memoryController.delete(id);
                    return this.finishResponse('Memória apagada.', options);
                }

                if (/^(?:n[aã]o|cancele|cancelar)[.!\s]*$/i.test(prompt.trim())) {
                    this.pendingMemoryDeletion = undefined;
                    return this.finishResponse('Exclusão cancelada.', options);
                }

                this.pendingMemoryDeletion = undefined;
            }

            if (this.pendingBrowserClick) {
                if (/^(?:sim|s[ií]m|confirmo|confirma|pode clicar)[.!\s]*$/i.test(prompt.trim())) {
                    const action = this.pendingBrowserClick;
                    this.pendingBrowserClick = undefined;
                    const response = action.kind === 'selector'
                        ? await this.browserAutomation?.click(action.value)
                        : await this.browserAutomation?.clickText(action.value);
                    return this.finishResponse(response || 'Automação do navegador indisponível.', options);
                }

                if (/^(?:n[aã]o|cancele|cancelar)[.!\s]*$/i.test(prompt.trim())) {
                    this.pendingBrowserClick = undefined;
                    return this.finishResponse('Clique cancelado.', options);
                }

                this.pendingBrowserClick = undefined;
            }

            // 1. Analisa a intenção da entrada do usuário
            const intentResult = await this.intentManager.analyze(prompt);
            this.logger.debug(`Intenção detectada: ${intentResult.intent}`);

            let responseText = '';
            let shutdownRequested = false;

            // 2. Trata comandos determinísticos ou delega ao LLM
            if (intentResult.intent === 'GOOD_MORNING' && this.morningBriefingService) {
                responseText = await this.morningBriefingService.createBriefing();
            } else if (intentResult.intent === 'SAVE_MEMORY') {
                responseText = await this.handleSaveMemoryIntent(
                    prompt,
                    intentResult.payload?.rawContent as string | undefined
                );
            } else if (intentResult.intent === 'UPDATE_MEMORY') {
                responseText = await this.handleUpdateMemoryIntent(
                    String(intentResult.payload?.id ?? ''),
                    String(intentResult.payload?.rawContent ?? ''),
                    String(intentResult.payload?.memoryQuery ?? ''),
                );
            } else if (intentResult.intent === 'DELETE_MEMORY') {
                responseText = await this.handleDeleteMemoryIntent(
                    String(intentResult.payload?.id ?? ''),
                    String(intentResult.payload?.memoryQuery ?? ''),
                );
            } else if (intentResult.intent === 'SEARCH_NEWS' && this.newsProvider) {
                responseText = await this.handleNewsIntent(String(intentResult.payload?.query ?? ''));
            } else if (this.browserAutomation && intentResult.intent.startsWith('BROWSER_')) {
                responseText = await this.handleBrowserIntent(intentResult.intent, intentResult.payload);
            } else if (intentResult.intent === 'CHANGE_MODE') {
                const targetMode = (intentResult.payload?.mode as string) || 'NORMAL';
                this.sessionState.setMode(targetMode);
                responseText = `Modo de operação alterado para ${targetMode}.`;
            } else if (intentResult.intent === 'OPEN_APPLICATION' && this.commandDispatcher) {
                const target = String(intentResult.payload?.target ?? '');
                const result = await this.commandDispatcher.dispatch('OPEN_APPLICATION', {
                    appName: this.normalizeApplicationName(target),
                });
                responseText = result.success ? result.message : `Não foi possível abrir a aplicação: ${result.message}`;
            } else if (intentResult.intent === 'RUN_SCRIPT' && this.commandDispatcher) {
                const scriptName = String(intentResult.payload?.scriptName ?? '');
                const result = await this.commandDispatcher.dispatch('RUN_SCRIPT', { scriptName });
                responseText = result.success ? result.message : `Não foi possível executar o script: ${result.message}`;
            } else if (intentResult.intent === 'CLOSE_APPLICATION' && this.commandDispatcher) {
                const target = String(intentResult.payload?.target ?? '');
                const result = await this.commandDispatcher.dispatch('CLOSE_APPLICATION', {
                    appName: this.normalizeApplicationName(target),
                });
                responseText = result.success ? result.message : `Não foi possível encerrar a aplicação: ${result.message}`;
            } else if (intentResult.intent === 'SYSTEM_SHUTDOWN') {
                shutdownRequested = true;
                responseText = 'Encerrando o Jarvis.';
            } else {
                const normalizedPrompt = PhoneticNormalizer.normalize(prompt);
                const snapshot = this.sessionState.getSnapshot();
                const messages = await this.contextBuilder.buildChatMessages(normalizedPrompt, history, {
                    activeMode: snapshot.mode,
                    activeProject: snapshot.project,
                });

                responseText = await this.aiProvider.chat(messages);
            }

            responseText = ResponseFormatter.format(responseText);

            // 3. Encaminha toda resposta para o contrato de TTS, salvo opt-out explícito.
            if (this.ttsProvider && options?.speakResponse !== false) {
                if (options?.awaitSpeech === false) {
                    this.speakInBackground(responseText);
                } else {
                    this.sessionState.setStatus('SPEAKING');
                    await this.ttsProvider.speak(responseText);
                }
            }

            if (options?.awaitSpeech !== false) {
                this.sessionState.setStatus('IDLE');
            }

            if (shutdownRequested) {
                await this.onShutdownRequested?.();
            }
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

    /** Alias semântico para consumidores de interfaces interativas. */
    public async processPrompt(
        prompt: string,
        history: ChatMessage[] = [],
        options?: { speakResponse?: boolean; awaitSpeech?: boolean }
    ): Promise<string> {
        return this.handleUserPrompt(prompt, history, options);
    }

    private speakInBackground(text: string): void {
        if (!this.ttsProvider) return;

        this.sessionState.setStatus('SPEAKING');
        void this.ttsProvider.speak(text)
            .catch((error: unknown) => {
                this.logger.error('Erro ao reproduzir resposta em segundo plano:', error as Error);
            })
            .finally(() => {
                if (this.sessionState.getSnapshot().status === 'SPEAKING') {
                    this.sessionState.setStatus('IDLE');
                }
            });
    }

    private async finishResponse(
        text: string,
        options?: { speakResponse?: boolean; awaitSpeech?: boolean },
    ): Promise<string> {
        const responseText = ResponseFormatter.format(text);
        if (this.ttsProvider && options?.speakResponse !== false) {
            if (options?.awaitSpeech === false) this.speakInBackground(responseText);
            else {
                this.sessionState.setStatus('SPEAKING');
                await this.ttsProvider.speak(responseText);
            }
        }
        if (options?.awaitSpeech !== false) this.sessionState.setStatus('IDLE');
        return responseText;
    }

    private normalizeApplicationName(target: string): string {
        const normalized = target
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();

        const aliases: Record<string, string> = {
            'vs code': 'code',
            'visual studio code': 'code',
            chrome: 'google-chrome',
            'google chrome': 'google-chrome',
            navegador: 'google-chrome',
            brave: 'brave-browser',
            'gerenciador de arquivos': 'nautilus',
        };

        return aliases[normalized] ?? normalized;
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

    private async handleUpdateMemoryIntent(id: string, content: string, query: string): Promise<string> {
        if ((!id && !query) || !content || content.length < 3) {
            return 'Informe a memória e o novo conteúdo.';
        }

        if (!id) {
            const matches = await this.memoryController.search(query, 2);
            if (matches.length === 0) return 'Não encontrei essa memória.';
            if (matches.length > 1) return 'Encontrei mais de uma memória. Informe o UUID.';
            id = matches[0].id;
        }

        await this.memoryController.update(id, { content });
        return 'Memória atualizada.';
    }

    private async handleDeleteMemoryIntent(id: string, query: string): Promise<string> {
        if (!id && !query) return 'Informe a memória que deseja apagar.';

        if (!id) {
            const matches = await this.memoryController.search(query, 2);
            if (matches.length === 0) return 'Não encontrei essa memória.';
            if (matches.length > 1) return 'Encontrei mais de uma memória. Informe o UUID.';
            id = matches[0].id;
        }

        this.pendingMemoryDeletion = id;
        return 'Confirma a exclusão desta memória? Responda sim ou não.';
    }

    private async handleNewsIntent(query: string): Promise<string> {
        if (!query) return 'Informe o tema das notícias que deseja buscar.';

        const items = await this.newsProvider?.search(query);
        if (!items || items.length === 0) return `Não encontrei notícias recentes sobre ${query}.`;

        return this.formatNews(query, items);
    }

    private formatNews(query: string, items: NewsItem[]): string {
        const headlines = items.slice(0, 5).map((item, index) =>
            `${index + 1}. ${item.title} (${item.source})`
        );
        return `Notícias sobre ${query}: ${headlines.join('; ')}`;
    }

    private async handleBrowserIntent(
        intent: string,
        payload?: Record<string, unknown>,
    ): Promise<string> {
        const browser = this.browserAutomation;
        if (!browser) return 'A automação do navegador não está disponível.';

        switch (intent) {
            case 'BROWSER_OPEN':
                return browser.open(String(payload?.url ?? ''));
            case 'BROWSER_SEARCH':
                return browser.search(String(payload?.query ?? ''));
            case 'BROWSER_NEW_TAB':
                return browser.newTab(payload?.url ? String(payload.url) : undefined);
            case 'BROWSER_CLOSE_TAB':
                return browser.closeTab();
            case 'BROWSER_BACK':
                return browser.back();
            case 'BROWSER_FORWARD':
                return browser.forward();
            case 'BROWSER_REFRESH':
                return browser.refresh();
            case 'BROWSER_READ':
                return browser.readPage();
            case 'BROWSER_LIST_TABS': {
                const tabs = await browser.listTabs();
                return tabs.length === 0
                    ? 'Não há abas abertas.'
                    : tabs.map((tab) => `${tab.index + 1}. ${tab.title || 'Sem título'}`).join('; ');
            }
            case 'BROWSER_CLICK':
                if (await browser.requiresClickConfirmation(String(payload?.selector ?? ''))) {
                    this.pendingBrowserClick = { kind: 'selector', value: String(payload?.selector ?? '') };
                    return 'Esse clique pode enviar ou confirmar um formulário. Confirma? Responda sim ou não.';
                }
                return browser.click(String(payload?.selector ?? ''));
            case 'BROWSER_CLICK_TEXT':
                this.pendingBrowserClick = { kind: 'text', value: String(payload?.text ?? '') };
                return 'Esse clique pode enviar ou confirmar um formulário. Confirma? Responda sim ou não.';
            case 'BROWSER_FILL_LABEL':
                return browser.fillLabel(String(payload?.label ?? ''), String(payload?.value ?? ''));
            case 'BROWSER_SELECT_TAB':
                return browser.selectTab(Number(payload?.index ?? 1));
            case 'BROWSER_WORKFLOW':
                return browser.searchAndRead(String(payload?.query ?? ''));
            case 'BROWSER_SCREEN_ANALYZE':
                if (!this.visionProvider) return 'O modelo de visão não está configurado.';
                return this.visionProvider.analyze(
                    await browser.analyzeScreen(),
                    'Descreva somente os elementos importantes e ações possíveis nesta tela. Ignore URLs, links e endereços. Seja conciso.',
                );
            case 'BROWSER_FILL':
                return browser.fill(String(payload?.selector ?? ''), String(payload?.value ?? ''));
            case 'BROWSER_SELECT_VIDEO':
                return browser.selectVideo(Number(payload?.index ?? 1), payload?.title ? String(payload.title) : undefined);
            default:
                return 'Ação de navegador não reconhecida.';
        }
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

    public getPlugins(): readonly import('./plugins/JarvisPlugin.js').JarvisPlugin[] {
        return this.pluginRegistry?.list() ?? [];
    }
}
