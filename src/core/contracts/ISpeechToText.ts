export interface SpeechToTextOptions {
    language?: string;
    sampleRate?: number;
}

export interface ISpeechToText {
    /**
     * Transcreve um buffer de áudio bruto (PCM / WAV) em texto.
     */
    transcribeBuffer(audioBuffer: Buffer, options?: SpeechToTextOptions): Promise<string>;

    /**
     * Transcreve um arquivo de áudio no disco.
     */
    transcribeFile(filePath: string, options?: SpeechToTextOptions): Promise<string>;

    /**
     * Inicia a escuta contínua de áudio do microfone (se suportado pelo provider).
     */
    startListening?(onTranscription: (text: string) => void): void;
    
    /**
     * Para a escuta contínua.
     */
    stopListening?(): void;
}