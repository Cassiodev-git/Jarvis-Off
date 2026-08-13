import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import { AIProvider, ChatMessage } from './AIProvider.js';

export class OllamaProvider implements AIProvider {
    private baseUrl: string;
    private defaultModel: string;

    constructor() {
        this.baseUrl = env.OLLAMA_URL;
        this.defaultModel = env.OLLAMA_MODEL;
    }

    public async chat(messages: ChatMessage[], model?: string): Promise<string> {
        try {
            const response = await fetch(`${this.baseUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: model || this.defaultModel,
                    messages,
                    stream: false,
                }),
            });

            if (!response.ok) {
                throw new AppError(
                    `Falha na comunicação com o Ollama (${response.status}): ${response.statusText}`,
                    response.status
                );
            }

            const data = (await response.json()) as {
                message: { role: string; content: string };
            };

            return data.message.content;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            throw new AppError(
                `Erro de conexão no serviço de IA (Ollama): ${(error as Error).message}`,
                500
            );
        }
    }
}