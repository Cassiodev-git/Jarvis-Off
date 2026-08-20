export interface WeatherSnapshot {
    readonly city: string;
    readonly temperatureCelsius: number;
    readonly description: string;
}

export interface IWeatherProvider {
    getCurrentWeather(city: string): Promise<WeatherSnapshot>;
}
