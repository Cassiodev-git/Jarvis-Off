import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { ISpeechToText, SpeechToTextOptions } from '../../core/contracts/ISpeechToText.js';
import { AppError } from '../../shared/errors/AppError.js';
import { TemporaryAudioStore } from './TemporaryAudioStore.js';

export interface WhisperSpeechConfig {
    readonly executable?: string;
    readonly model?: string;
    readonly outputDirectory?: string;
    readonly sampleRate?: number;
}

export class WhisperSpeechProvider implements ISpeechToText {
    private readonly executable: string;
    private readonly model: string;
    private readonly outputDirectory: string;
    private readonly sampleRate: number;
    private readonly temporaryAudio: TemporaryAudioStore;

    constructor(config: WhisperSpeechConfig = {}) {
        this.executable = config.executable || 'whisper';
        this.model = config.model || 'base';
        this.outputDirectory = config.outputDirectory || path.resolve(process.cwd(), 'temp');
        this.sampleRate = config.sampleRate || 16000;
        this.temporaryAudio = new TemporaryAudioStore(this.outputDirectory);
    }

    public async transcribeBuffer(audioBuffer: Buffer, options?: SpeechToTextOptions): Promise<string> {
        const filePath = await this.temporaryAudio.createWav(audioBuffer, options?.sampleRate || this.sampleRate);
        try {
            return await this.transcribeFile(filePath, options);
        } finally {
            await this.temporaryAudio.remove(filePath);
        }
    }

    public async transcribeFile(filePath: string, options?: SpeechToTextOptions): Promise<string> {
        const outputFile = `${filePath}.txt`;
        try {
            await this.runWhisper(filePath, options);
            return (await fs.readFile(outputFile, 'utf8')).replace(/\s+/g, ' ').trim();
        } catch (error) {
            if (error instanceof AppError) throw error;
            const message = error instanceof Error ? error.message : String(error);
            throw new AppError(`Falha ao transcrever com Whisper: ${message}`, 500);
        } finally {
            await fs.rm(outputFile, { force: true });
        }
    }

    private runWhisper(filePath: string, options?: SpeechToTextOptions): Promise<void> {
        return new Promise((resolve, reject) => {
            const child = spawn(this.executable, [
                filePath,
                '--model', this.model,
                '--language', options?.language || 'pt',
                '--task', 'transcribe',
                '--output_format', 'txt',
                '--output_dir', this.outputDirectory,
            ], { shell: false, stdio: ['ignore', 'ignore', 'pipe'] });

            let stderr = '';
            child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
            child.once('error', (error) => reject(new AppError(`Whisper indisponível: ${error.message}`, 503)));
            child.once('close', (code) => {
                if (code === 0) resolve();
                else reject(new AppError(`Whisper terminou com código ${code}: ${stderr.trim()}`, 500));
            });
        });
    }
}
