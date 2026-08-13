import path from 'node:path';
import { MicrophoneProvider } from './MicrophoneProvider';
import { VoskProvider } from './VoskProvider.js';

async function testMicrophone() {
    console.log('====================================================');
    console.log('       J.A.R.V.I.S. — Teste do Microfone            ');
    console.log('====================================================\n');

    const mic = new MicrophoneProvider();
    const vosk = new VoskProvider({
        modelPath: path.join(process.cwd(), 'models', 'vosk-model-pt-br'),
        sampleRate: 16000
    });

    const outputWav = path.join(process.cwd(), 'temp', 'user_input.wav');

    console.log('🎙️ Gravando microfone por 5 segundos... FALE ALGO!');
    await mic.recordToFile(outputWav, 5);
    console.log('✔ Gravação concluída!\n');

    console.log('🧠 Transcrevendo sua fala via Vosk...');
    const text = await vosk.transcribeFile(outputWav);
    console.log(`✔ J.A.R.V.I.S. ouviu: "${text}"\n`);
}

testMicrophone().catch(console.error);