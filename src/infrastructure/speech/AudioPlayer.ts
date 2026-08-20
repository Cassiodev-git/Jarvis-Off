import { spawn } from 'node:child_process';

export class AudioPlayer {
    private process: ReturnType<typeof spawn> | null = null;

    public speak(filePath: string): Promise<void> {
        if (!filePath.trim()) {
            return Promise.reject(new Error('O caminho do áudio não pode estar vazio.'));
        }

        return this.playWithFallback(['paplay', 'aplay'], filePath);
    }

    public stop(): void {
        this.process?.kill('SIGTERM');
        this.process = null;
    }

    private async playWithFallback(players: readonly string[], filePath: string): Promise<void> {
        let lastError: Error | undefined;

        for (const player of players) {
            try {
                await this.runPlayer(player, filePath);
                return;
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
            }
        }

        throw new Error(`Erro ao reproduzir áudio: ${lastError?.message ?? 'nenhum reprodutor disponível'}`);
    }

    private runPlayer(player: string, filePath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            let settled = false;
            const settle = (callback: () => void): void => {
                if (settled) return;
                settled = true;
                this.process = null;
                callback();
            };

            try {
                this.process = spawn(player, [filePath], { shell: false });
                this.process.once('error', (error) => settle(() => reject(error)));
                this.process.once('close', (code) => {
                    if (code === 0) settle(resolve);
                    else settle(() => reject(new Error(`${player} terminou com código ${code ?? 'desconhecido'}.`)));
                });
            } catch (error) {
                settle(() => reject(error));
            }
        });
    }
}

export function playAudio(filePath: string): Promise<void> {
    return new AudioPlayer().speak(filePath);
}
