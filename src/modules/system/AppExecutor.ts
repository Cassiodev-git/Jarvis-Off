import { spawn, type ChildProcess } from 'node:child_process';
import { LoggerProvider } from '../../infrastructure/logger/LoggerProvider.js';
import { CommandResult, ICommandExecutor, OpenApplicationPayload } from './contracts/command.types.js';
import { getAllowedApplication } from './commandWhitelist.js';
import { DesktopApplicationResolver } from '../../infrastructure/os/DesktopApplicationResolver.js';

export class AppExecutor implements ICommandExecutor<OpenApplicationPayload> {
    private readonly desktopResolver = new DesktopApplicationResolver();

    constructor(private readonly logger: LoggerProvider) {}

    public async execute(payload: OpenApplicationPayload): Promise<CommandResult> {
        const application = getAllowedApplication(payload.appName)
            ?? await this.desktopResolver.resolve(payload.appName);
        if (!application) {
            return { success: false, message: 'Aplicação não encontrada entre os aplicativos instalados.', error: 'Application was not found in desktop entries' };
        }

        const args = [...(application.baseArgs ?? []), ...(payload.path ? [payload.path] : []), ...(payload.args ?? [])];

        try {
            const child: ChildProcess = spawn(application.executable, args, {
                detached: true,
                stdio: 'ignore',
                shell: false,
            });

            return new Promise<CommandResult>((resolve) => {
                let settled = false;
                const resolveOnce = (result: CommandResult): void => {
                    if (settled) return;
                    settled = true;
                    resolve(result);
                };

                child.once('spawn', () => {
                    child.unref();
                    this.logger.info('Aplicação aberta com sucesso.', {
                        appName: payload.appName,
                        executable: application.executable,
                    });
                    resolveOnce({ success: true, message: `Aplicação "${payload.appName}" iniciada.` });
                });

                child.once('error', (error: Error) => {
                    this.logger.error('Falha ao abrir aplicação.', error, { appName: payload.appName });
                    resolveOnce({ success: false, message: 'Não foi possível abrir a aplicação.', error: error.message });
                });
            });
        } catch (error) {
            const normalizedError = error instanceof Error ? error : new Error(String(error));
            this.logger.error('Erro ao iniciar aplicação.', normalizedError, { appName: payload.appName });
            return Promise.resolve({ success: false, message: 'Não foi possível iniciar a aplicação.', error: normalizedError.message });
        }
    }
}
