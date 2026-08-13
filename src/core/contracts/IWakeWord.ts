// src/core/contracts/IWakeWord.ts

export interface IWakeWord {
    /**
     * Inicia a escuta passiva no microfone aguardando pela palavra de ativação.
     * @param onWakeWordDetected Callback disparado quando a palavra "Jarvis" for identificada.
     */
    startListening(onWakeWordDetected: () => void): Promise<void>;

    /**
     * Interrompe o processo de escuta e libera o microfone e memória.
     */
    stopListening(): Promise<void>;
}