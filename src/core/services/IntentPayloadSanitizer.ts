export class IntentPayloadSanitizer {
    private static readonly APPLICATION_TRAILING_PHRASES = [
        /\s+e\s+(?:me\s+)?(?:avise|informe|diga)\b[\s\S]*$/i,
        /\s+(?:por favor|por gentileza|para mim|agora)\s*$/i,
    ];

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
        let sanitized = value.trim().replace(/\s+/g, ' ');

        // Remove artigos e marcadores que não fazem parte do nome do alvo.
        sanitized = sanitized.replace(/^(?:o|a|os|as|um|uma)\s+/i, '');

        let previous: string;
        do {
            previous = sanitized;
            for (const phrase of trailingPhrases) {
                sanitized = sanitized.replace(phrase, '').trim();
            }
        } while (sanitized !== previous);

        return sanitized;
    }
}
