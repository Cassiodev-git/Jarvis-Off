export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface AIProvider {
    /**
     * Envia um histórico de mensagens para o provedor de IA e retorna a resposta gerada.
     * @param messages Histórico de mensagens da conversa.
     * @param model Modelo opcional para sobrescrever o modelo padrão configurado.
     */
    chat(messages: ChatMessage[], model?: string): Promise<string>;
}