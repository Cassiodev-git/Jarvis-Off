import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const PYTHON_PATH = path.resolve('bin/xtts/venv/bin/python');
const SCRIPT_PATH = path.resolve('bin/xtts/generate_voice.py');

export async function speak(text: string): Promise<void> {
    return new Promise((resolve) => {
        const cleanText = text.replace(/[*_~`#]/g, '').replace(/https?:\/\/\S+/g, 'link').trim();
        if (!cleanText) return resolve();

        if (!fs.existsSync(PYTHON_PATH) || !fs.existsSync(SCRIPT_PATH)) {
            console.warn('⚠️ Python ou Script de voz não encontrado.');
            return resolve();
        }

        const outputWav = path.resolve(`temp_tts_${Date.now()}.wav`);
        console.log('\n🗣️ [Jarvis]: Gerando voz...');

        const ttsProcess = spawn(PYTHON_PATH, [SCRIPT_PATH, cleanText, outputWav]);

        ttsProcess.on('close', (code) => {
            if (code !== 0 || !fs.existsSync(outputWav)) {
                console.error(`❌ Falha ao gerar áudio TTS (Código ${code})`);
                if (fs.existsSync(outputWav)) fs.unlinkSync(outputWav);
                return resolve();
            }

            console.log('🔊 [Jarvis Falando...]');

            // Executa o reproductor e espera o processo encerrar
            const playerProcess = spawn('paplay', [outputWav]);

            playerProcess.on('close', () => {
                if (fs.existsSync(outputWav)) fs.unlinkSync(outputWav);
                console.log('✅ [Jarvis Terminou de Falar]');
                resolve();
            });

            playerProcess.on('error', () => {
                // Tenta mpv se o paplay falhar
                const fallbackPlayer = spawn('mpv', ['--no-terminal', outputWav]);
                fallbackPlayer.on('close', () => {
                    if (fs.existsSync(outputWav)) fs.unlinkSync(outputWav);
                    console.log('✅ [Jarvis Terminou de Falar]');
                    resolve();
                });
                fallbackPlayer.on('error', (err) => {
                    console.error('❌ Nenhum tocador de áudio funcional (paplay/mpv):', err);
                    if (fs.existsSync(outputWav)) fs.unlinkSync(outputWav);
                    resolve();
                });
            });
        });

        ttsProcess.on('error', (err) => {
            console.error('❌ Falha ao iniciar processo Python TTS:', err);
            resolve();
        });
    });
}