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
    NEWS_MAX_RESULTS: Math.min(Math.max(Number(process.env.NEWS_MAX_RESULTS) || 5, 1), 10),
    NEWS_TIMEOUT_MS: Number(process.env.NEWS_TIMEOUT_MS) || 7000,
    NEWS_CACHE_TTL_MS: Number(process.env.NEWS_CACHE_TTL_MS) || 60_000,
    // A janela fica visível por padrão. Use BROWSER_HEADLESS=true em servidores.
    BROWSER_HEADLESS: process.env.BROWSER_HEADLESS === 'true',
    BROWSER_PROFILE_PATH: process.env.BROWSER_PROFILE_PATH || '.jarvis-browser-profile',
    BROWSER_TIMEOUT_MS: Number(process.env.BROWSER_TIMEOUT_MS) || 10_000,
    BROWSER_MAX_READ_CHARS: Number(process.env.BROWSER_MAX_READ_CHARS) || 4_000,
    BROWSER_REMOTE_DEBUGGING_URL: process.env.BROWSER_REMOTE_DEBUGGING_URL || 'http://127.0.0.1:9222',
    BROWSER_SEARCH_URL: process.env.BROWSER_SEARCH_URL || 'https://search.brave.com/search?q=',
    BROWSER_EXECUTABLE_PATH: process.env.BROWSER_EXECUTABLE_PATH || '',
    BROWSER_ALLOWED_HOSTS: (process.env.BROWSER_ALLOWED_HOSTS || '')
        .split(',').map((host) => host.trim().toLowerCase()).filter(Boolean),
    BROWSER_BLOCKED_HOSTS: (process.env.BROWSER_BLOCKED_HOSTS || '')
        .split(',').map((host) => host.trim().toLowerCase()).filter(Boolean),
    MAX_HISTORY_MESSAGES: Math.min(Math.max(Number(process.env.MAX_HISTORY_MESSAGES) || 12, 2), 40),
    VISION_MODEL: process.env.VISION_MODEL || 'llava',
    VISION_TIMEOUT_MS: Number(process.env.VISION_TIMEOUT_MS) || 30_000,
    VISION_MAX_TOKENS: Number(process.env.VISION_MAX_TOKENS) || 300,
};


if (!env.OFFLINE_ONLY) {
    console.warn('O modo OFFLINE_ONLY está desativado!');
} else {
    console.log(' Modo 100% Offline e Custo Zero ATIVO.');
}
