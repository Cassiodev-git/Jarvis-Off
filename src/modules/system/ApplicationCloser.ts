import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { LoggerProvider } from '../../infrastructure/logger/LoggerProvider.js';
import { CommandResult, CloseApplicationPayload, ICommandExecutor } from './contracts/command.types.js';
import { getAllowedApplication } from './commandWhitelist.js';

const execFileAsync = promisify(execFile);

export class ApplicationCloser implements ICommandExecutor<CloseApplicationPayload> {
    constructor(private readonly logger: LoggerProvider) {}

    public async execute(payload: CloseApplicationPayload): Promise<CommandResult> {
        const application = getAllowedApplication(payload.appName);
        if (!application) {
            return {
                success: false,
                message: 'Aplicação não autorizada para encerramento.',
                error: 'Application is not whitelisted for closing',
            };
        }

        const processNames = application.processNames ?? [application.executable];
        for (const processName of processNames) {
            try {
                await execFileAsync('pkill', ['-x', processName]);
                this.logger.info('Aplicação encerrada com sucesso.', {
                    appName: payload.appName,
                    processName,
                });
                return { success: true, message: `Aplicação "${payload.appName}" encerrada.` };
            } catch (error) {
                const exitCode = (error as { code?: number }).code;
                if (exitCode !== 1) {
                    const normalizedError = error instanceof Error ? error : new Error(String(error));
                    this.logger.error('Falha ao encerrar aplicação.', normalizedError, {
                        appName: payload.appName,
                        processName,
                    });
                    return { success: false, message: 'Não foi possível encerrar a aplicação.', error: normalizedError.message };
                }
            }
        }

        return { success: false, message: `A aplicação "${payload.appName}" não está em execução.` };
    }
}
