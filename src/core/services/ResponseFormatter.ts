export class ResponseFormatter {
    private static readonly USER_NAME_PATTERN = /\b(?:C[aá]ssio(?:\s+L[uú]cio\s+Zeferino\s+de\s+Souza)?|Cassio(?:\s+Lucio\s+Zeferino\s+de\s+Souza)?)\b/gi;
    private static readonly ASSISTANT_NAME_PATTERN = /J\s*\.?\s*A\s*\.?\s*R\s*\.?\s*V\s*\.?\s*I\s*\.?\s*S\s*\.?/gi;

    public static format(text: string): string {
        let formatted = text
            .replace(this.ASSISTANT_NAME_PATTERN, 'Jarvis')
            .replace(this.USER_NAME_PATTERN, 'senhor')
            .replace(/\s+/g, ' ')
            .trim();

        if (!formatted) return 'Estou ouvindo, senhor.';
        if (/\bsenhor[.!?]?$/i.test(formatted)) return formatted;

        formatted = formatted.replace(/[.!?]+$/, '').trim();
        return `${formatted}, senhor.`;
    }
}
