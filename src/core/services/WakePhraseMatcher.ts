import { PhoneticNormalizer } from './PhoneticNormalizer.js';

export class WakePhraseMatcher {
    private static readonly PHRASES = new Set([
        'jarvis acorda crianca',
        'jarvis acorda',
        'acorda crianca',
        'acorda',
        'opa',
    ]);

    public static matches(text: string): boolean {
        const normalized = this.normalize(text);
        return this.PHRASES.has(normalized);
    }

    private static normalize(text: string): string {
        return PhoneticNormalizer.normalize(text)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
}
