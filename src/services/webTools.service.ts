/**
 * Busca a data e hora exatas do sistema
 */
export function getCurrentTimeInfo(): string {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
    };
    return `Data e Hora Atuais: ${now.toLocaleDateString('pt-BR', options)}`;
}

/**
 * Busca a cotação atual do Dólar (USD) em Reais (BRL) via AwesomeAPI (Grátis)
 */
export async function getDollarExchangeRate(): Promise<string | null> {
    try {
        const response = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');
        if (!response.ok) return null;

        const data = await response.json() as {
            USDBRL: { bid: string; pctChange: string; high: string; low: string }
        };

        const { bid, pctChange, high, low } = data.USDBRL;
        const valorFormatado = parseFloat(bid).toFixed(2).replace('.', ',');

        return `Cotação Atual do Dólar (USD): R$ ${valorFormatado} (Variação no dia: ${pctChange}%, Máxima: R$ ${parseFloat(high).toFixed(2)}, Mínima: R$ ${parseFloat(low).toFixed(2)})`;
    } catch (error) {
        console.error('Erro ao buscar cotação do dólar:', error);
        return null;
    }
}

/**
 * Busca a previsão do tempo via wttr.in (Grátis)
 */
export async function getWeatherInfo(city: string = 'Sao_Paulo'): Promise<string | null> {
    try {
        // wttr.in retorna dados em texto simples de forma rápida
        const response = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=3&lang=pt`);
        if (!response.ok) return null;

        const weatherText = await response.text();
        return `Condição Meteorológica Atual (${city}): ${weatherText.trim()}`;
    } catch (error) {
        console.error('Erro ao buscar clima:', error);
        return null;
    }
}