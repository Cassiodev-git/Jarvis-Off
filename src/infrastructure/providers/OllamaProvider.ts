import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import { ILanguageModel, ChatMessage, LanguageModelOptions } from '../../core/contracts/ILanguageModel.js';

export class OllamaProvider implements ILanguageModel {
    private baseUrl: string;
    private defaultModel: string;

    constructor(baseUrl?: string, defaultModel?: string) {
        this.baseUrl = (baseUrl || env.OLLAMA_URL || 'http://localhost:11434').replace(/\/$/, '');
        this.defaultModel = defaultModel || env.OLLAMA_MODEL || 'llama3';
    }

    /**
     * Envia um prompt simples e retorna a resposta de texto limpa.
     */
    public async generateText(prompt: string, options?: LanguageModelOptions): Promise<string> {
        try {
            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: options?.model || this.defaultModel,
                    prompt,
                    system: options?.systemPrompt,
                    stream: false,
                    options: {
                        temperature: options?.temperature ?? 0.7,
                        num_predict: options?.maxTokens,
                    },
                }),
            });

            if (!response.ok) {
                throw new AppError(
                    `Falha na comunicação com o Ollama (${response.status}): ${response.statusText}`,
                    response.status
                );
            }

            const data = (await response.json()) as { response: string };
            const rawText = data.response || '';

            return this.cleanTextForTTS(rawText);
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(
                `Erro de conexão no serviço de IA (Ollama): ${(error as Error).message}`,
                500
            );
        }
    }

    /**
     * Envia o histórico de mensagens da conversa e retorna a resposta formatada.
     */
    public async chat(messages: ChatMessage[], options?: LanguageModelOptions): Promise<string> {
        try {
            const formattedMessages = [...messages];

            if (options?.systemPrompt) {
                formattedMessages.unshift({
                    role: 'system',
                    content: options.systemPrompt,
                });
            }

            const response = await fetch(`${this.baseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: options?.model || this.defaultModel,
                    messages: formattedMessages,
                    stream: false,
                    options: {
                        temperature: options?.temperature ?? 0.7,
                        num_predict: options?.maxTokens,
                    },
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

            const rawContent = data.message?.content || '';

            return this.cleanTextForTTS(rawContent);
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(
                `Erro de conexão no serviço de IA (Ollama): ${(error as Error).message}`,
                500
            );
        }
    }

    /**
     * Envia uma requisição em modo streaming emitindo trechos de resposta em tempo real.
     */
    public async streamText(
        prompt: string,
        onChunk: (chunk: string) => void,
        options?: LanguageModelOptions
    ): Promise<string> {
        try {
            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: options?.model || this.defaultModel,
                    prompt,
                    system: options?.systemPrompt,
                    stream: true,
                    options: {
                        temperature: options?.temperature ?? 0.7,
                        num_predict: options?.maxTokens,
                    },
                }),
            });

            if (!response.ok || !response.body) {
                throw new AppError(
                    `Falha no streaming do Ollama (${response.status}): ${response.statusText}`,
                    response.status
                );
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunkText = decoder.decode(value, { stream: true });
                const lines = chunkText.split('\n').filter((l) => l.trim().length > 0);

                for (const line of lines) {
                    try {
                        const parsed = JSON.parse(line) as { response: string };
                        if (parsed.response) {
                            fullText += parsed.response;
                            onChunk(parsed.response);
                        }
                    } catch {
                        // Linha parcial descartada do buffer
                    }
                }
            }

            return this.cleanTextForTTS(fullText);
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(
                `Erro na transmissão do serviço de IA (Ollama): ${(error as Error).message}`,
                500
            );
        }
    }

    /**
     * Sanitiza o texto removendo caracteres e formatações de Markdown (*, #, `, etc.)
     * para evitar que o sintetizador de voz (Piper) leia artefatos visuais.
     */
    public cleanTextForTTS(text: string): string {
        return text
            .replace(/```[\s\S]*?```/g, '')  // Remove blocos de código
            .replace(/`([^`]+)`/g, '$1')     // Remove código inline
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remove negrito
            .replace(/\*(.*?)\*/g, '$1')     // Remove itálico
            .replace(/#+\s/g, '')            // Remove cabeçalhos/títulos
            .replace(/[\r\n]+/g, ' ')        // Substitui quebras de linha por espaço
            .replace(/\s+/g, ' ')            // Normaliza múltiplos espaços
            .trim();
    }
}