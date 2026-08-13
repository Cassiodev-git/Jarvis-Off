// src/index.ts
import path from 'node:path';
import { VoskProvider } from './infrastructure/speech/VoskProvider.js';
import { WhisperProvider } from './infrastructure/speech/WhisperProvider.js';
import { PiperProvider } from './infrastructure/speech/PiperProvider.js';
import { OllamaProvider } from './infrastructure/ai/OllamaProvider.js';

// Importa apenas a Factory e a camada de serviço/contexto
import { makeMemoryService } from './modules/memory/factory/memory.factory.js';
import { ContextBuilder } from './core/ContextBuilder.js';
import { ChatMessage } from './infrastructure/ai/AIProvider.js';

async function main() {
    console.log('====================================================');
    console.log('       J.A.R.V.I.S. — Sistema Híbrido Ativado       ');
    console.log('====================================================\n');

    // 1. Instanciação Limpa via Factory (Sem vazamento de Repository)
    const memoryService = makeMemoryService();
    const contextBuilder = new ContextBuilder(memoryService);
    const llm = new OllamaProvider();

    // 2. Provedores de Áudio
    const wakeWordDetector = new VoskProvider({
        modelPath: path.join(process.cwd(), 'models', 'vosk-model-pt-br')
    });
    const whisper = new WhisperProvider();
    const piper = new PiperProvider({
        modelPath: path.join(process.cwd(), 'models', 'piper', 'pt_BR-faber-medium.onnx')
    });

    async function startPassiveListening() {
        await wakeWordDetector.startListening(async () => {
            console.log('\n🤖 J.A.R.V.I.S.: Sim, senhor?');
            await piper.speak('Pois não?');

            const sessionHistory: ChatMessage[] = [];
            await runActiveConversationSession(sessionHistory);
        });
    }

    async function runActiveConversationSession(sessionHistory: ChatMessage[]) {
        let isSessionActive = true;

        while (isSessionActive) {
            console.log('🎙️ [Sessão Ativa] Escutando pergunta (5s)...');
            const userPrompt = await whisper.transcribeAudioStream(5);

            if (!userPrompt || userPrompt.trim().length === 0) {
                console.log('🤫 Nenhum som/fala detectada. Encerrando sessão de conversa.');
                isSessionActive = false;
                break;
            }

            console.log(`\n💬 Você: "${userPrompt}"`);

            const lowerPrompt = userPrompt.toLowerCase();
            if (lowerPrompt.includes('obrigado') || lowerPrompt.includes('tchau') || lowerPrompt.includes('parar')) {
                await piper.speak('Por nada. Fico à disposição.');
                isSessionActive = false;
                break;
            }

            const fullPayload = await contextBuilder.buildChatMessages(
                userPrompt,
                sessionHistory
            );

            console.log('🧠 Pensando...');
            const assistantReply = await llm.chat(fullPayload);
            console.log(`🤖 J.A.R.V.I.S.: "${assistantReply}"\n`);

            sessionHistory.push({ role: 'user', content: userPrompt });
            sessionHistory.push({ role: 'assistant', content: assistantReply });

            await piper.speak(assistantReply);
        }

        console.log('💤 Voltando para escuta passiva em segundo plano...\n');
        startPassiveListening();
    }

    startPassiveListening();
}

main().catch(console.error);