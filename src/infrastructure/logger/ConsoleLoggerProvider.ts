import { LoggerProvider } from './LoggerProvider.js';

export class ConsoleLoggerProvider implements LoggerProvider {
    private formatTimestamp(): string {
        return new Date().toISOString();
    }

    public info(message: string, context?: Record<string, unknown>): void {
        const timestamp = this.formatTimestamp();
        console.log(`[${timestamp}] ℹ️ [INFO]: ${message}`, context ? JSON.stringify(context) : '');
    }

    public warn(message: string, context?: Record<string, unknown>): void {
        const timestamp = this.formatTimestamp();
        console.warn(`[${timestamp}] ⚠️ [WARN]: ${message}`, context ? JSON.stringify(context) : '');
    }

    public error(message: string, error?: Error, context?: Record<string, unknown>): void {
        const timestamp = this.formatTimestamp();
        console.error(
            `[${timestamp}] ❌ [ERROR]: ${message}`,
            error?.stack || error?.message || '',
            context ? JSON.stringify(context) : ''
        );
    }

    public debug(message: string, context?: Record<string, unknown>): void {
        const timestamp = this.formatTimestamp();
        console.debug(`[${timestamp}] 🔍 [DEBUG]: ${message}`, context ? JSON.stringify(context) : '');
    }
}