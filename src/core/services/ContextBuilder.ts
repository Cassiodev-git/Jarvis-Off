import { MemoryService } from '../../modules/memory/service/memory.service.js';
import { ChatMessage } from '../contracts/ILanguageModel.js';
import { LoggerProvider } from '../../infrastructure/logger/LoggerProvider.js';

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

        try {
            const memories = await this.memoryService.listAllMemories();

            if (memories && memories.length > 0) {
                const filteredMemories = memories
                    .filter((m) => m.importance >= 2)
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
        const project = options?.activeProject || 'Nenhum projeto selecionado';

        return `Você é Jarvis, um assistente pessoal local e direto do desenvolvedor.

---
### ESTADO DO SISTEMA
- Modo de Operação: ${mode}
- Projeto Ativo: ${project}

### MEMÓRIAS CADASTRADAS (SEUS FATOS CONHECIDOS)
${memoryContext}
---

### REGRAS DE IDENTIDADE E RESPOSTA OBRIGATÓRIAS (VIOLAÇÕES SERÃO REJEITADAS):
1. Seu nome falado e escrito é sempre "Jarvis". Nunca escreva ou pronuncie "J.A.R.V.I.S.".
2. Trate o usuário sempre como "senhor". Não o chame por Cássio, Cassio ou pelo nome completo.
3. Termine toda resposta com "senhor".
4. A entrada pode conter erros de transcrição, sotaque ou fonética. Interprete a intenção pelo contexto, sem inventar detalhes; se houver dúvida real, faça uma pergunta curta.
5. PROIBIDO pedir desculpas ("Peço desculpas", "Sinto muito", "Como uma IA", etc.).
6. PROIBIDO dizer que "não tem acesso a dados/histórico". As memórias acima SÃO o seu acesso oficial.
7. Responda DIRETO AO PONTO. Sem preâmbulos, saudações longas ou enrolação.
8. Se a informação solicitada estiver nas "MEMÓRIAS CADASTRADAS", afirme o fato de forma simples e direta.
9. Se a informação NÃO estiver gravada, responda apenas: "Não tenho essa informação registrada no banco, senhor."`;
    }

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
