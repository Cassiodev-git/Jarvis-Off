// src/core/contracts/ILanguageModel.ts

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface ILanguageModel {
    /**
     * Envia o histórico de mensagens para a LLM e retorna a resposta.
     */
    chat(messages: ChatMessage[]): Promise<string>;
}