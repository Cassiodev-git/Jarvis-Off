import { getCurrentTimeInfo, getDollarExchangeRate, getWeatherInfo } from './webTools.service.js';

export async function extractRealtimeContext(userMessage: string): Promise<string> {
    const text = userMessage.toLowerCase();
    const contextLines: string[] = [];

    // Sempre injeta a data/hora exata do sistema para o Jarvis não errar horários
    contextLines.push(getCurrentTimeInfo());

    // Detecta intenção sobre moeda / dólar
    if (text.includes('dólar') || text.includes('dolar') || text.includes('cotacao') || text.includes('cotação')) {
        const dollarInfo = await getDollarExchangeRate();
        if (dollarInfo) contextLines.push(dollarInfo);
    }

    // Detecta intenção sobre clima / tempo
    if (text.includes('tempo') || text.includes('clima') || text.includes('temperatura') || text.includes('chover')) {
        // Tenta extrair o nome da cidade se mencionado, ou assume padrão
        const weatherInfo = await getWeatherInfo('Sao_Paulo');
        if (weatherInfo) contextLines.push(weatherInfo);
    }

    return contextLines.join('\n');
}