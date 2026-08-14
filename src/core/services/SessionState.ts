export type AssistantStatus = 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'ERROR';

export interface SessionStateSnapshot {
    mode: string;
    project: string;
    status: AssistantStatus;
    updatedAt: Date;
}

export class SessionState {
    private mode: string = 'NORMAL';
    private project: string = 'J.A.R.V.I.S.';
    private status: AssistantStatus = 'IDLE';

    // Getters
    public getMode(): string {
        return this.mode;
    }

    public getProject(): string {
        return this.project;
    }

    public getStatus(): AssistantStatus {
        return this.status;
    }

    // Setters
    public setMode(mode: string): void {
        this.mode = mode.toUpperCase().trim();
    }

    public setProject(project: string): void {
        this.project = project.trim();
    }

    public setStatus(status: AssistantStatus): void {
        this.status = status;
    }

    /**
     * Retorna um snapshot imutável do estado atual da sessão
     */
    public getSnapshot(): SessionStateSnapshot {
        return {
            mode: this.mode,
            project: this.project,
            status: this.status,
            updatedAt: new Date(),
        };
    }

    /**
     * Reseta o estado da sessão para os valores padrão
     */
    public reset(): void {
        this.mode = 'NORMAL';
        this.project = 'J.A.R.V.I.S.';
        this.status = 'IDLE';
    }
}