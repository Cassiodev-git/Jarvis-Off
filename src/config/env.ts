import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
dotenv.config();

const localWhisperPath = path.resolve(process.cwd(), '.venv', 'bin', 'whisper');

export const env = {
    PORT: Number(process.env.PORT) || 3000,
    HOST: process.env.HOST || '127.0.0.1',
    OFFLINE_ONLY: process.env.OFFLINE_ONLY === 'true',
    OLLAMA_URL: process.env.OLLAMA_URL || 'http://localhost:11434',
    OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'llama3.2:1b',
    VOSK_MODEL_PATH: process.env.VOSK_MODEL_PATH || 'models/vosk-model-pt-br',
    PIPER_PATH: process.env.PIPER_PATH || 'piper/piper',
    PIPER_MODEL_PATH: process.env.PIPER_MODEL_PATH || 'models/piper/pt_BR-faber-medium.onnx',
    VOICE_MODE: process.env.VOICE_MODE === 'true',
    VOICE_AUDIO_DEVICE: process.env.VOICE_AUDIO_DEVICE || 'default',
    VOICE_AUDIO_ENHANCEMENT: process.env.VOICE_AUDIO_ENHANCEMENT !== 'false',
    VOICE_IDLE_TIMEOUT_MS: Number(process.env.VOICE_IDLE_TIMEOUT_MS) || 10 * 60 * 1000,
    SOX_PATH: process.env.SOX_PATH || 'sox',
    WHISPER_PATH: process.env.WHISPER_PATH || (fs.existsSync(localWhisperPath) ? localWhisperPath : 'whisper'),
    WHISPER_MODEL: process.env.WHISPER_MODEL || 'base',
    WEATHER_CITY: process.env.WEATHER_CITY || 'Garanhuns',
    STT_LONG_PHRASE_WORDS: Number(process.env.STT_LONG_PHRASE_WORDS) || 8,
    STT_LONG_PHRASE_SECONDS: Number(process.env.STT_LONG_PHRASE_SECONDS) || 4,
    CORS_ORIGINS: (process.env.CORS_ORIGINS || 'http://localhost:3000')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
};


if (!env.OFFLINE_ONLY) {
    console.warn('O modo OFFLINE_ONLY está desativado!');
} else {
    console.log(' Modo 100% Offline e Custo Zero ATIVO.');
}
