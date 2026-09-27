import { AppError } from '../../shared/errors/AppError.js';
import { ConsoleLoggerProvider } from '../../infrastructure/logger/ConsoleLoggerProvider.js';
import { LoggerProvider } from '../../infrastructure/logger/LoggerProvider.js';
import { AppExecutor } from '../../modules/system/AppExecutor.js';
import { JarvisPlugin } from '../../core/plugins/JarvisPlugin.js';

export class DevelopmentPlugin implements JarvisPlugin {
    public readonly id = 'development';
    public readonly name = 'Desenvolvimento';
    public readonly version = '1.0.0';
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
