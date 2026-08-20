import { IExchangeRateProvider } from '../contracts/IExchangeRateProvider.js';
import { IWeatherProvider } from '../contracts/IWeatherProvider.js';

export class MorningBriefingService {
    constructor(
        private readonly weatherProvider: IWeatherProvider,
        private readonly exchangeRateProvider: IExchangeRateProvider,
        private readonly city: string,
    ) {}

    public async createBriefing(): Promise<string> {
        const [weather, exchange] = await Promise.allSettled([
            this.weatherProvider.getCurrentWeather(this.city),
            this.exchangeRateProvider.getUsdToBrl(),
        ]);

        const parts = ['Bom dia'];

        if (weather.status === 'fulfilled') {
            parts.push(`Em ${weather.value.city}, a temperatura é de ${weather.value.temperatureCelsius} graus, com ${weather.value.description}`);
        } else {
            parts.push('não consegui consultar a temperatura agora');
        }

        if (exchange.status === 'fulfilled') {
            parts.push(`o dólar está em aproximadamente ${exchange.value.toFixed(2).replace('.', ',')} reais`);
        } else {
            parts.push('e não consegui consultar a cotação do dólar agora');
        }

        return `${parts.join('. ')}.`;
    }
}
