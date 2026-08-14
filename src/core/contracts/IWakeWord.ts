export interface WakeWordOptions {
    /**
     * Dispositivo de captura de áudio (ex: 'default', 'hw:0,0').
     */
    device?: string;

    /**
     * Lista customizada de palavras de ativação / variações fonéticas.
     */
    wakeWords?: string[];
}

export interface IWakeWord {
    /**
     * Indica se o serviço de escuta passiva está ativo em segundo plano.
     */
    readonly isListening: boolean;

    /**
     * Inicia a escuta passiva no microfone aguardando pela palavra de ativação.
     * @param onWakeWordDetected Callback disparado quando a palavra for identificada.
     * @param options Configurações opcionais de áudio e palavras-chave.
     */
    startListening(
        onWakeWordDetected: (word?: string) => void,
        options?: WakeWordOptions
    ): Promise<void>;

    /**
     * Interrompe o processo de escuta e libera o microfone e recursos de memória.
     */
    stopListening(): Promise<void>;
}