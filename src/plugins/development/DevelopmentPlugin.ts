import { AppError } from '../../shared/errors/AppError.js';
import { ConsoleLoggerProvider } from '../../infrastructure/logger/ConsoleLoggerProvider.js';
import { LoggerProvider } from '../../infrastructure/logger/LoggerProvider.js';
import { AppExecutor } from '../../modules/system/AppExecutor.js';

export class DevelopmentPlugin {
    private readonly appExecutor: AppExecutor;

    constructor(logger: LoggerProvider = new ConsoleLoggerProvider()) {
        this.appExecutor = new AppExecutor(logger);
    }

    public async openEnvironment(): Promise<string> {
        const results = await Promise.all([
            this.appExecutor.execute({ appName: 'code' }),
            this.appExecutor.execute({ appName: 'brave-browser' }),
        ]);

        const failure = results.find((result) => !result.success);
        if (failure) {
            throw new AppError(failure.error ?? failure.message, 500);
        }

        return 'Ambiente de desenvolvimento iniciado.';
    }
}
