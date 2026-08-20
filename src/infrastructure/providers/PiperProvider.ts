import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { ITextToSpeech, TextToSpeechOptions } from '../../core/contracts/ITextToSpeech.js';
import { TempCleaner } from '../../ultis/TempCleaner.js';
import { AppError } from '../../shared/errors/AppError.js';
import { AudioPlayer } from '../speech/AudioPlayer.js';

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
    private readonly audioPlayer = new AudioPlayer();

    constructor(config: PiperConfig = {}) {
        // Executável 'piper' na raiz ou caminho customizado
        this.piperPath = config.piperPath || path.resolve(process.cwd(), 'piper', 'piper');

        // Modelo ONNX do Piper
        this.modelPath = config.modelPath || path.resolve(process.cwd(), 'models', 'piper', 'pt_BR-faber-medium.onnx');

        // Pasta /temp na raiz do projeto
        this.outputDir = config.outputDir || path.resolve(process.cwd(), 'temp');

        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }

        // Limpador automático: remove arquivos com mais de 3 minutos a cada 5 minutos
        this.cleaner = new TempCleaner(this.outputDir, 3);
        this.cleaner.startAutoCleanup(5);
    }

    /**
     * Sintetiza o texto em um arquivo de áudio WAV (Implementa ITextToSpeech)
     */
    public async synthesizeToFile(text: string, outputPath: string, options?: TextToSpeechOptions): Promise<string> {
        if (!text || !text.trim()) {
            throw new AppError('O texto para síntese de voz não pode ser vazio.', 400);
        }

        if (!fs.existsSync(this.modelPath)) {
            throw new AppError(`Modelo de voz ONNX do Piper não encontrado em: ${this.modelPath}`, 404);
        }

        return new Promise((resolve, reject) => {
            const args = [
                '--model', this.modelPath,
                '--output_file', outputPath,
            ];

            // Ajusta a velocidade da fala via length_scale (inverso do speed)
            if (options?.speed && options.speed > 0) {
                args.push('--length_scale', (1 / options.speed).toString());
            }

            const child = spawn(this.piperPath, args);

            let stderrOutput = '';

            child.stdin.write(text);
            child.stdin.end();

            child.stderr.on('data', (data) => {
                stderrOutput += data.toString();
            });

            child.on('close', (code) => {
                if (code === 0 && fs.existsSync(outputPath)) {
                    resolve(outputPath);
                } else {
                    reject(new AppError(`Piper TTS finalizou com código de erro ${code}: ${stderrOutput}`, 500));
                }
            });

            child.on('error', (err) => {
                reject(new AppError(`Falha ao executar o executável do Piper TTS: ${err.message}`, 500));
            });
        });
    }

    /**
     * Sintetiza o texto e retorna um Buffer contendo o áudio WAV (Implementa ITextToSpeech)
     */
    public async synthesizeToBuffer(text: string, options?: TextToSpeechOptions): Promise<Buffer> {
        const tempWavPath = path.join(this.outputDir, `buffer_${Date.now()}.wav`);
        try {
            await this.synthesizeToFile(text, tempWavPath, options);
            const buffer = await fs.promises.readFile(tempWavPath);
            return buffer;
        } finally {
            this.deleteFileIfExists(tempWavPath);
        }
    }

    /**
     * Sintetiza o texto e executa o áudio diretamente nas caixas de som (Implementa ITextToSpeech)
     */
    public async speak(text: string, options?: TextToSpeechOptions): Promise<void> {
        if (!text || !text.trim()) return;

        console.log(`🔊 [Piper] Falando: "${text}"`);
        const tempWavPath = path.join(this.outputDir, `speech_${Date.now()}.wav`);

        try {
            // 1. Gera o arquivo WAV usando a síntese oficial
            await this.synthesizeToFile(text, tempWavPath, options);

            // 2. Reproduz o áudio através do adaptador de infraestrutura
            await this.audioPlayer.speak(tempWavPath);
        } catch (error) {
            if (error instanceof AppError) {
                console.error(`❌ [Piper] Erro (${error.statusCode}): ${error.message}`);
            } else {
                console.error('❌ [Piper] Erro na síntese/reprodução de voz:', error);
            }
        } finally {
            // 3. Garante a remoção do arquivo temporário
            this.deleteFileIfExists(tempWavPath);

        }
    }

    /**
     * Interrompe a fala atual e apaga o arquivo temporário em execução
     */
    public async stop(): Promise<void> {
        if (this.audioPlayer) {
            console.log('🔇 [Piper] Interrompendo áudio...');
            this.audioPlayer.stop();
        }
    }

    /**
     * Método retrocompatível que gera o arquivo de áudio.
     */
    public async generateAudioFile(text: string, outputPath?: string): Promise<string> {
        const targetPath = outputPath || path.join(this.outputDir, `speech_${Date.now()}.wav`);
        return this.synthesizeToFile(text, targetPath);
    }

    /**
     * Utilitário para remover arquivo sem estourar exceção
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
