export interface IExchangeRateProvider {
    getUsdToBrl(): Promise<number>;
}
