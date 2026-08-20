export interface AllowedApplication {
    readonly executable: string;
    readonly baseArgs?: readonly string[];
}

export interface AllowedScript {
    readonly executable: string;
    readonly fixedArgs: readonly string[];
}

// Os nomes expostos ao restante da aplicação são aliases controlados. O valor
// nunca é interpolado em um comando shell.
export const ALLOWED_APPLICATIONS: Readonly<Record<string, AllowedApplication>> = {
    code: { executable: 'code' },
    'google-chrome': { executable: 'google-chrome' },
    firefox: { executable: 'firefox' },
    spotify: { executable: 'spotify' },
    nautilus: { executable: 'nautilus' },
    'brave-browser': { executable: 'brave-browser' },
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
