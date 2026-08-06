export enum Intent {
    DEVELOPMENT_MODE = 'DEVELOPMENT_MODE',
    EXIT = 'EXIT',
    GENERAL_CHAT = 'GENERAL_CHAT',
}

export class IntentManager {
    
    public detectIntent(input: string): Intent {
        const normalizedText = input.toLowerCase().trim();

        // Intenção: Ativar ambiente de desenvolvimento
        const devKeywords = [
            'abrir ambiente',
            'modo dev',
            'modo desenvolvimento',
            'abrir código',
            'abrir vscode',
            'iniciar desenvolvimento',
            'abrir o brave',
            'vamos codar',
            'vamos trabalhar'
        ];

        if (devKeywords.some((keyword) => normalizedText.includes(keyword))) {
            return Intent.DEVELOPMENT_MODE;
        }

        // Intenção: Encerrar o Jarvis
        const exitKeywords = [
            'desligar jarvis',
            'fechar jarvis',
            'encerrar jarvis',
            'desligar',
            'tchau jarvis',
            'vou sair',
            'encerrar'
        ];

        if (exitKeywords.some((keyword) => normalizedText.includes(keyword))) {
            return Intent.EXIT;
        }

        // Caso padrão: Conversa comum redirecionada para a IA
        return Intent.GENERAL_CHAT;
    }
}