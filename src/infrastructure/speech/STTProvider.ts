export interface STTProvider {
    transcribe(audioBuffer: Buffer): Promise<string>;
    transcribeFile(filePath: string): Promise<string>;
}
