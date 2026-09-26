import { ASSISTANT_NAME, RESPONSE_CLOSINGS } from '../../config/behaviorPrompt.js';

export class ResponseFormatter {
    private static readonly ASSISTANT_NAME_PATTERN = /J\s*\.?\s*A\s*\.?\s*R\s*\.?\s*V\s*\.?\s*I\s*\.?\s*S\s*\.?/gi;

    public static format(text: string): string {
        let formatted = text
            .replace(this.ASSISTANT_NAME_PATTERN, ASSISTANT_NAME)
            .replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/gi, '$1')
            .replace(/(?:https?:\/\/|www\.)\S+/gi, '')
            .replace(/\s+/g, ' ')
            .trim();

        const closing = this.randomClosing();
        if (!formatted) return `Estou ouvindo, ${closing}.`;
        if (new RegExp(`(?:${RESPONSE_CLOSINGS.join('|')})[.!?]?$`, 'i').test(formatted)) return formatted;

        formatted = formatted.replace(/[.!?]+$/, '').trim();
        return `${formatted}, ${closing}.`;
    }

    private static randomClosing(): string {
        return RESPONSE_CLOSINGS[Math.floor(Math.random() * RESPONSE_CLOSINGS.length)] ?? 'senhor';
    }
}
