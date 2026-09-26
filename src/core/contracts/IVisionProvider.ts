export interface IVisionProvider {
    analyze(image: Buffer, instruction: string): Promise<string>;
}
