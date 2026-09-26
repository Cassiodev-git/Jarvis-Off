import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import { IVisionProvider } from '../../core/contracts/IVisionProvider.js';

export class OllamaVisionProvider implements IVisionProvider {
    public async analyze(image: Buffer, instruction: string): Promise<string> {
        const response = await fetch(`${env.OLLAMA_URL.replace(/\/$/, '')}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: env.VISION_MODEL,
                stream: false,
                messages: [{
                    role: 'user',
                    content: instruction,
                    images: [image.toString('base64')],
                }],
                options: { temperature: 0.1, num_predict: env.VISION_MAX_TOKENS },
            }),
            signal: AbortSignal.timeout(env.VISION_TIMEOUT_MS),
        });

        if (!response.ok) {
            throw new AppError(`Falha no modelo de visão (${response.status}). Instale o modelo ${env.VISION_MODEL}.`, 503);
        }

        const data = await response.json() as { message?: { content?: string } };
        const text = data.message?.content?.trim();
        if (!text) throw new AppError('O modelo de visão não retornou uma interpretação.', 503);
        return text;
    }
}
