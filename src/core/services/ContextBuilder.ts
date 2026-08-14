import { MemoryService } from '../../modules/memory/service/memory.service.js';
import { ChatMessage } from '../contracts/ILanguageModel.js';
import { LoggerProvider } from '../../infrastructure/logger/LoggerProvider.js';

export interface ContextOptions {
    activeMode?: string;
    activeProject?: string;
}

export class ContextBuilder {
    // ✅ Injeta o logger no construtor
    constructor(
        private readonly memoryService: MemoryService,
        private readonly logger?: LoggerProvider
    ) {}

    /**
     * Monta o prompt de sistema injetando memórias relevantes e o estado atual do sistema.
     */
    public async buildSystemPrompt(options?: ContextOptions): Promise<string> {
        let memoryContext = 'Nenhuma memória cadastrada no momento.';

        try {
            const memories = await this.memoryService.listAllMemories();

            // Filtra memórias com importância >= 2 para não poluir a janela de contexto
            if (memories && memories.length > 0) {
                const filteredMemories = memories
                    .filter((m) => m.importance >= 2)
                    .map((m) => `- [${m.category.toUpperCase()}]: ${m.content}`);

                if (filteredMemories.length > 0) {
                    memoryContext = filteredMemories.join('\n');
                }
            }
        } catch (error) {
            // ✅ Usa o logger injetado em vez do console.error nativo
            if (this.logger) {
                this.logger.error('[ContextBuilder] Falha ao recuperar memórias do banco:', error);
            } else {
                console.error('⚠️ [ContextBuilder] Falha ao recuperar memórias do banco:', error);
            }
            
            memoryContext = 'Aviso: Falha temporária ao carregar memórias de longo prazo.';
        }

        const mode = options?.activeMode || 'NORMAL';
        const project = options?.activeProject || 'Nenhum projeto selecionado';

        return `Você é o J.A.R.V.I.S., um assistente pessoal e parceiro de desenvolvimento local.
Responda de forma direta, clara, objetiva e profissional em português do Brasil.

[ESTADO ATUAL]
- Modo de Operação: ${mode}
- Projeto Ativo: ${project}

[MEMÓRIAS DE LONGO PRAZO RELEVANTES]
${memoryContext}

[DIRETRIZES DE COMPORTAMENTO]
1. Se a dúvida for sobre desenvolvimento, aplique boas práticas de software (Clean Code, SOLID).
2. Não invente informações sobre o usuário ou sobre o projeto que não estejam nas memórias acima.
3. Mantenha respostas sucintas e conversacionais (evite formatações visuais excessivas ou blocos longos de texto para facilitar a síntese de voz).`;
    }

    /**
     * Prepara o array completo de mensagens para ser enviado ao provedor de IA (LLM).
     */
    public async buildChatMessages(
        userMessage: string,
        history: ChatMessage[] = [],
        options?: ContextOptions
    ): Promise<ChatMessage[]> {
        const systemPrompt = await this.buildSystemPrompt(options);

        return [
            { role: 'system', content: systemPrompt },
            ...history,
            { role: 'user', content: userMessage },
        ];
    }
}