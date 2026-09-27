export interface JarvisPluginContext {
    readonly logger?: {
        info(message: string, context?: Record<string, unknown>): void;
        warn(message: string, context?: Record<string, unknown>): void;
        error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void;
        debug(message: string, context?: Record<string, unknown>): void;
    };
}

export interface JarvisPlugin {
    readonly id: string;
    readonly name: string;
    readonly version: string;
    initialize?(context: JarvisPluginContext): Promise<void> | void;
    shutdown?(): Promise<void> | void;
}
