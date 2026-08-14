export interface LoggerProvider {
    info(message: string, context?: Record<string, unknown>): void;
    warn(message: string, context?: Record<string, unknown>): void;
    // ✅ Aceita 'Error | unknown' para tratar blocos try/catch nativamente
    error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void;
    debug(message: string, context?: Record<string, unknown>): void;
}