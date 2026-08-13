import { MemoryService } from '../modules/memory/service/memory.service.js';
import { ChatMessage } from '../infrastructure/ai/AIProvider.js';

export interface ContextOptions {
    activeMode?: string;
    activeProject?: string;
}

export class ContextBuilder {
    constructor(private readonly memoryService: MemoryService) {}

    /**
     * Monta o prompt de sistema injetando memórias relevantes e o estado atual do sistema.
     */
    public async buildSystemPrompt(options?: ContextOptions): Promise<string> {
        const memories = await this.memoryService.listAllMemories();

        // Filtra memórias com importância >= 2 para não poluir o contexto
        const memoryContext = memories
            .filter((m) => m.importance >= 2)
            .map((m) => `- [${m.category.toUpperCase()}]: ${m.content}`)
            .join('\n');

        const mode = options?.activeMode || 'NORMAL';
        const project = options?.activeProject || 'Nenhum projeto selecionado';

        return `Você é o J.A.R.V.I.S., um assistente pessoal e parceiro de desenvolvimento local.
Responda de forma direta, clara, objetiva e profissional em português do Brasil.

[ESTADO ATUAL]
- Modo de Operação: ${mode}
- Projeto Ativo: ${project}

[MEMÓRIAS DE LONGO PRAZO RELEVANTES]
${memoryContext || 'Nenhuma memória cadastrada no momento.'}

[DIRETRIZES DE COMPORTAMENTO]
1. Se a dúvida for sobre desenvolvimento, aplique boas práticas de software (Clean Code, SOLID).
2. Não invente informações sobre o usuário ou sobre o projeto que não estejam nas memórias acima.
3. Mantenha respostas sucintas e focadas na resolução do problema.`;
    }

    /**
     * Prepara o array completo de mensagens para ser enviado ao Ollama.
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
