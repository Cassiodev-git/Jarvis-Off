import { exec } from 'node:child_process';

export function playAudio(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        // Tenta rodar paplay (PulseAudio/PipeWire) ou aplay (ALSA no Linux)
        exec(`paplay "${filePath}" || aplay "${filePath}"`, (error) => {
            if (error) {
                reject(new Error(`Erro ao reproduzir áudio: ${error.message}`));
            } else {
                resolve();
            }
        });
    });
}