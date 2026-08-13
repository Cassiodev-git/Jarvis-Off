export interface TTSProvider {
    speak(text: string, outputPath?: string): Promise<string>;
}
