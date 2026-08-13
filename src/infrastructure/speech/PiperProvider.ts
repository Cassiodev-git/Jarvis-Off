// src/infrastructure/speech/PiperProvider.ts
import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { ITextToSpeech } from '../../core/contracts/ITextToSpeech';
import { TempCleaner } from '../../ultis/TempCleaner';

export interface PiperConfig {
    piperPath?: string;
    modelPath?: string;
    outputDir?: string;
}

export class PiperProvider implements ITextToSpeech {
    private readonly piperPath: string;
    private readonly modelPath: string;
    private readonly outputDir: string;
    private readonly cleaner: TempCleaner;
    private currentPlayProcess: ChildProcess | null = null;
    private currentPlayingFile: string | null = null;

    constructor(config: PiperConfig = {}) {
        // Aponta para o executável 'piper' na raiz ou caminho customizado
        this.piperPath = config.piperPath || path.resolve(process.cwd(), 'piper', 'piper');

        // Modelo ONNX do Piper
        this.modelPath = config.modelPath || path.resolve(process.cwd(), 'piper', 'models', 'pt_BR-faber-medium.onnx');

        // Define a pasta /temp na raiz do projeto
        this.outputDir = config.outputDir || path.resolve(process.cwd(), 'temp');

        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }

        // Configura o limpador automático:
        // Apaga arquivos com mais de 3 minutos de vida e roda a verificação a cada 5 minutos
        this.cleaner = new TempCleaner(this.outputDir, 3);
        this.cleaner.startAutoCleanup(5);
    }

    /**
     * Sintetiza o texto em áudio e reproduz no alto-falante (Implementa ITextToSpeech)
     */
    public async speak(text: string): Promise<void> {
        if (!text || !text.trim()) return;

        console.log(`🔊 [Piper] Falando: "${text}"`);
        const tempWavPath = path.join(this.outputDir, `speech_${Date.now()}.wav`);

        try {
            // 1. Gera o arquivo de áudio WAV via Piper
            await this.generateAudioFile(text, tempWavPath);

            // 2. Reproduz o áudio nas caixas de som via aplay
            await this.playAudio(tempWavPath);
        } catch (error) {
            console.error('❌ [Piper] Erro na síntese/reprodução de voz:', error);
        } finally {
            // 3. Garante a remoção do arquivo temporário assim que terminar de falar
            this.deleteFileIfExists(tempWavPath);

            if (this.currentPlayingFile === tempWavPath) {
                this.currentPlayingFile = null;
            }
        }
    }

    /**
     * Interrompe a fala atual e apaga o arquivo temporário em execução
     */
    public async stop(): Promise<void> {
        if (this.currentPlayProcess) {
            console.log('🔇 [Piper] Interrompendo áudio...');
            this.currentPlayProcess.kill();
            this.currentPlayProcess = null;
        }

        if (this.currentPlayingFile) {
            this.deleteFileIfExists(this.currentPlayingFile);
            this.currentPlayingFile = null;
        }
    }

    /**
     * Gera o arquivo WAV a partir do texto usando Piper TTS
     */
    public generateAudioFile(text: string, outputPath?: string): Promise<string> {
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

    /**
     * Executa o aplay para tocar o áudio gerado
     */
    private playAudio(audioPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.currentPlayingFile = audioPath;
            this.currentPlayProcess = spawn('aplay', ['-q', audioPath]);

            this.currentPlayProcess.on('close', (code) => {
                this.currentPlayProcess = null;
                if (code === 0 || code === null) {
                    resolve();
                } else {
                    reject(new Error(`Erro ao reproduzir áudio via aplay (código ${code})`));
                }
            });

            this.currentPlayProcess.on('error', (err) => {
                this.currentPlayProcess = null;
                reject(new Error(`Falha ao executar aplay: ${err.message}`));
            });
        });
    }

    /**
     * Utilitário para remover arquivo sem estourar exceção caso já tenha sido deletado
     */
    private deleteFileIfExists(filePath: string): void {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (error) {
            console.error(`⚠️ [Piper] Não foi possível apagar o arquivo temporário ${filePath}:`, error);
        }
    }
}
