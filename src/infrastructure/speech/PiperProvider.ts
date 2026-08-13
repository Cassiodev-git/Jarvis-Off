import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { TTSProvider } from './TTSProvider.js';

export interface PiperConfig {
    piperPath?: string;
    modelPath: string;
    outputDir?: string;
}

export class PiperProvider implements TTSProvider {
    private readonly piperPath: string;
    private readonly modelPath: string;
    private readonly outputDir: string;

    constructor(config: PiperConfig) {
        // Aponta para o arquivo executável 'piper' dentro da pasta 'piper/' na raiz do projeto
        this.piperPath = config.piperPath || path.resolve(process.cwd(), 'piper', 'piper');
        this.modelPath = config.modelPath;
        this.outputDir = config.outputDir || path.join(process.cwd(), 'temp');

        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    public async speak(text: string, outputPath?: string): Promise<string> {
        const targetPath = outputPath || path.join(this.outputDir, `speech_${Date.now()}.wav`);

        return new Promise((resolve, reject) => {
            const child = spawn(this.piperPath, [
                '--model', this.modelPath,
                '--output_file', targetPath
            ]);

            child.stdin.write(text);
            child.stdin.end();

            child.on('close', (code) => {
                if (code === 0) {
                    resolve(targetPath);
                } else {
                    reject(new Error(`Piper TTS finalizou com código de erro ${code}`));
                }
            });

            child.on('error', (err) => {
                reject(new Error(`Falha ao executar Piper TTS: ${err.message}`));
            });
        });
    }
}