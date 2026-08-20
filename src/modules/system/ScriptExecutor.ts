import { spawn, type ChildProcess } from 'node:child_process';
import { LoggerProvider } from '../../infrastructure/logger/LoggerProvider.js';
import { CommandResult, ICommandExecutor, RunScriptPayload } from './contracts/command.types.js';
import { getAllowedScript } from './commandWhitelist.js';

export class ScriptExecutor implements ICommandExecutor<RunScriptPayload> {
    constructor(private readonly logger: LoggerProvider) {}

    public execute(payload: RunScriptPayload): Promise<CommandResult> {
        if (payload.args && payload.args.length > 0) {
            this.logger.warn('Argumentos extras rejeitados para script autorizado.', { scriptName: payload.scriptName });
            return Promise.resolve({ success: false, message: 'Argumentos extras não são permitidos para scripts.', error: 'Additional script arguments are not allowed' });
        }

        const script = getAllowedScript(payload.scriptName);
        if (!script) {
            return Promise.resolve({ success: false, message: 'Script não autorizado.', error: 'Script is not whitelisted' });
        }

        try {
            const child: ChildProcess = spawn(script.executable, [...script.fixedArgs], {
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
                    this.logger.info('Script autorizado iniciado com sucesso.', { scriptName: payload.scriptName });
                    resolveOnce({ success: true, message: `Script "${payload.scriptName}" iniciado.` });
                });

                child.once('error', (error: Error) => {
                    this.logger.error('Falha ao iniciar script.', error, { scriptName: payload.scriptName });
                    resolveOnce({ success: false, message: 'Não foi possível iniciar o script.', error: error.message });
                });
            });
        } catch (error) {
            const normalizedError = error instanceof Error ? error : new Error(String(error));
            this.logger.error('Erro ao iniciar script.', normalizedError, { scriptName: payload.scriptName });
            return Promise.resolve({ success: false, message: 'Não foi possível iniciar o script.', error: normalizedError.message });
        }
    }
}
