import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { JarvisCore } from '../../core/JarvisCore.js';
import { IntentManager, Intent } from '../../core/IntentManager.js';

async function main() {
    const rl = readline.createInterface({ input, output });
    const jarvis = new JarvisCore();
    const intentManager = new IntentManager();

    console.clear();
    console.log('====================================================');
    console.log('J.A.R.V.I.S Teste');
    console.log('Digite seus comandos ou digite "desligar" para sair.');
    console.log('====================================================\n');

    while (true) {
        const userInput = await rl.question('Você: ');

        if (!userInput.trim()) continue;

        const intent = intentManager.detectIntent(userInput);
        const response = await jarvis.processInput(userInput);

        console.log(`\nJarvis: ${response}\n`);

        if (intent === Intent.EXIT) {
            rl.close();
            process.exit(0);
        }
    }
}

main().catch((err) => {
    console.error('❌ Erro fatal na CLI:', err);
});