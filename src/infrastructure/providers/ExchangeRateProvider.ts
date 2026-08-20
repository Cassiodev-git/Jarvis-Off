import { AppError } from '../../shared/errors/AppError.js';
import { IExchangeRateProvider } from '../../core/contracts/IExchangeRateProvider.js';

interface ExchangeRateResponse {
    result?: string;
    rates?: { BRL?: number };
}

export class ExchangeRateProvider implements IExchangeRateProvider {
    public async getUsdToBrl(): Promise<number> {
        const response = await fetch('https://open.er-api.com/v6/latest/USD', {
            signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) {
            throw new AppError(`Falha ao consultar o dólar: HTTP ${response.status}`, 503);
        }

        const data = await response.json() as ExchangeRateResponse;
        const rate = data.rates?.BRL;
        if (data.result !== 'success' || typeof rate !== 'number' || !Number.isFinite(rate)) {
            throw new AppError('Resposta de cotação inválida.', 503);
        }

        return rate;
    }
}
