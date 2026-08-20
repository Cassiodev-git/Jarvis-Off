import { AppError } from '../../shared/errors/AppError.js';
import { IWeatherProvider, WeatherSnapshot } from '../../core/contracts/IWeatherProvider.js';

interface WttrResponse {
    current_condition?: Array<{
        temp_C?: string;
        weatherDesc?: Array<{ value?: string }>;
    }>;
}

export class WttrWeatherProvider implements IWeatherProvider {
    public async getCurrentWeather(city: string): Promise<WeatherSnapshot> {
        const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;
        const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!response.ok) {
            throw new AppError(`Falha ao consultar o clima: HTTP ${response.status}`, 503);
        }

        const data = await response.json() as WttrResponse;
        const current = data.current_condition?.[0];
        const temperature = Number(current?.temp_C);
        if (!current || !Number.isFinite(temperature)) {
            throw new AppError('Resposta de clima inválida.', 503);
        }

        return {
            city,
            temperatureCelsius: temperature,
            description: current.weatherDesc?.[0]?.value?.trim() || 'condições não informadas',
        };
    }
}
