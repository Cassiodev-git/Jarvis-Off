import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env.js';
import { handleDailyGreeting } from '../services/greeting.service.js';

const PYTHON_PATH = path.resolve('bin/xtts/venv/bin/python');
const WAKEWORD_SCRIPT = path.resolve('bin/wakeword/listen.py');
const TRANSCRIBE_SCRIPT = path.resolve('bin/whisper/transcribe.py');

function waitForWakeWord(): Promise<boolean> {
    return new Promise((resolve) => {
        console.log('\n💤 [Standby]: Aguardando você chamar "Jarvis"...');

        const proc = spawn(PYTHON_PATH, [WAKEWORD_SCRIPT]);

        proc.stdout.on('data', (data) => {
            const output = data.toString().trim();
            if (output.includes('WAKE_WORD_DETECTED')) {
                console.log('⚡ [Wake Word]: "Jarvis" detectado!');
                proc.kill('SIGKILL');
                resolve(true);
            }
        });

        proc.on('error', (err) => {
            console.error('❌ Erro ao iniciar Wake Word:', err);
            resolve(false);
        });
    });
}

function recordAudio(outputWav: string): Promise<boolean> {
    return new Promise((resolve) => {
        const rec = spawn('rec', [
            '-c', '1',
            '-r', '16000',
            '-b', '16',
            outputWav,
            'trim', '0', '6'
        ]);

        rec.on('close', (code) => {
            const exists = fs.existsSync(outputWav);
            const size = exists ? fs.statSync(outputWav).size : 0;
            resolve(code === 0 && size > 20000);
        });

        rec.on('error', () => resolve(false));
    });
}

function transcribeAudio(audioWav: string): Promise<string> {
    return new Promise((resolve) => {
        const whisper = spawn(PYTHON_PATH, [TRANSCRIBE_SCRIPT, audioWav]);
        let textOutput = '';

        whisper.stdout.on('data', (data) => {
            textOutput += data.toString();
        });

        whisper.on('close', () => resolve(textOutput.trim()));
        whisper.on('error', () => resolve(''));
    });
}

export async function startJarvisDaemon(): Promise<void> {
    console.log('🤖 SISTEMA JARVIS INICIALIZADO.');

    const serverUrl = `http://localhost:${env.PORT || 3000}/api/chat`;

    while (true) {
        // 1. Aguarda a chamada inicial do dia
        const triggered = await waitForWakeWord();

        if (triggered) {
            await handleDailyGreeting();

            await new Promise((r) => setTimeout(r, 500));

            let inConversationSession = true;
            const activeDate = new Date().toDateString(); // Registra o dia atual

            console.log('\n💬 [Modo Contínuo Ativo]: Jarvis ouvindo sem necessidade do "Jarvis"!');

            // 2. Loop de escuta contínua ao longo do dia
            while (inConversationSession) {
                // Se virar a meia-noite (mudar a data), volta ao Standby para o novo dia
                if (new Date().toDateString() !== activeDate) {
                    console.log('🌅 Novo dia iniciado. Retornando ao Standby...');
                    inConversationSession = false;
                    break;
                }

                const tempAudio = path.resolve(`temp_mic_${Date.now()}.wav`);

                try {
                    const recorded = await recordAudio(tempAudio);

                    if (recorded) {
                        const userText = await transcribeAudio(tempAudio);

                        if (userText && userText.length > 1) {
                            console.log(`👤 Você: "${userText}"`);

                            const lowerText = userText.toLowerCase();

                            // Comando manual opcional para colocar o Jarvis em Standby antes do fim do dia
                            if (lowerText.includes('pode dormir') || lowerText.includes('vá dormir') || lowerText.includes('modo de espera')) {
                                console.log('😴 Comando de descanso recebido. Entrando em Standby...');
                                inConversationSession = false;
                            } else {
                                const response = await fetch(serverUrl, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ message: userText, speakResponse: true })
                                });

                                await response.json();
                                await new Promise((r) => setTimeout(r, 400));
                            }
                        }
                    }
                    // Em caso de silêncio ou áudio vazio: NÃO encerra a sessão, apenas grava o próximo bloco.
                } catch (err) {
                    console.error('❌ Erro no loop de escuta:', err);
                } finally {
                    if (fs.existsSync(tempAudio)) {
                        fs.unlinkSync(tempAudio);
                    }
                }
            }
        }
    }
}