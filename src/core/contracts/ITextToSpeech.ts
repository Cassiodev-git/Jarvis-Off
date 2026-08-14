export interface TextToSpeechOptions {
    /**
     * Velocidade da fala (ex: 1.0 é o normal, 1.2 é mais rápido).
     */
    speed?: number;

    /**
     * Identificador do tom/voz caso o provedor suporte múltiplas vozes.
     */
    voice?: string;
}

export interface ITextToSpeech {
    /**
     * Sintetiza o texto em áudio e executa diretamente nos alto-falantes.
     */
    speak(text: string, options?: TextToSpeechOptions): Promise<void>;

    /**
     * Sintetiza o texto e salva em um arquivo de áudio no caminho fornecido.
     */
    synthesizeToFile(text: string, outputPath: string, options?: TextToSpeechOptions): Promise<string>;

    /**
     * Sintetiza o texto e retorna o áudio codificado em um Buffer de memória.
     */
    synthesizeToBuffer(text: string, options?: TextToSpeechOptions): Promise<Buffer>;

    /**
     * Interrompe qualquer reprodução ou síntese de áudio em andamento (Opcional).
     */
    stop?(): Promise<void>;
}