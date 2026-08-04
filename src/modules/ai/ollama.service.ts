import { env } from '../../config/env';

export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export async function askOllama(
    messages: Message[],
    model: string = 'qwen2.5:3b'
): Promise<string> {
    try {
        const response = await fetch(`${env.OLLAMA_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                stream: false,
            }),
        });

        if (!response.ok) {
            throw new Error(`Erro na comunicação com o Ollama: ${response.statusText}`);
        }

        const data = (await response.json()) as {
            message: { role: string; content: string };
        };

        return data.message.content;
    } catch (error) {
        console.error('Erro no servico Ollama:', error);
        throw error;
    }
}