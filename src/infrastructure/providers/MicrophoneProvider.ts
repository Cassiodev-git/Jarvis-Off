import { spawn } from 'node:child_process';

export class MicrophoneProvider {
    /**
     * Grava o microfone por um tempo determinado e salva em arquivo .wav
     */
    public recordToFile(outputPath: string, durationSeconds: number = 5): Promise<string> {
        return new Promise((resolve, reject) => {
            const recordProcess = spawn('arecord', [
                '-D', 'default',
                '-f', 'S16_LE',                      // Formato 16-bit
                '-r', '16000',                        // 16kHz (padrão ideal para o Vosk)
                '-c', '1',                            // Mono
                '-d', durationSeconds.toString(),    // Duração em segundos
                outputPath
            ]);

            recordProcess.on('close', (code) => {
                if (code === 0) {
                    resolve(outputPath);
                } else {
                    reject(new Error(`Erro na gravação do microfone. Código: ${code}`));
                }
            });

            recordProcess.on('error', (err) => {
                reject(new Error(`Falha ao iniciar o gravador (arecord): ${err.message}`));
            });
        });
    }
}