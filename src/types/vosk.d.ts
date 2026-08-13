declare module 'vosk' {
    export class Model {
        constructor(modelPath: string);
        free(): void;
    }

    export class SpeakerModel {
        constructor(modelPath: string);
        free(): void;
    }

    export interface RecognizerOptions {
        model: Model;
        sampleRate: number;
        grammar?: string[] | string;
        speakerModel?: SpeakerModel;
    }

    export class Recognizer {
        constructor(options: RecognizerOptions);
        acceptWaveform(buffer: Buffer): boolean;
        result(): { text: string };
        partialResult(): { partial: string };
        finalResult(): { text: string };
        reset(): void;
        setWords(words: boolean): void;
        free(): void;
    }

    /**
     * Define o nível de log do C++ interno do Vosk.
     * Use -1 para silenciar as mensagens do sistema no terminal.
     */
    export function setLogLevel(level: number): void;
}