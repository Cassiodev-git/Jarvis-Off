export type CommandIntent = 'OPEN_APPLICATION' | 'CLOSE_APPLICATION' | 'RUN_SCRIPT';

export interface OpenApplicationPayload {
    readonly appName: string;
    readonly path?: string;
    readonly args?: readonly string[];
}

export interface RunScriptPayload {
    readonly scriptName: string;
    readonly args?: readonly string[];
}

export interface CloseApplicationPayload {
    readonly appName: string;
}

export type CommandPayload = OpenApplicationPayload | CloseApplicationPayload | RunScriptPayload;

export interface CommandResult {
    readonly success: boolean;
    readonly message: string;
    readonly error?: string;
}

export interface ICommandExecutor<TPayload extends CommandPayload = CommandPayload> {
    execute(payload: TPayload): Promise<CommandResult>;
}
