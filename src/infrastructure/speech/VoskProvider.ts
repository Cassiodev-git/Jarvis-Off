import fs from 'node:fs';
import vosk from 'vosk';
import { STTProvider } from './STTProvider.js';

export interface VoskConfig {
    modelPath: string;
    sampleRate?: number;
}

export class VoskProvider implements STTProvider {
    private model: vosk.Model | null = null;
    private readonly sampleRate: number;

    constructor(private readonly config: VoskConfig) {
        this.sampleRate = config.sampleRate ?? 16000;
    }

    private getModel(): vosk.Model {
        if (!this.model) {
            if (!fs.existsSync(this.config.modelPath)) {
                throw new Error(`Modelo Vosk não encontrado no caminho: ${this.config.modelPath}`);
            }
            vosk.setLogLevel(-1);
            this.model = new vosk.Model(this.config.modelPath);
        }
        return this.model;
    }

    public async transcribe(audioBuffer: Buffer): Promise<string> {
        const model = this.getModel();
        const recognizer = new vosk.Recognizer({ model, sampleRate: this.sampleRate });

        recognizer.acceptWaveform(audioBuffer);
        const result = recognizer.finalResult();
        recognizer.free();

        return result.text || '';
    }

    public async transcribeFile(filePath: string): Promise<string> {
        if (!fs.existsSync(filePath)) {
            throw new Error(`Arquivo de áudio não encontrado: ${filePath}`);
        }
        const audioBuffer = fs.readFileSync(filePath);
        return this.transcribe(audioBuffer);
    }
}
