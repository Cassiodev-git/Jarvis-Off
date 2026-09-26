export class IntentPayloadSanitizer {
    private static readonly APPLICATION_TRAILING_PHRASES = [
        /\s+e\s+(?:me\s+)?(?:avise|informe|diga)\b[\s\S]*$/i,
        /\s+(?:por favor|por gentileza|para mim|agora|depois)\s*$/i,
    ];

    private static readonly COURTESY_PHRASES = [
        /^(?:por favor|por gentileza)[,\s]+/i,
        /\s+(?:por favor|por gentileza)\s*$/i,
    ];

    public static sanitizeInput(value: string): string {
        let sanitized = value.trim().replace(/\s+/g, ' ');

        for (const phrase of this.COURTESY_PHRASES) {
            sanitized = sanitized.replace(phrase, '').trim();
        }

        // Remove pontuação apenas nas bordas para preservar nomes como
        // "google-chrome" e outros identificadores válidos.
        return sanitized.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, '').trim();
    }

    public static sanitizeApplicationTarget(value: string): string {
        return this.sanitize(value, this.APPLICATION_TRAILING_PHRASES);
    }

    public static sanitizeScriptName(value: string): string {
        return this.sanitize(value, [
            /\s+e\s+(?:me\s+)?(?:avise|informe|diga)\b[\s\S]*$/i,
            /\s+(?:por favor|por gentileza|para mim|agora)\s*$/i,
        ]);
    }

    private static sanitize(value: string, trailingPhrases: readonly RegExp[]): string {
        let sanitized = this.sanitizeInput(value);

        // Remove artigos e marcadores que não fazem parte do nome do alvo.
        sanitized = sanitized.replace(/^(?:o|a|os|as|um|uma)\s+/i, '');

        let previous: string;
        do {
            previous = sanitized;
            for (const phrase of trailingPhrases) {
                sanitized = sanitized.replace(phrase, '').trim();
            }
            sanitized = this.sanitizeInput(sanitized);
        } while (sanitized !== previous);

        return sanitized;
    }
}
