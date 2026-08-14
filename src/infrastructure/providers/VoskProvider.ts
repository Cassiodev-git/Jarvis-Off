import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import vosk from 'vosk';
import { IWakeWord, WakeWordOptions } from '../../core/contracts/IWakeWord.js';
import { AppError } from '../../shared/errors/AppError.js';

export interface VoskConfig {
    modelPath?: string;
    sampleRate?: number;
    wakeWords?: string[];
}

export class VoskProvider implements IWakeWord {
    private readonly model: vosk.Model;
    private readonly sampleRate: number;
    private recordProcess: ChildProcess | null = null;
    private recognizer: vosk.Recognizer | null = null;
    private _isListening = false;

    // Variações fonéticas comuns em PT-BR para garantir rápida detecção offline
    private wakeWords: string[];

    constructor(configOrModel?: VoskConfig | vosk.Model) {
        if (configOrModel instanceof vosk.Model) {
            this.model = configOrModel;
            this.sampleRate = 16000;
            this.wakeWords = ['jarvis', 'jarves', 'jervis', 'chaves', 'já vi', 'javes', 'iaves', 'serviço'];
        } else {
            const modelPath = configOrModel?.modelPath || path.resolve(process.cwd(), 'models', 'vosk-model-pt-br');

            if (!fs.existsSync(modelPath)) {
                throw new AppError(`Modelo Vosk não encontrado no caminho especificante: ${modelPath}`, 404);
            }

            try {
                vosk.setLogLevel(-1); // Silencia logs nativos da biblioteca em C++
                this.model = new vosk.Model(modelPath);
            } catch (error) {
                throw new AppError(`Falha ao carregar o modelo Vosk em memória: ${(error as Error).message}`, 500);
            }

            this.sampleRate = configOrModel?.sampleRate || 16000;
            this.wakeWords = configOrModel?.wakeWords || [
                'jarvis',
                'jarves',
                'jervis',
                'chaves',
                'já vi',
                'javes',
                'iaves',
                'serviço'
            ];
        }
    }

    /**
     * Retorna o estado atual da escuta em segundo plano
     */
    public get isListening(): boolean {
        return this._isListening;
    }

    /**
     * Inicia a captura do áudio do microfone e aguarda a palavra de ativação (Implementa IWakeWord)
     */
    public async startListening(onWakeWordDetected: (word?: string) => void, options?: WakeWordOptions): Promise<void> {
        if (this._isListening) return;

        const targets = options?.wakeWords || this.wakeWords;
        const grammarList = [...targets, '[unk]'];

        try {
            this.recognizer = new vosk.Recognizer({
                model: this.model,
                sampleRate: this.sampleRate,
                grammar: grammarList
            });
        } catch (error) {
            throw new AppError(`Erro ao instanciar o reconhecedor Vosk: ${(error as Error).message}`, 500);
        }

        this._isListening = true;
        console.log('🎧 [Vosk] Escutando em segundo plano... Fale "Jarvis" para ativar.');

        this.recordProcess = spawn('arecord', [
            '-D', options?.device || 'default',
            '-f', 'S16_LE',
            '-r', this.sampleRate.toString(),
            '-c', '1'
        ]);

        this.recordProcess.stdout?.on('data', (chunk: Buffer) => {
            if (!this._isListening || !this.recognizer) return;

            if (this.recognizer.acceptWaveform(chunk)) {
                const res = this.recognizer.result();
                const matchedWord = this.detectWakeWord(res.text, targets);
                if (matchedWord) {
                    this.triggerWake(onWakeWordDetected, matchedWord);
                }
            } else {
                const partialRes = this.recognizer.partialResult();
                const matchedWord = this.detectWakeWord(partialRes.partial, targets);
                if (matchedWord) {
                    this.triggerWake(onWakeWordDetected, matchedWord);
                }
            }
        });

        this.recordProcess.on('error', (err) => {
            this._isListening = false;
            console.error('❌ [Vosk] Erro no processo do microfone (arecord):', err.message);
        });
    }

    /**
     * Parar a escuta contínua e liberar o processo `arecord` e memória da Vosk (Implementa IWakeWord)
     */
    public async stopListening(): Promise<void> {
        this._isListening = false;

        if (this.recordProcess) {
            this.recordProcess.kill('SIGTERM');
            this.recordProcess = null;
        }

        if (this.recognizer) {
            try {
                this.recognizer.free();
            } catch {
                // Descarta silenciosamente se já tiver sido destruído
            }
            this.recognizer = null;
        }
    }

    /**
     * Verifica a presença da palavra de ativação nas transcrições do modelo
     */
    private detectWakeWord(text: string, targets: string[]): string | null {
        if (!text) return null;
        const normalizedText = text.toLowerCase().trim();
        const found = targets.find((word) => normalizedText.includes(word.toLowerCase()));
        return found || null;
    }

    /**
     * Aciona o callback quando a palavra de acionamento é identificada
     */
    private triggerWake(onWakeWordDetected: (word?: string) => void, detectedWord: string): void {
        if (!this._isListening) return;

        console.log(`\n⚡ [WAKE WORD DETECTADA] "${detectedWord}" identificado!`);
        this.stopListening();
        onWakeWordDetected(detectedWord);
    }
}