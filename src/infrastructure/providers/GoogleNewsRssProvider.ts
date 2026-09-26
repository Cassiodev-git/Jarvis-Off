import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import { INewsProvider, NewsItem } from '../../core/contracts/INewsProvider.js';

interface CachedNews {
    expiresAt: number;
    items: NewsItem[];
}

export class GoogleNewsRssProvider implements INewsProvider {
    private readonly cache = new Map<string, CachedNews>();
    private readonly baseUrl = 'https://news.google.com/rss/search';

    public async search(query: string, limit = env.NEWS_MAX_RESULTS): Promise<NewsItem[]> {
        const normalizedQuery = query.trim().replace(/\s+/g, ' ');
        if (normalizedQuery.length < 2) {
            throw new AppError('Informe um tema válido para buscar notícias.', 400);
        }

        const safeLimit = Math.min(Math.max(Math.floor(limit), 1), env.NEWS_MAX_RESULTS);
        const cacheKey = `${normalizedQuery.toLocaleLowerCase('pt-BR')}:${safeLimit}`;
        const cached = this.cache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) return cached.items;

        if (env.OFFLINE_ONLY) {
            throw new AppError('O modo offline está ativo; notícias não podem ser consultadas.', 503);
        }

        const url = `${this.baseUrl}?q=${encodeURIComponent(normalizedQuery)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
        let response: Response;
        try {
            response = await fetch(url, { signal: AbortSignal.timeout(env.NEWS_TIMEOUT_MS) });
        } catch (error) {
            throw new AppError(`Falha ao consultar notícias: ${(error as Error).message}`, 503);
        }

        if (!response.ok) {
            throw new AppError(`Falha ao consultar notícias: HTTP ${response.status}`, 503);
        }

        const xml = await response.text();
        const items = this.parse(xml).slice(0, safeLimit);
        this.cache.set(cacheKey, {
            expiresAt: Date.now() + env.NEWS_CACHE_TTL_MS,
            items,
        });
        return items;
    }

    private parse(xml: string): NewsItem[] {
        return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)]
            .flatMap((match): NewsItem[] => {
                const item = match[1];
                const title = this.readTag(item, 'title');
                if (!title) return [];
                return [{
                    title,
                    source: this.readTag(item, 'source') || 'Fonte não informada',
                    publishedAt: this.readTag(item, 'pubDate') || undefined,
                    url: this.readTag(item, 'link') || undefined,
                }];
            });
    }

    private readTag(xml: string, tag: string): string {
        const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i').exec(xml);
        return this.decodeEntities((match?.[1] || '').trim());
    }

    private decodeEntities(value: string): string {
        return value
            .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
            .replace(/&amp;/gi, '&')
            .replace(/&quot;/gi, '"')
            .replace(/&#39;|&apos;/gi, "'")
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)));
    }
}
