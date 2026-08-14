export interface ChatMessage {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
}

export interface LanguageModelOptions {
    model?: string;
    temperature?: number;
    systemPrompt?: string;
    maxTokens?: number;
}

export interface ILanguageModel {
    /**
     * Envia uma mensagem simples e recebe a resposta textual completa.
     */
    generateText(prompt: string, options?: LanguageModelOptions): Promise<string>;

    chat(messages: ChatMessage[], options?: LanguageModelOptions): Promise<string>;

    streamText?(
        prompt: string,
        onChunk: (chunk: string) => void,
        options?: LanguageModelOptions
    ): Promise<string>;
}