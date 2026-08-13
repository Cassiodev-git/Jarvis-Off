// src/infrastructure/utils/TempCleaner.ts
import fs from 'node:fs';
import path from 'node:path';

export class TempCleaner {
    private timer: NodeJS.Timeout | null = null;

    constructor(
        private readonly targetDir: string,
        private readonly maxAgeMinutes: number = 10
    ) {
        if (!fs.existsSync(this.targetDir)) {
            fs.mkdirSync(this.targetDir, { recursive: true });
        }
    }

    /**
     * Remove arquivos no diretório alvo com mais de X minutos de vida
     */
    public cleanOldFiles(): void {
        try {
            const files = fs.readdirSync(this.targetDir);
            const now = Date.now();
            const maxAgeMs = this.maxAgeMinutes * 60 * 1000;
            let deletedCount = 0;

            for (const file of files) {
                // Filtra por arquivos de áudio temporários
                if (!file.endsWith('.wav') && !file.endsWith('.tmp')) continue;

                const filePath = path.join(this.targetDir, file);
                const stats = fs.statSync(filePath);

                if (now - stats.mtimeMs > maxAgeMs) {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                }
            }

            if (deletedCount > 0) {
                console.log(`🧹 [TempCleaner] ${deletedCount} arquivo(s) de áudio antigo(s) removido(s) de ${this.targetDir}`);
            }
        } catch (error) {
            console.error('❌ [TempCleaner] Erro ao limpar arquivos temporários:', error);
        }
    }

    /**
     * Apaga TODOS os arquivos de áudio da pasta no startup
     */
    public purgeAll(): void {
        try {
            const files = fs.readdirSync(this.targetDir);
            for (const file of files) {
                if (file.endsWith('.wav') || file.endsWith('.tmp')) {
                    fs.unlinkSync(path.join(this.targetDir, file));
                }
            }
            console.log(`🧹 [TempCleaner] Pasta temporária limpa: ${this.targetDir}`);
        } catch (error) {
            console.error('❌ [TempCleaner] Erro ao expurgar pasta temporária:', error);
        }
    }

    /**
     * Inicia uma rotina em segundo plano para limpar a cada N minutos
     */
    public startAutoCleanup(intervalMinutes: number = 15): void {
        if (this.timer) return;

        // Limpa na inicialização
        this.cleanOldFiles();

        // Inicia o intervalo recorrente
        this.timer = setInterval(() => {
            this.cleanOldFiles();
        }, intervalMinutes * 60 * 1000);
    }

    public stopAutoCleanup(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
}