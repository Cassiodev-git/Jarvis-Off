import fs from 'node:fs';
import path from 'node:path';
import { ChildProcess, spawn } from 'node:child_process';
import { Readable } from 'node:stream';
import vosk from 'vosk';
import { ISpeechToText, SpeechToTextOptions } from '../../core/contracts/ISpeechToText.js';
import { AppError } from '../../shared/errors/AppError.js';
import { LoggerProvider } from '../logger/LoggerProvider.js';

export interface VoskSpeechConfig {
    readonly modelPath?: string;
    readonly sampleRate?: number;
    readonly device?: string;
    readonly soxPath?: string;
    readonly audioEnhancement?: boolean;
    readonly onAudioChunk?: (chunk: Buffer) => void;
}

export class VoskSpeechProvider implements ISpeechToText {
    private readonly model: vosk.Model;
    private readonly sampleRate: number;
    private readonly device: string;
    private readonly soxPath: string;
    private readonly audioEnhancement: boolean;
    private readonly logger?: LoggerProvider;
    private readonly onAudioChunk?: (chunk: Buffer) => void;
    private recognizer: vosk.Recognizer | null = null;
    private recordProcess: ChildProcess | null = null;
    private enhancementProcess: ChildProcess | null = null;

    constructor(config: VoskSpeechConfig = {}, logger?: LoggerProvider) {
        const modelPath = config.modelPath || path.resolve(process.cwd(), 'models', 'vosk-model-pt-br');
        this.sampleRate = config.sampleRate || 16000;
        this.device = config.device || 'default';
        this.soxPath = config.soxPath || 'sox';
        this.audioEnhancement = config.audioEnhancement ?? true;
        this.logger = logger;
        this.onAudioChunk = config.onAudioChunk;

        if (!fs.existsSync(modelPath)) {
            throw new AppError(`Modelo Vosk não encontrado: ${modelPath}`, 404);
        }

        try {
            vosk.setLogLevel(-1);
            this.model = new vosk.Model(modelPath);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new AppError(`Falha ao carregar o modelo Vosk: ${message}`, 500);
        }
    }

    public async transcribeBuffer(audioBuffer: Buffer, options?: SpeechToTextOptions): Promise<string> {
        if (audioBuffer.length === 0) return '';

        const recognizer = this.createRecognizer(options);
        try {
            recognizer.acceptWaveform(audioBuffer);
            return recognizer.finalResult().text.trim();
        } finally {
            recognizer.free();
        }
    }

    public async transcribeFile(filePath: string, options?: SpeechToTextOptions): Promise<string> {
        if (!filePath.trim()) {
            throw new AppError('O caminho do áudio não pode estar vazio.', 400);
        }

        const audioBuffer = await fs.promises.readFile(filePath);
        return this.transcribeBuffer(this.removeWaveHeader(audioBuffer), options);
    }

    public startListening(onTranscription: (text: string) => void): void {
        if (this.recordProcess) return;

        this.recognizer = this.createRecognizer();
        const recordProcess = spawn('arecord', [
            '-D', this.device,
            '-t', 'raw',
            '-f', 'S16_LE',
            '-r', this.sampleRate.toString(),
            '-c', '1',
            '--buffer-time', '500000',
        ], { shell: false });
        this.recordProcess = recordProcess;

        const consumeAudio = (chunk: Buffer): void => {
            if (!this.recognizer) return;
            this.onAudioChunk?.(chunk);

            if (this.recognizer.acceptWaveform(chunk)) {
                const text = this.recognizer.result().text.trim();
                if (text) onTranscription(text);
            }
        };

        const audioOutput = this.audioEnhancement
            ? this.startAudioEnhancement(() => this.recordProcess?.stdout?.on('data', consumeAudio))
            : this.recordProcess.stdout;

        audioOutput?.on('data', consumeAudio);

        recordProcess.once('error', (error) => {
            if (this.recordProcess !== recordProcess) return;
            this.logger?.error('Falha no processo de captura do microfone.', error);
            this.clearListeningResources();
        });

        recordProcess.once('close', (code) => {
            if (this.recordProcess !== recordProcess) return;
            if (code !== 0) {
                this.logger?.warn('Processo de captura do microfone encerrado.', { code });
            }
            this.clearListeningResources();
        });
    }

    public async stopListening(): Promise<void> {
        const recordProcess = this.recordProcess;
        const enhancementProcess = this.enhancementProcess;

        this.recordProcess = null;
        this.enhancementProcess = null;
        this.clearListeningResources();

        await Promise.all([
            this.terminateProcess(recordProcess),
            this.terminateProcess(enhancementProcess),
        ]);
    }

    private createRecognizer(options?: SpeechToTextOptions): vosk.Recognizer {
        return new vosk.Recognizer({
            model: this.model,
            sampleRate: options?.sampleRate || this.sampleRate,
        });
    }

    private removeWaveHeader(buffer: Buffer): Buffer {
        if (buffer.length < 12 || buffer.toString('ascii', 0, 4) !== 'RIFF') return buffer;
        const dataMarker = buffer.indexOf('data', 12, 'ascii');
        return dataMarker >= 0 && dataMarker + 8 <= buffer.length
            ? buffer.subarray(dataMarker + 8)
            : buffer.subarray(44);
    }

    private clearListeningResources(): void {
        if (this.recognizer) {
            this.recognizer.free();
            this.recognizer = null;
        }
    }

    private terminateProcess(process: ChildProcess | null): Promise<void> {
        if (!process || process.exitCode !== null) return Promise.resolve();

        return new Promise((resolve) => {
            const finish = (): void => {
                clearTimeout(timeout);
                resolve();
            };
            const timeout = setTimeout(finish, 500);
            process.once('close', finish);
            process.once('error', finish);
            process.kill('SIGTERM');
        });
    }

    private startAudioEnhancement(onFallback: () => void): Readable | null {
        if (!this.recordProcess?.stdout) return null;

        try {
            this.enhancementProcess = spawn(this.soxPath, [
                '-q',
                '-t', 'raw',
                '-r', this.sampleRate.toString(),
                '-e', 'signed-integer',
                '-b', '16',
                '-c', '1',
                '-',
                '-t', 'raw',
                '-r', this.sampleRate.toString(),
                '-e', 'signed-integer',
                '-b', '16',
                '-c', '1',
                '-',
                'highpass', '80',
                'lowpass', '7600',
            ], { shell: false });

            if (!this.enhancementProcess.stdin) {
                this.enhancementProcess.kill('SIGTERM');
                this.enhancementProcess = null;
                return this.recordProcess.stdout;
            }

            this.recordProcess.stdout.pipe(this.enhancementProcess.stdin);
            this.enhancementProcess.stderr?.on('data', (chunk: Buffer) => {
                this.logger?.debug('Processador de áudio:', { message: chunk.toString().trim() });
            });
            this.enhancementProcess.once('error', (error) => {
                this.logger?.warn('Processamento de áudio indisponível; usando captura direta.', { error: error.message });
                this.recordProcess?.stdout?.unpipe(this.enhancementProcess?.stdin ?? undefined);
                onFallback();
            });
            this.logger?.debug('Filtro de voz ativo.', { sampleRate: this.sampleRate });
            return this.enhancementProcess.stdout;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger?.warn('Não foi possível iniciar o filtro de voz; usando captura direta.', { error: message });
            return this.recordProcess.stdout;
        }
    }
}
