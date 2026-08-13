// src/infrastructure/speech/VoskProvider.ts
import { spawn, ChildProcess } from 'node:child_process';
import vosk from 'vosk';
import { IWakeWord } from '../../core/contracts/IWakeWord.js';

export class VoskProvider implements IWakeWord {
    private recordProcess: ChildProcess | null = null;
    private recognizer: vosk.Recognizer | null = null;
    private isListening = false;

    // As suas variações fonéticas em português
    private readonly wakeWords = [
        'jarvis',
        'jarves',
        'jervis',
        'chaves',
        'já vi',
        'javes',
        'iaves',
        'serviço'
    ];

    constructor(
        private readonly model: vosk.Model,
        private readonly sampleRate: number = 16000
    ) {}

    /**
     * Checa se o texto escutado contém alguma variação aceita do nome Jarvis
     */
    private isWakeWordPresent(text: string): boolean {
        if (!text) return false;
        const normalizedText = text.toLowerCase();
        return this.wakeWords.some((word) => normalizedText.includes(word));
    }

    /**
     * Inicia a escuta passiva no microfone (Contrato IWakeWord)
     */
    public async startListening(onWakeWordDetected: () => void): Promise<void> {
        if (this.isListening) return;

        const grammarList = [...this.wakeWords, '[unk]'];

        this.recognizer = new vosk.Recognizer({
            model: this.model,
            sampleRate: this.sampleRate,
            grammar: grammarList
        });

        this.isListening = true;
        console.log('🎧 [J.A.R.V.I.S.] Escutando em segundo plano... Fale "Jarvis" para ativar.');

        // Abre o microfone via ALSA (arecord)
        this.recordProcess = spawn('arecord', [
            '-D', 'default',
            '-f', 'S16_LE',
            '-r', this.sampleRate.toString(),
            '-c', '1'
        ]);

        this.recordProcess.stdout?.on('data', (chunk: Buffer) => {
            if (!this.isListening || !this.recognizer) return;

            if (this.recognizer.acceptWaveform(chunk)) {
                const res = this.recognizer.result();
                if (this.isWakeWordPresent(res.text)) {
                    this.triggerWake(onWakeWordDetected);
                }
            } else {
                const partialRes = this.recognizer.partialResult();
                if (this.isWakeWordPresent(partialRes.partial)) {
                    this.triggerWake(onWakeWordDetected);
                }
            }
        });

        this.recordProcess.on('error', (err) => {
            console.error('❌ Erro no processo do microfone (arecord):', err.message);
        });
    }

    private triggerWake(onWakeWordDetected: () => void): void {
        if (!this.isListening) return;

        console.log('\n⚡ [WAKE WORD DETECTADA] "Jarvis" identificado!');
        this.stopListening();
        onWakeWordDetected();
    }

    /**
     * Para a escuta e libera o microfone e memória (Contrato IWakeWord)
     */
    public async stopListening(): Promise<void> {
        this.isListening = false;

        if (this.recordProcess) {
            this.recordProcess.kill();
            this.recordProcess = null;
        }

        if (this.recognizer) {
            try {
                this.recognizer.free();
            } catch {
                // Silenciosamente ignora se já tiver sido liberado
            }
            this.recognizer = null;
        }
    }
}