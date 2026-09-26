import { ILanguageModel } from './contracts/ILanguageModel.js';
import { LoggerProvider } from '../infrastructure/logger/LoggerProvider.js';
import { IntentPayloadSanitizer } from './services/IntentPayloadSanitizer.js';
import { PhoneticNormalizer } from './services/PhoneticNormalizer.js';

export type IntentType =
    | 'SAVE_MEMORY'
    | 'UPDATE_MEMORY'
    | 'DELETE_MEMORY'
    | 'SEARCH_NEWS'
    | 'BROWSER_OPEN'
    | 'BROWSER_SEARCH'
    | 'BROWSER_NEW_TAB'
    | 'BROWSER_CLOSE_TAB'
    | 'BROWSER_BACK'
    | 'BROWSER_FORWARD'
    | 'BROWSER_REFRESH'
    | 'BROWSER_READ'
    | 'BROWSER_LIST_TABS'
    | 'BROWSER_CLICK'
    | 'BROWSER_FILL'
    | 'BROWSER_CLICK_TEXT'
    | 'BROWSER_FILL_LABEL'
    | 'BROWSER_SELECT_TAB'
    | 'BROWSER_SELECT_VIDEO'
    | 'BROWSER_WORKFLOW'
    | 'BROWSER_SCREEN_ANALYZE'
    | 'GOOD_MORNING'
    | 'CHANGE_MODE'
    | 'OPEN_APPLICATION'
    | 'RUN_SCRIPT'
    | 'CLOSE_APPLICATION'
    | 'SYSTEM_SHUTDOWN'
    | 'CHAT';

export interface IntentResult {
    intent: IntentType;
    confidence: number;
    payload?: {
        target?: string;
        mode?: string;
        rawContent?: string;
        [key: string]: unknown;
    };
}

interface IntentRule {
    intent: IntentType;
    patterns: RegExp[];
    priority?: number;
    extractPayload?: (match: RegExpExecArray, text: string) => Record<string, unknown>;
}

export class IntentManager {
    // ✅ Construtor aceitando as dependências injetadas no index.ts
    constructor(
        private readonly aiProvider?: ILanguageModel,
        private readonly logger?: LoggerProvider
    ) {}

    private readonly rules: IntentRule[] = [
        // 0. Briefing matinal
        {
            intent: 'GOOD_MORNING',
            priority: 80,
            patterns: [
                /^(jarvis,?\s*)?bom\s+dia\b/i,
            ],
        },

        // 1. Salvar memória
        {
            intent: 'SAVE_MEMORY',
            priority: 90,
            patterns: [
                /^(jarvis,?\s*|ei jarvis,?\s*)?(memorize|lembre-se|salve essa memória|guarde essa informação)\s*(que\s*)?/i,
                /^anote\s+(que\s+)?/i,
            ],
            extractPayload: (_match, text) => ({
                rawContent: text
                    .replace(
                        /^(jarvis,?\s*|ei jarvis,?\s*)?(memorize|lembre-se|salve essa memória|guarde essa informação|anote)\s*(que\s*)?/i,
                        ''
                    )
                    .trim(),
            }),
        },

        // Alteração e remoção de qualquer memória identificada pelo UUID.
        {
            intent: 'UPDATE_MEMORY',
            patterns: [
                /^(?:jarvis,?\s*)?(?:altere|alterar|edite|editar|mude|mudar|atualize|atualizar)\s+(?:a\s+)?mem[oó]ria\s+([\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12})\s+(?:para|com)\s+(.+)$/i,
                /^(?:jarvis,?\s*)?(?:altere|edite|mude|atualize)\s+(?:a\s+)?mem[oó]ria\s+que\s+diz\s+(.+?)\s+para\s+(.+)$/i,
            ],
            extractPayload: (match) => match[1]?.includes('-')
                ? { id: match[1], rawContent: match[2].trim() }
                : { memoryQuery: match[1].trim(), rawContent: match[2].trim() },
        },
        {
            intent: 'DELETE_MEMORY',
            priority: 95,
            patterns: [
                /^(?:jarvis,?\s*)?(?:apague|apagar|remova|remover|esque[cç]a|esquecer)\s+(?:a\s+)?mem[oó]ria\s+([\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12})$/i,
                /^(?:jarvis,?\s*)?(?:apague|remova|esque[cç]a)\s+(?:a\s+)?mem[oó]ria\s+que\s+diz\s+(.+)$/i,
            ],
            extractPayload: (match) => match[1]?.includes('-') ? { id: match[1] } : { memoryQuery: match[1].trim() },
        },
        {
            intent: 'SEARCH_NEWS',
            priority: 85,
            patterns: [
                /^(?:jarvis,?\s*)?(?:busque|buscar|pesquise|pesquisar|procure|procurar|liste|listar|mostre|mostrar)\s+(?:as?\s+)?not[ií]cias?\s+(?:sobre|de|do|da|em)\s+(.+)$/i,
                /^(?:jarvis,?\s*)?not[ií]cias?\s+(?:sobre|de|do|da|em)\s+(.+)$/i,
            ],
            extractPayload: (match) => ({ query: match[1].trim() }),
        },
        {
            intent: 'BROWSER_OPEN',
            priority: 92,
            patterns: [
                /^(?:jarvis,?\s*)?abra\s+(?:o\s+)?(?:site|p[aá]gina|url)?\s*(https?:\/\/\S+)$/i,
            ],
            extractPayload: (match) => ({ url: match[1] }),
        },
        {
            intent: 'BROWSER_SEARCH',
            priority: 84,
            patterns: [
                /^(?:jarvis,?\s*)?(?:pesquise|busque|procure)\s+(?:no\s+navegador\s+)?(?:por\s+)?(.+)$/i,
            ],
            extractPayload: (match) => ({ query: match[1].trim() }),
        },
        {
            intent: 'BROWSER_WORKFLOW',
            priority: 94,
            patterns: [
                /^(?:jarvis,?\s*)?(?:pesquise|busque)\s+(.+?),?\s+(?:abra|selecione)\s+(?:o\s+)?primeiro\s+resultado\s+e\s+(?:leia|resuma)\s+a\s+p[aá]gina$/i,
            ],
            extractPayload: (match) => ({ query: match[1].trim() }),
        },
        {
            intent: 'BROWSER_SCREEN_ANALYZE',
            priority: 93,
            patterns: [
                /^(?:jarvis,?\s*)?(?:veja|analise|examine|descreva)\s+(?:a\s+)?(?:minha\s+)?tela$/i,
            ],
        },
        {
            intent: 'BROWSER_NEW_TAB',
            priority: 90,
            patterns: [
                /^(?:jarvis,?\s*)?abra\s+(?:uma\s+)?nova\s+aba(?:\s+(https?:\/\/\S+))?$/i,
            ],
            extractPayload: (match) => ({ url: match[1] }),
        },
        {
            intent: 'BROWSER_CLOSE_TAB',
            priority: 90,
            patterns: [/^(?:jarvis,?\s*)?(?:feche|encerre)\s+a\s+aba$/i],
        },
        {
            intent: 'BROWSER_BACK',
            priority: 90,
            patterns: [/^(?:jarvis,?\s*)?(?:volte|voltar)\s+(?:uma\s+)?p[aá]gina$/i],
        },
        {
            intent: 'BROWSER_FORWARD',
            priority: 90,
            patterns: [/^(?:jarvis,?\s*)?(?:avance|avan[cç]ar)\s+(?:uma\s+)?p[aá]gina$/i],
        },
        {
            intent: 'BROWSER_REFRESH',
            priority: 90,
            patterns: [/^(?:jarvis,?\s*)?(?:atualize|recarregue)\s+a\s+p[aá]gina$/i],
        },
        {
            intent: 'BROWSER_READ',
            priority: 90,
            patterns: [/^(?:jarvis,?\s*)?(?:leia|ler|resuma|resumir)\s+a\s+p[aá]gina$/i],
        },
        {
            intent: 'BROWSER_LIST_TABS',
            priority: 90,
            patterns: [/^(?:jarvis,?\s*)?(?:liste|mostrar|mostre)\s+as?\s+abas$/i],
        },
        {
            intent: 'BROWSER_CLICK',
            priority: 90,
            patterns: [
                /^(?:jarvis,?\s*)?clique\s+(?:no\s+)?(?:elemento|seletor)\s+(.+)$/i,
            ],
            extractPayload: (match) => ({ selector: match[1].trim() }),
        },
        {
            intent: 'BROWSER_FILL',
            priority: 90,
            patterns: [
                /^(?:jarvis,?\s*)?preencha\s+(?:o\s+)?(?:campo|seletor)\s+(.+?)\s+com\s+(.+)$/i,
            ],
            extractPayload: (match) => ({ selector: match[1].trim(), value: match[2].trim() }),
        },
        {
            intent: 'BROWSER_CLICK_TEXT',
            priority: 91,
            patterns: [
                /^(?:jarvis,?\s*)?(?:clique|clicar)\s+(?:no\s+)?(?:bot[aã]o|link|elemento)\s+(.+)$/i,
            ],
            extractPayload: (match) => ({ text: match[1].trim() }),
        },
        {
            intent: 'BROWSER_FILL_LABEL',
            priority: 91,
            patterns: [
                /^(?:jarvis,?\s*)?preencha\s+(?:o\s+)?campo\s+chamado\s+(.+?)\s+com\s+(.+)$/i,
            ],
            extractPayload: (match) => ({ label: match[1].trim(), value: match[2].trim() }),
        },
        {
            intent: 'BROWSER_SELECT_TAB',
            priority: 92,
            patterns: [
                /^(?:jarvis,?\s*)?(?:selecione|seleciona|mude para)\s+(?:a\s+)?aba\s+(\d+)$/i,
            ],
            extractPayload: (match) => ({ index: Number(match[1]) }),
        },
        {
            intent: 'BROWSER_SELECT_VIDEO',
            priority: 92,
            patterns: [
                /^(?:jarvis,?\s*)?(?:selecione|seleciona|abra|clique em)\s+(?:o\s+)?(primeiro|segundo|terceiro|quarto|quinto|[1-5])\s+v[ií]deo(?:\s+(?:com\s+)?t[ií]tulo\s+(.+))?$/i,
            ],
            extractPayload: (match) => ({
                index: IntentManager.videoIndex(match[1]),
                title: match[2]?.trim(),
            }),
        },

        // 2. Mudança de Modo de Operação (ex: "vamos codar", "modo normal")
        {
            intent: 'CHANGE_MODE',
            priority: 80,
            patterns: [
                /^(vamos\s+codar|modo\s+dev|modo\s+desenvolvimento)/i,
                /^(modo\s+normal|modo\s+padrão)/i,
                /^(modo\s+estudo|vamos\s+estudar)/i,
            ],
            extractPayload: (_match, text) => {
                const lower = text.toLowerCase();
                if (lower.includes('codar') || lower.includes('dev') || lower.includes('desenvolvimento')) {
                    return { mode: 'DEV' };
                }
                if (lower.includes('estudo') || lower.includes('estudar')) {
                    return { mode: 'STUDY' };
                }
                return { mode: 'NORMAL' };
            },
        },

        // 3. Abrir Aplicações (ex: "abra o VS Code", "inicie o navegador")
        {
            intent: 'OPEN_APPLICATION',
            priority: 75,
            patterns: [
                /^(jarvis,?\s*)?(abra|inicie|abrir|abram)\s+(o|a)?\s*(.+)/i,
            ],
            extractPayload: (match) => ({
                target: IntentPayloadSanitizer.sanitizeApplicationTarget(match[4] ?? ''),
            }),
        },

        // 4. Executar scripts autorizados (ex: "execute o script typecheck")
        {
            intent: 'RUN_SCRIPT',
            priority: 75,
            patterns: [
                /^(jarvis,?\s*)?(execute|executar|rode|rodar|run)\s+(o\s+)?(?:script\s+)?(.+)/i,
            ],
            extractPayload: (match) => ({
                scriptName: IntentPayloadSanitizer.sanitizeScriptName(match[4] ?? ''),
            }),
        },

        // 5. Desligamento do Assistente (avaliado antes de fechar aplicações)
        {
            intent: 'SYSTEM_SHUTDOWN',
            priority: 100,
            patterns: [
                /^(jarvis,?\s*)?(desligue(?:-se)?|tchau)\s*(jarvis|sistema)?$/i,
                /^(jarvis,?\s*)?(feche)\s+(o\s+)?(jarvis|sistema)$/i,
                /^(desligar|encerrar)\s+(jarvis|sistema)$/i,
            ],
        },

        // 6. Fechar Aplicações (ex: "feche o VS Code", "encerre o chrome")
        {
            intent: 'CLOSE_APPLICATION',
            priority: 70,
            patterns: [
                /^(jarvis,?\s*)?(feche|encerre|fechar)\s+(o|a)?\s*(.+)/i,
            ],
            extractPayload: (match) => ({
                target: IntentPayloadSanitizer.sanitizeApplicationTarget(match[4] ?? ''),
            }),
        },

    ];

    /**
     * Analisa o prompt e retorna a intenção correspondente baseada em regras determinísticas.
     */
    public async analyze(prompt: string): Promise<IntentResult> {
        if (!prompt || !prompt.trim()) {
            return { intent: 'CHAT', confidence: 1.0 };
        }

        const cleanPrompt = IntentPayloadSanitizer.sanitizeInput(
            PhoneticNormalizer.normalize(prompt),
        );

        const candidates: Array<{ rule: IntentRule; match: RegExpExecArray; confidence: number }> = [];
        for (const rule of this.rules) {
            for (const pattern of rule.patterns) {
                const match = pattern.exec(cleanPrompt);
                if (match) {
                    const priority = rule.priority ?? 50;
                    candidates.push({ rule, match, confidence: 0.5 + priority / 200 });
                }
            }
        }

        const selected = candidates.sort((a, b) => b.confidence - a.confidence)[0];
        if (selected) {
            const payload = selected.rule.extractPayload
                ? selected.rule.extractPayload(selected.match, cleanPrompt)
                : undefined;

            this.logger?.debug(`[IntentManager] Intenção detectada: ${selected.rule.intent}`, { payload, confidence: selected.confidence });
            return { intent: selected.rule.intent, confidence: selected.confidence, payload };
        }

        this.logger?.debug('[IntentManager] Nenhuma regra casou. Encaminhando para CHAT (LLM).');

        // Fallback: Se nenhuma regra determinística casar, encaminha para o LLM
        return {
            intent: 'CHAT',
            confidence: 0.2,
        };
    }

    private static videoIndex(value: string): number {
        return ({ primeiro: 1, segundo: 2, terceiro: 3, quarto: 4, quinto: 5 } as Record<string, number>)[value.toLowerCase()]
            || Number(value);
    }
}
