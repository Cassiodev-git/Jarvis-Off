import { FastifyInstance } from 'fastify';
import { askOllama, Message } from '../modules/ai/ollama.service.js';
import { MemoryManager } from '../modules/memory/memory.manager.js';
import { speak } from '../voice/tts.service.js';
import { extractRealtimeContext } from '../services/intent.service.js';

export async function chatRoutes(app: FastifyInstance) {
    app.post('/api/chat', async (request, reply) => {
        const { message, speakResponse = true } = request.body as {
            message: string;
            speakResponse?: boolean;
        };

        if (!message || message.trim() === '') {
            return reply.status(400).send({ error: 'A mensagem não pode estar vazia.' });
        }

        try {
            await MemoryManager.recordInteraction('user', message);

            // 1. Busca dados em tempo real da internet (Dólar, Tempo, Data/Hora)
            const realtimeData = await extractRealtimeContext(message);

            // 2. Monta o Prompt de Sistema contendo os dados recuperados
            const baseSystemPrompt = await MemoryManager.buildSystemPrompt();
            const enrichedSystemPrompt = `${baseSystemPrompt}\n\n[DADOS EM TEMPO REAL DA INTERNET]:\n${realtimeData}\nUse essas informações atualizadas para responder com precisão ao usuário.`;

            const recentHistory = await MemoryManager.getRecentHistory(6);

            const fullPayload: Message[] = [
                { role: 'system', content: enrichedSystemPrompt },
                ...recentHistory,
            ];

            // 3. Processa a resposta com Ollama
            const assistantResponse = await askOllama(fullPayload);
            await MemoryManager.recordInteraction('assistant', assistantResponse);

            // 4. Executa a fala e aguarda concluir
            if (speakResponse) {
                await speak(assistantResponse);
            }

            return {
                status: 'success',
                response: assistantResponse,
            };
        } catch (error) {
            app.log.error(error);
            return reply.status(500).send({
                error: 'Erro interno ao processar a mensagem do Jarvis.',
            });
        }
    });
}