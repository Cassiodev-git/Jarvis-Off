import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { OllamaProvider } from '../../infrastructure/ai/OllamaProvider.js';
import { ConsoleLoggerProvider } from '../../infrastructure/logger/ConsoleLoggerProvider.js';
import { memoryController, memoryService } from '../../modules/memory/index.js';
import { ContextBuilder } from '../../core/ContextBuilder.js';
import { IntentManager } from '../../core/IntentManager.js';
import { JarvisCore } from '../../core/JarvisCore.js';
import { ChatMessage } from '../../infrastructure/ai/AIProvider.js';

async function main(): Promise<void> {
    const logger = new ConsoleLoggerProvider();
    const aiProvider = new OllamaProvider();
    const contextBuilder = new ContextBuilder(memoryService);
    const intentManager = new IntentManager(aiProvider);

    const jarvis = new JarvisCore(
        aiProvider,
        memoryController,
        contextBuilder,
        intentManager,
        logger
    );

    const rl = readline.createInterface({ input, output });
    const history: ChatMessage[] = [];

    console.clear();
    console.log('====================================================');
    console.log('          J.A.R.V.I.S. — Interface CLI              ');
    console.log('====================================================');
    console.log(' Comandos de controle:');
    console.log('   /sair        - Encerra a sessão');
    console.log('   /memorias    - Lista as memórias salvas no banco');
    console.log('   /limpar      - Reseta o histórico e limpa a tela');
    console.log('====================================================\n');

    try {
        while (true) {
            const userInput = await rl.question('Você > ');
            const cleanInput = userInput.trim();

            if (!cleanInput) continue;

            const lowerInput = cleanInput.toLowerCase();

            if (lowerInput === '/sair' || lowerInput === 'exit') {
                console.log('\nJarvis > Até logo, senhor.');
                break;
            }

            if (lowerInput === '/limpar' || lowerInput === 'clear' || lowerInput === 'cls') {
                console.clear();
                history.length = 0;
                console.log('Jarvis > Histórico resetado e tela limpa.\n');
                continue;
            }

            if (lowerInput === '/memorias') {
                const memories = await memoryController.listAll();
                console.log('\n--- Memórias Cadastradas ---');
                if (memories.length === 0) {
                    console.log('Nenhuma memória encontrada.');
                } else {
                    memories.forEach((m) => {
                        console.log(`[#${m.id}] [${m.category.toUpperCase()}] ${m.content} (Relevância: ${m.importance})`);
                    });
                }
                console.log('----------------------------\n');
                continue;
            }

            try {
                const response = await jarvis.handleUserPrompt(cleanInput, history);

                history.push({ role: 'user', content: cleanInput });
                history.push({ role: 'assistant', content: response });

                console.log(`\nJarvis > ${response}\n`);
            } catch (error) {
                logger.error('Erro ao processar mensagem do usuário', error as Error);
                console.log('\nJarvis > Desculpe, ocorreu um erro ao processar sua solicitação.\n');
            }
        }
    } finally {
        rl.close();
    }
}

main().catch((err) => {
    console.error('Erro fatal ao iniciar a CLI:', err);
});
