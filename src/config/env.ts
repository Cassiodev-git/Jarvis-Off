import dotenv from 'dotenv';
dotenv.config();

export const env = {
    PORT: Number(process.env.PORT) || 3000,
    HOST: process.env.HOST || '127.0.0.1',
    OFFLINE_ONLY: process.env.OFFLINE_ONLY === 'true',
    OLLAMA_URL: process.env.OLLAMA_URL || 'http://localhost:11434',
    OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'llama3.2:1b',
    VOSK_MODEL_PATH: process.env.VOSK_MODEL_PATH || 'bin/wakeword/vosk-model-pt'
};


if (!env.OFFLINE_ONLY) {
    console.warn('O modo OFFLINE_ONLY está desativado!');
} else {
    console.log(' Modo 100% Offline e Custo Zero ATIVO.');
}