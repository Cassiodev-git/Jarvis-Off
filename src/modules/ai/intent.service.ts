import { askOllama } from './ollama.service.js';

export interface ExtractedContext {
    intent: 'chat' | 'command' | 'update_device' | 'new_memory';
    action?: string;
    memoryToSave?: {
        content: string;
        category: 'aprendizado' | 'preferencia' | 'decisao' | 'hardware';
        importance: number; // 1 a 5
    };
}

export async function analyzeIntentAndMemory(userMessage: string): Promise<any>{
    const prompt = `Analise a mensagem do usuário e retorne APENAS um JSON válido (sem textos adicionais) no formato:
{
"intent": "chat" | "command" | "update_device" | "new_memory",
"action": "nome_da_acao_se_houver_comando",
"memoryToSave": {
"content": "descrição do fato importante aprendido",
"category": "aprendizado" | "preferencia" | "decisao" | "hardware",
"importance": 1 a 5
}
}

Regras:
1. Se o usuário estiver apenas conversando, intent = "chat".
2. Se o usuário disser que prefere algo, comprou hardware, ou tomou uma decisão técnica, defina intent = "new_memory" e preencha memoryToSave.
3. Importância 5 = Fatos permanentes/críticos. Importância 1 = Irrelevante.

Mensagem do usuário: "${userMessage}"`;

    try {
        const rawResponse = await askOllama([{ role: 'user', content: prompt }]);
        // Extrai apenas o bloco JSON da resposta da IA
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]) as ExtractedContext;
        }
    } catch (err) {
        console.error('Erro ao extrair intenção/memória:', err);
    }

    return { intent: 'chat' };
}