import { ISpeechToText } from '../../core/contracts/ISpeechToText.js';
import { AppError } from '../../shared/errors/AppError.js';
import { LoggerProvider } from '../logger/LoggerProvider.js';

export type VoiceCommandHandler = (transcription: string) => Promise<void>;
export type WakeHandler = () => Promise<void>;

export interface ContinuousVoiceOptions {
    readonly idleTimeoutMs?: number;
    readonly isWakePhrase?: (transcription: string) => boolean;
    readonly onWake?: WakeHandler;
}

export class ContinuousVoiceListener {
    private listening = false;
    private active = false;
    private processing = false;
    private sleeping = false;
    private idleTimer: NodeJS.Timeout | null = null;

    constructor(
        private readonly speechProvider: ISpeechToText,
        private readonly onCommand: VoiceCommandHandler,
        private readonly logger: LoggerProvider,
        private readonly options: ContinuousVoiceOptions = {},
    ) {}

    public start(): void {
        if (this.active) return;
        if (!this.speechProvider.startListening) {
            throw new AppError('O provedor de fala não suporta escuta contínua.', 500);
        }

        this.active = true;
        this.resetIdleTimer();
        this.startCapture();
        this.logger.info('Escuta contínua iniciada.');
    }

    public async stop(): Promise<void> {
        this.active = false;
        this.clearIdleTimer();
        this.sleeping = false;
        await this.speechProvider.stopListening?.();
        this.listening = false;
        this.logger.info('Escuta contínua encerrada.');
    }

    private async handleTranscription(transcription: string): Promise<void> {
        const text = transcription.trim();
        if (!text || !this.active || this.processing) return;

        if (this.sleeping) {
            if (!this.options.isWakePhrase?.(text)) return;
            await this.processWakePhrase();
            return;
        }

        this.processing = true;
        this.listening = false;
        this.resetIdleTimer();
        try {
            await this.speechProvider.stopListening?.();
            this.logger.debug('Transcrição recebida do microfone.', { transcription: text });
            await this.onCommand(text);
        } catch (error) {
            const normalizedError = error instanceof Error ? error : new Error(String(error));
            this.logger.error('Erro ao processar comando de voz.', normalizedError);
        } finally {
            this.processing = false;
            this.resetIdleTimer();
            if (this.active) {
                this.startCapture();
            }
        }
    }

    private async processWakePhrase(): Promise<void> {
        this.processing = true;
        this.listening = false;
        try {
            await this.speechProvider.stopListening?.();
            this.sleeping = false;
            this.resetIdleTimer();
            if (this.options.onWake) await this.options.onWake();
        } catch (error) {
            const normalizedError = error instanceof Error ? error : new Error(String(error));
            this.logger.error('Erro ao sair do modo de despertar.', normalizedError);
        } finally {
            this.processing = false;
            if (this.active) this.startCapture();
        }
    }

    private resetIdleTimer(): void {
        this.clearIdleTimer();
        if (!this.active || this.sleeping) return;

        const timeout = this.options.idleTimeoutMs ?? 10 * 60 * 1000;
        this.idleTimer = setTimeout(() => {
            if (!this.active || this.processing) {
                this.resetIdleTimer();
                return;
            }
            this.sleeping = true;
            this.logger.info('Modo de despertar ativado após período de inatividade.');
        }, timeout);
    }

    private clearIdleTimer(): void {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
            this.idleTimer = null;
        }
    }

    private startCapture(): void {
        if (!this.active || this.listening || !this.speechProvider.startListening) return;

        this.listening = true;
        this.speechProvider.startListening((transcription) => {
            void this.handleTranscription(transcription);
        });
    }
}
