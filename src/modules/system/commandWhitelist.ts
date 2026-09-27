export interface AllowedApplication {
    readonly executable: string;
    readonly baseArgs?: readonly string[];
    readonly processNames?: readonly string[];
}

export interface AllowedScript {
    readonly executable: string;
    readonly fixedArgs: readonly string[];
}

// Os nomes expostos ao restante da aplicação são aliases controlados. O valor
// nunca é interpolado em um comando shell.
export const ALLOWED_APPLICATIONS: Readonly<Record<string, AllowedApplication>> = {
    code: { executable: 'code', processNames: ['code'] },
    'google-chrome': { executable: 'google-chrome', processNames: ['google-chrome', 'chrome'] },
    firefox: { executable: 'firefox', processNames: ['firefox'] },
    spotify: { executable: 'spotify', processNames: ['spotify'] },
    nautilus: { executable: 'nautilus', processNames: ['nautilus'] },
    'brave-browser': { executable: 'brave-browser', processNames: ['brave-browser', 'brave'] },
};

// Scripts são comandos completos e fixos. Argumentos livres não são aceitos
// para essa intenção, evitando transformar a whitelist em um shell remoto.
export const ALLOWED_SCRIPTS: Readonly<Record<string, AllowedScript>> = {
    typecheck: { executable: 'npm', fixedArgs: ['run', 'typecheck'] },
    build: { executable: 'npm', fixedArgs: ['run', 'build'] },
};

export function getAllowedApplication(appName: string): AllowedApplication | undefined {
    return ALLOWED_APPLICATIONS[appName.trim().toLowerCase()];
}

export function getAllowedScript(scriptName: string): AllowedScript | undefined {
    return ALLOWED_SCRIPTS[scriptName.trim().toLowerCase()];
}
