import fs from 'node:fs/promises';
import path from 'node:path';
import { ISpeechToText, SpeechToTextOptions } from '../../core/contracts/ISpeechToText.js';
import { LoggerProvider } from '../logger/LoggerProvider.js';
import { TemporaryAudioStore } from './TemporaryAudioStore.js';
import { VoskSpeechConfig, VoskSpeechProvider } from './VoskSpeechProvider.js';
import { WhisperSpeechConfig, WhisperSpeechProvider } from './WhisperSpeechProvider.js';

export interface HybridSpeechConfig extends VoskSpeechConfig, WhisperSpeechConfig {
    readonly longPhraseWordThreshold?: number;
    readonly longPhraseSecondsThreshold?: number;
}

export class HybridSpeechProvider implements ISpeechToText {
    private readonly vosk: VoskSpeechProvider;
    private readonly whisper: WhisperSpeechProvider;
    private readonly temporaryAudio: TemporaryAudioStore;
    private readonly sampleRate: number;
    private readonly wordThreshold: number;
    private readonly secondsThreshold: number;
    private readonly logger?: LoggerProvider;
    private audioChunks: Buffer[] = [];
    private active = false;

    constructor(config: HybridSpeechConfig = {}, logger?: LoggerProvider) {
        this.sampleRate = config.sampleRate || 16000;
        this.wordThreshold = config.longPhraseWordThreshold || 8;
        this.secondsThreshold = config.longPhraseSecondsThreshold || 4;
        this.logger = logger;
        this.temporaryAudio = new TemporaryAudioStore(config.outputDirectory || path.resolve(process.cwd(), 'temp'));
        this.whisper = new WhisperSpeechProvider(config);
        this.vosk = new VoskSpeechProvider({
            modelPath: config.modelPath,
            sampleRate: this.sampleRate,
            device: config.device,
            soxPath: config.soxPath,
            audioEnhancement: config.audioEnhancement,
            onAudioChunk: (chunk) => this.audioChunks.push(Buffer.from(chunk)),
        }, logger);
    }

    public transcribeBuffer(audioBuffer: Buffer, options?: SpeechToTextOptions): Promise<string> {
        const seconds = audioBuffer.length / (2 * (options?.sampleRate || this.sampleRate));
        return seconds >= this.secondsThreshold
            ? this.transcribeLongAudio(audioBuffer, options)
            : this.vosk.transcribeBuffer(audioBuffer, options);
    }

    public async transcribeFile(filePath: string, options?: SpeechToTextOptions): Promise<string> {
        const audio = await fs.readFile(filePath);
        return this.transcribeBuffer(this.removeWaveHeader(audio), options);
    }

    public startListening(onTranscription: (text: string) => void): void {
        if (this.active) return;
        this.active = true;
        this.audioChunks = [];
        this.vosk.startListening((text) => {
            void this.handleSegment(text, onTranscription);
        });
    }

    public async stopListening(): Promise<void> {
        this.active = false;
        await this.vosk.stopListening();
        this.audioChunks = [];
    }

    private async handleSegment(text: string, onTranscription: (text: string) => void): Promise<void> {
        const pcm = Buffer.concat(this.audioChunks);
        this.audioChunks = [];
        const seconds = pcm.length / (2 * this.sampleRate);
        const isLong = text.split(/\s+/).filter(Boolean).length >= this.wordThreshold || seconds >= this.secondsThreshold;

        if (!isLong) {
            onTranscription(text);
            return;
        }

        const filePath = await this.temporaryAudio.createWav(pcm, this.sampleRate);
        try {
            await this.vosk.stopListening();
            const improvedText = await this.whisper.transcribeFile(filePath, { language: 'pt', sampleRate: this.sampleRate });
            this.logger?.debug('Segmento longo transcrito pelo Whisper.', { seconds, words: text.split(/\s+/).length });
            if (improvedText) onTranscription(improvedText);
            else onTranscription(text);
        } catch (error) {
            this.logger?.warn('Whisper falhou; usando transcrição Vosk.', {
                error: error instanceof Error ? error.message : String(error),
            });
            onTranscription(text);
        } finally {
            await this.temporaryAudio.remove(filePath);
            if (this.active) {
                this.audioChunks = [];
                this.vosk.startListening((nextText) => { void this.handleSegment(nextText, onTranscription); });
            }
        }
    }

    private async transcribeLongAudio(audioBuffer: Buffer, options?: SpeechToTextOptions): Promise<string> {
        const filePath = await this.temporaryAudio.createWav(audioBuffer, options?.sampleRate || this.sampleRate);
        try {
            return await this.whisper.transcribeFile(filePath, options);
        } catch {
            return this.vosk.transcribeBuffer(audioBuffer, options);
        } finally {
            await this.temporaryAudio.remove(filePath);
        }
    }

    private removeWaveHeader(buffer: Buffer): Buffer {
        if (buffer.length < 12 || buffer.toString('ascii', 0, 4) !== 'RIFF') return buffer;
        const marker = buffer.indexOf('data', 12, 'ascii');
        return marker >= 0 ? buffer.subarray(marker + 8) : buffer.subarray(44);
    }
}
