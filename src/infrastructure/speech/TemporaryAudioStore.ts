import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export class TemporaryAudioStore {
    constructor(private readonly directory: string = path.resolve(process.cwd(), 'temp')) {}

    public async createWav(pcm: Buffer, sampleRate: number): Promise<string> {
        await fs.mkdir(this.directory, { recursive: true });
        const filePath = path.join(this.directory, `stt_${randomUUID()}.wav`);
        await fs.writeFile(filePath, this.createWavBuffer(pcm, sampleRate));
        return filePath;
    }

    public async remove(filePath: string): Promise<void> {
        await fs.rm(filePath, { force: true });
    }

    private createWavBuffer(pcm: Buffer, sampleRate: number): Buffer {
        const header = Buffer.alloc(44);
        header.write('RIFF', 0);
        header.writeUInt32LE(36 + pcm.length, 4);
        header.write('WAVE', 8);
        header.write('fmt ', 12);
        header.writeUInt32LE(16, 16);
        header.writeUInt16LE(1, 20);
        header.writeUInt16LE(1, 22);
        header.writeUInt32LE(sampleRate, 24);
        header.writeUInt32LE(sampleRate * 2, 28);
        header.writeUInt16LE(2, 32);
        header.writeUInt16LE(16, 34);
        header.write('data', 36);
        header.writeUInt32LE(pcm.length, 40);
        return Buffer.concat([header, pcm]);
    }
}
