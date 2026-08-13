declare module 'vosk' {
    export class Model {
        constructor(modelPath: string);
        free(): void;
    }

    export class Recognizer {
        constructor(options: { model: Model; sampleRate: number });
        acceptWaveform(buffer: Buffer): boolean;
        result(): { text: string };
        finalResult(): { text: string };
        free(): void;
    }

    export function setLogLevel(level: number): void;
}