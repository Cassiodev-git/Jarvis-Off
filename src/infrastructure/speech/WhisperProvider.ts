
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { ISpeechToText } from '../../core/contracts/ISpeechToText';

export interface WhisperConfig {
    whisperBinPath?: string;
    modelPath?: string;
}

export class WhisperProvider implements ISpeechToText {
    private readonly whisperBinPath: string;
    private readonly modelPath: string;

    constructor(config: WhisperConfig = {}) {
        this.whisperBinPath = config.whisperBinPath || path.resolve(process.cwd(), 'whisper.cpp', 'build', 'bin', 'whisper-cli');

        // Se a compilação gerou o executável antigo 'main', ajusta automaticamente
        if (!fs.existsSync(this.whisperBinPath)) {
            const fallbackPath = path.resolve(process.cwd(), 'whisper.cpp', 'main');
            if (fs.existsSync(fallbackPath)) {
                this.whisperBinPath = fallbackPath;
            }
        }

        this.modelPath = config.modelPath || path.resolve(process.cwd(), 'whisper.cpp', 'models', 'ggml-base.bin');
    }

    /**
     * Grava o áudio do microfone e transcreve usando o Whisper (Implementa ISpeechToText)
     */
    public async transcribeAudioStream(durationSeconds: number = 5): Promise<string> {
        const tempAudioPath = path.join(os.tmpdir(), `jarvis_input_${Date.now()}.wav`);

        try {
            // 1. Grava a fala do usuário via arecord
            await this.recordAudioToFile(tempAudioPath, durationSeconds);

            // 2. Executa a transcrição do arquivo
            const text = await this.transcribeFile(tempAudioPath);
            return text;
        } catch (error) {
            console.error('❌ [Whisper] Erro na captura/transcrição:', error);
            return '';
        } finally {
            // 3. Garante a limpeza do arquivo temporário de áudio
            if (fs.existsSync(tempAudioPath)) {
                fs.unlinkSync(tempAudioPath);
            }
        }
    }

    /**
     * Captura áudio do microfone por N segundos e salva em formato WAV temporário
     */
    private recordAudioToFile(outputPath: string, durationSeconds: number): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log(`🎙️ [Whisper] Gravando áudio por ${durationSeconds}s... Fale agora.`);

            const recordProcess = spawn('arecord', [
                '-D', 'default',
                '-f', 'S16_LE',
                '-r', '16000',
                '-c', '1',
                '-d', durationSeconds.toString(),
                outputPath
            ]);

            recordProcess.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Processo arecord finalizou com código de erro ${code}`));
                }
            });

            recordProcess.on('error', (err) => {
                reject(new Error(`Falha ao iniciar arecord: ${err.message}`));
            });
        });
    }

    /**
     * Transcreve um arquivo WAV usando o Whisper.cpp em Português
     */
    public transcribeFile(audioPath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(audioPath)) {
                return reject(new Error(`Arquivo de áudio não encontrado: ${audioPath}`));
            }

            // Executa o whisper com o modelo em português (-l pt) e sem marcadores de tempo (-nt)
            const child = spawn(this.whisperBinPath, [
                '-m', this.modelPath,
                '-f', audioPath,
                '-l', 'pt',
                '--no-timestamps',
                '-nt'
            ]);

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            child.on('close', (code) => {
                if (code === 0) {
                    // Limpa quebras de linha e marcações extras
                    const text = stdout.trim().replace(/\[.*?\]/g, '').trim();
                    resolve(text);
                } else {
                    reject(new Error(`Erro no Whisper (Código ${code}): ${stderr}`));
                }
            });

            child.on('error', (err) => {
                reject(new Error(`Falha ao disparar Whisper CLI: ${err.message}`));
            });
        });
    }
}