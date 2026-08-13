import { AIProvider } from '../infrastructure/ai/AIProvider.js';

export type IntentType =
    | 'SAVE_MEMORY'
    | 'QUERY_MEMORY'
    | 'CODE_ASSIST'
    | 'CHANGE_MODE'
    | 'CHANGE_PROJECT'
    | 'SYSTEM_COMMAND'
    | 'GENERAL_CHAT';

export interface IntentResult {
    intent: IntentType;
    confidence: number;
    extractedData?: Record<string, unknown>;
}

export class IntentManager {
    private readonly VALID_INTENTS: IntentType[] = [
        'SAVE_MEMORY',
        'QUERY_MEMORY',
        'CODE_ASSIST',
        'CHANGE_MODE',
        'CHANGE_PROJECT',
        'SYSTEM_COMMAND',
        'GENERAL_CHAT',
    ];

    constructor(private readonly aiProvider?: AIProvider) {}

    public async analyze(userPrompt: string): Promise<IntentResult> {
        const normalized = userPrompt.toLowerCase().trim();
        const cleaned = normalized.replace(/^(jarvis,?\s*|ei jarvis,?\s*)/i, '');

        // Regras estritas por Regex
        if (
            cleaned.startsWith('memorize') ||
            cleaned.startsWith('lembre-se') ||
            cleaned.includes('salve essa memória') ||
            cleaned.includes('guarde essa informação')
        ) {
            return {
                intent: 'SAVE_MEMORY',
                confidence: 0.95,
                extractedData: { rawText: userPrompt },
            };
        }

        if (cleaned.includes('modo de desenvolvimento') || cleaned.includes('vamos codar')) {
            return {
                intent: 'CHANGE_MODE',
                confidence: 0.9,
                extractedData: { targetMode: 'DEVELOPMENT' },
            };
        }

        if (cleaned.includes('modo de estudo') || cleaned.includes('vamos estudar')) {
            return {
                intent: 'CHANGE_MODE',
                confidence: 0.9,
                extractedData: { targetMode: 'STUDY' },
            };
        }

        // Para palavras muito curtas (ex: "teste", "ola"), força GENERAL_CHAT sem gastar recurso da IA
        if (cleaned.length < 4) {
            return { intent: 'GENERAL_CHAT', confidence: 0.9 };
        }

        if (this.aiProvider) {
            return await this.classifyWithAI(userPrompt);
        }

        return {
            intent: 'GENERAL_CHAT',
            confidence: 0.7,
        };
    }

    private async classifyWithAI(userPrompt: string): Promise<IntentResult> {
        if (!this.aiProvider) {
            return { intent: 'GENERAL_CHAT', confidence: 0.5 };
        }

        try {
            const prompt = `Classifique a intenção do usuário em uma destas opções exatas: SAVE_MEMORY, QUERY_MEMORY, CODE_ASSIST, CHANGE_MODE, SYSTEM_COMMAND, GENERAL_CHAT.
Responda ESTRITAMENTE em formato JSON: {"intent": "NOME_DA_INTENCAO", "confidence": 0.9}

Mensagem: "${userPrompt}"`;

            const rawResponse = await this.aiProvider.chat([{ role: 'user', content: prompt }]);
            const cleanJson = rawResponse.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(cleanJson);

            const detectedIntent = this.VALID_INTENTS.includes(parsed.intent)
                ? (parsed.intent as IntentType)
                : 'GENERAL_CHAT';

            return {
                intent: detectedIntent,
                confidence: parsed.confidence || 0.8,
            };
        } catch {
            return {
                intent: 'GENERAL_CHAT',
                confidence: 0.5,
            };
        }
    }
}
