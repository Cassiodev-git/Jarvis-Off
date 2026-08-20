import { ILanguageModel } from './contracts/ILanguageModel.js';
import { LoggerProvider } from '../infrastructure/logger/LoggerProvider.js';
import { IntentPayloadSanitizer } from './services/IntentPayloadSanitizer.js';
import { PhoneticNormalizer } from './services/PhoneticNormalizer.js';

export type IntentType =
    | 'SAVE_MEMORY'
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
            patterns: [
                /^(jarvis,?\s*)?bom\s+dia\b/i,
            ],
        },

        // 1. Salvar memória
        {
            intent: 'SAVE_MEMORY',
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

        // 2. Mudança de Modo de Operação (ex: "vamos codar", "modo normal")
        {
            intent: 'CHANGE_MODE',
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
            patterns: [
                /^(jarvis,?\s*)?(desligue(?:-se)?|tchau)\s*(jarvis|sistema)?$/i,
                /^(jarvis,?\s*)?(feche)\s+(o\s+)?(jarvis|sistema)$/i,
                /^(desligar|encerrar)\s+(jarvis|sistema)$/i,
            ],
        },

        // 6. Fechar Aplicações (ex: "feche o VS Code", "encerre o chrome")
        {
            intent: 'CLOSE_APPLICATION',
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

        const cleanPrompt = PhoneticNormalizer.normalize(prompt);

        for (const rule of this.rules) {
            for (const pattern of rule.patterns) {
                const match = pattern.exec(cleanPrompt);
                if (match) {
                    const payload = rule.extractPayload
                        ? rule.extractPayload(match, cleanPrompt)
                        : undefined;

                    this.logger?.debug(`[IntentManager] Intenção detectada: ${rule.intent}`, { payload });

                    return {
                        intent: rule.intent,
                        confidence: 1.0,
                        payload,
                    };
                }
            }
        }

        this.logger?.debug('[IntentManager] Nenhuma regra casou. Encaminhando para CHAT (LLM).');

        // Fallback: Se nenhuma regra determinística casar, encaminha para o LLM
        return {
            intent: 'CHAT',
            confidence: 1.0,
        };
    }
}
