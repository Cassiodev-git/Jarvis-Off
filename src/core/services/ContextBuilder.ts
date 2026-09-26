import { MemoryService } from '../../modules/memory/service/memory.service.js';
import { ChatMessage } from '../contracts/ILanguageModel.js';
import { LoggerProvider } from '../../infrastructure/logger/LoggerProvider.js';
import { BEHAVIOR_PROMPT } from '../../config/behaviorPrompt.js';
import { env } from '../../config/env.js';

export interface ContextOptions {
    activeMode?: string;
    activeProject?: string;
}

export class ContextBuilder {
    constructor(
        private readonly memoryService: MemoryService,
        private readonly logger?: LoggerProvider
    ) {}

    public async buildSystemPrompt(options?: ContextOptions): Promise<string> {
        let memoryContext = 'Nenhuma memória cadastrada no momento.';
        const project = options?.activeProject;

        try {
            const memories = await this.memoryService.getContextualMemories({
                minImportance: 2,
                projectId: project,
                limit: 20,
            });

            if (memories && memories.length > 0) {
                const filteredMemories = memories
                    .map((m) => `• [${m.category.toUpperCase()}]: ${m.content}`);

                if (filteredMemories.length > 0) {
                    memoryContext = filteredMemories.join('\n');
                }
            }
        } catch (error) {
            if (this.logger) {
                this.logger.error('[ContextBuilder] Falha ao recuperar memórias do banco:', error);
            } else {
                console.error('⚠️ [ContextBuilder] Falha ao recuperar memórias do banco:', error);
            }
            
            memoryContext = 'Aviso: Falha temporária ao carregar memórias.';
        }

        const mode = options?.activeMode || 'NORMAL';
        const activeProject = project || 'Nenhum projeto selecionado';

        return `${BEHAVIOR_PROMPT}

---
### ESTADO DO SISTEMA
- Modo de Operação: ${mode}
- Projeto Ativo: ${activeProject}

### MEMÓRIAS CADASTRADAS (SEUS FATOS CONHECIDOS)
${memoryContext}
---

`;
    }

    public async buildChatMessages(
        userMessage: string,
        history: ChatMessage[] = [],
        options?: ContextOptions
    ): Promise<ChatMessage[]> {
        const systemPrompt = await this.buildSystemPrompt(options);

        return [
            { role: 'system', content: systemPrompt },
            ...history.slice(-env.MAX_HISTORY_MESSAGES),
            { role: 'user', content: userMessage },
        ];
    }
}
