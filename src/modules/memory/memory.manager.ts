import { db } from './db';
import { userProfile, systemState, memories, conversationHistory } from './schema.js';
import { eq, gte, desc } from 'drizzle-orm';

export class MemoryManager {
    /**
     * Constrói o System Prompt dinâmico injetando Perfil, Estado Atual e Memórias Críticas (Nível 4 e 5)
     */
    static async buildSystemPrompt(): Promise<string> {
        // 1. Buscar Perfil do Usuário
        const profile = await db.select().from(userProfile).limit(1);
        const user = profile[0] || { name: 'Cássio', title: 'Senhor', personality: 'Humor leve' };

        // 2. Buscar Estado Atual do Sistema
        const states = await db.select().from(systemState);
        const stateContext = states.map((s) => `${s.key}: ${s.value}`).join(' | ') || 'Nenhum estado ativo';

        // 3. Buscar Memórias Críticas (Importância >= 4)
        const criticalMemories = await db
            .select()
            .from(memories)
            .where(gte(memories.importance, 4))
            .limit(10);

        const memoryContext = criticalMemories.map((m) => `- ${m.content}`).join('\n');

        // Prompt do Sistema Otimizado e Enxuto
        return `Você é o Jarvis, um assistente pessoal local e inteligente.
Você está conversando com: ${user.name} (Tratamento: ${user.title}).
Estilo de resposta: ${user.personality}.

ESTADO ATUAL DO SISTEMA:
${stateContext}

MEMÓRIAS E REGRAS IMPORTANTES DO USUÁRIO:
${memoryContext || 'Nenhuma memória registrada ainda.'}

Responda de forma direta, cortês e respeite o contexto atual.`;
    }

    /**
     * Obtém o histórico recente de conversas (curto prazo)
     */
    static async getRecentHistory(limit: number = 6) {
        const history = await db
            .select()
            .from(conversationHistory)
            .orderBy(desc(conversationHistory.createdAt))
            .limit(limit);

        return history.reverse().map((h) => ({
            role: h.role as 'user' | 'assistant' | 'system',
            content: h.content,
        }));
    }

    /**
     * Salva a interação na tabela de histórico
     */
    static async recordInteraction(role: 'user' | 'assistant', content: string) {
        await db.insert(conversationHistory).values({ role, content });
    }
}