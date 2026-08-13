import path from 'node:path';
import fs from 'node:fs';
import { exec } from 'node:child_process';
import { PiperProvider } from './PiperProvider.js';
import { VoskProvider } from './VoskProvider.js';

function playAudio(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        // Tenta reproduzir usando PulseAudio/PipeWire (paplay) ou ALSA (aplay)
        exec(`paplay "${filePath}" || aplay "${filePath}"`, (error) => {
            if (error) {
                reject(new Error(`Erro ao reproduzir áudio: ${error.message}`));
            } else {
                resolve();
            }
        });
    });
}

async function runSpeechTest(): Promise<void> {
    console.log('====================================================');
    console.log('       J.A.R.V.I.S. — Teste do Módulo de Voz        ');
    console.log('====================================================\n');

    const voskModelPath = path.join(process.cwd(), 'models', 'vosk-model-pt-br');
    const piperModelPath = path.join(process.cwd(), 'models', 'piper', 'pt_BR-faber-medium.onnx');

    if (!fs.existsSync(voskModelPath)) {
        console.error(`❌ [ERRO] Modelo do Vosk não encontrado em: ${voskModelPath}`);
        console.error('   Certifique-se de baixar e extrair o modelo para a pasta models/vosk-model-pt-br');
        process.exit(1);
    }

    if (!fs.existsSync(piperModelPath)) {
        console.error(`❌ [ERRO] Modelo do Piper não encontrado em: ${piperModelPath}`);
        console.error('   Certifique-se de baixar o arquivo .onnx para a pasta models/piper/');
        process.exit(1);
    }

    const piper = new PiperProvider({
        modelPath: piperModelPath,
        outputDir: path.join(process.cwd(), 'temp'),
    });

    const vosk = new VoskProvider({
        modelPath: voskModelPath,
        sampleRate: 22050, // Frequência nativa da voz Faber do Piper
    });

    const testText = 'sistema jarvis ativado e pronto para operação';

    console.log('1. Testando Síntese de Voz (Piper TTS)...');
    console.log(`   Texto original: "${testText}"`);

    try {
        const audioPath = await piper.speak(testText);
        console.log(`   ✔ Áudio .wav gerado em: ${audioPath}`);

        console.log('   🔊 Reproduzindo áudio nas caixas de som...');
        await playAudio(audioPath);
        console.log('   ✔ Reprodução concluída!\n');

        console.log('2. Testando Transcrição de Áudio (Vosk STT)...');
        const transcribedText = await vosk.transcribeFile(audioPath);
        console.log(`   ✔ Transcrição reconhecida pelo Vosk: "${transcribedText}"\n`);

        console.log('====================================================');
        if (transcribedText.trim().length > 0) {
            console.log('✅ SUCESSO: O pipeline de voz (TTS + STT) está funcionando!');
        } else {
            console.log('⚠️ ATENÇÃO: O áudio foi gerado, mas a transcrição veio vazia.');
        }
        console.log('====================================================');
    } catch (error) {
        console.error('❌ Falha na execução do teste de voz:', error);
    }
}

runSpeechTest();