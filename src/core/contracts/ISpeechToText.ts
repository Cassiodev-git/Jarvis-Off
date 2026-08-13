// src/core/contracts/ISpeechToText.ts

export interface ISpeechToText {
    /**
     * Grava o áudio do microfone por um período ou até detectar silêncio
     * e retorna a transcrição exata em texto.
     * 
     * @param durationSeconds Tempo máximo limite de gravação (opcional)
     * @returns Texto transcrito da fala do usuário
     */
    transcribeAudioStream(durationSeconds?: number): Promise<string>;
}