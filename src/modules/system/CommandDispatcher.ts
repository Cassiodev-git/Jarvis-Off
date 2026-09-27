import { LoggerProvider } from '../../infrastructure/logger/LoggerProvider.js';
import { AppExecutor } from './AppExecutor.js';
import {
    CloseApplicationPayload,
    CommandIntent,
    CommandPayload,
    CommandResult,
    OpenApplicationPayload,
    RunScriptPayload,
} from './contracts/command.types.js';
import { ScriptExecutor } from './ScriptExecutor.js';
import { ApplicationCloser } from './ApplicationCloser.js';

export class CommandDispatcher {
    private readonly appExecutor: AppExecutor;
    private readonly scriptExecutor: ScriptExecutor;
    private readonly applicationCloser: ApplicationCloser;

    constructor(private readonly logger: LoggerProvider) {
        this.appExecutor = new AppExecutor(logger);
        this.scriptExecutor = new ScriptExecutor(logger);
        this.applicationCloser = new ApplicationCloser(logger);
    }

    public dispatch(intent: 'OPEN_APPLICATION', payload: OpenApplicationPayload): Promise<CommandResult>;
    public dispatch(intent: 'RUN_SCRIPT', payload: RunScriptPayload): Promise<CommandResult>;
    public dispatch(intent: 'CLOSE_APPLICATION', payload: CloseApplicationPayload): Promise<CommandResult>;
    public async dispatch(intent: CommandIntent, payload: CommandPayload): Promise<CommandResult> {
        try {
            switch (intent) {
                case 'OPEN_APPLICATION':
                    return await this.appExecutor.execute(payload as OpenApplicationPayload);
                case 'RUN_SCRIPT':
                    return await this.scriptExecutor.execute(payload as RunScriptPayload);
                case 'CLOSE_APPLICATION':
                    return await this.applicationCloser.execute(payload as CloseApplicationPayload);
                default:
                    this.logger.warn('Intenção de comando não suportada.', { intent });
                    return { success: false, message: 'Intenção de comando não suportada.', error: `Unsupported intent: ${intent}` };
            }
        } catch (error) {
            const normalizedError = error instanceof Error ? error : new Error(String(error));
            this.logger.error('Falha inesperada ao despachar comando.', normalizedError, { intent });
            return { success: false, message: 'Falha ao despachar comando.', error: normalizedError.message };
        }
    }
}
