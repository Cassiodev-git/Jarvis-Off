export interface NewsItem {
    title: string;
    source: string;
    publishedAt?: string;
    url?: string;
}

export interface INewsProvider {
    search(query: string, limit?: number): Promise<NewsItem[]>;
}
