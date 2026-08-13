// src/core/contracts/ITextToSpeech.ts

export interface ITextToSpeech {
    /**
     * Recebe um texto e sintetiza em áudio, reproduzindo no alto-falante.
     * 
     * @param text O texto que o assistente deve falar
     */
    speak(text: string): Promise<void>;

    /**
     * Interrompe a fala atual caso o usuário interrompa ou cancele a sessão.
     */
    stop?(): Promise<void>;
}