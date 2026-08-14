export class MemoryEntity {
    constructor(
        public readonly id: string,
        public category: string,
        public content: string,
        public importance: number,
        public readonly createdAt: string,
        public userId?: string | null,
        public source: string = 'user',
        public projectId?: string | null,
        public updatedAt: string = new Date().toISOString(),
        public lastAccessedAt?: string | null
    ) {}

    public static create(
        id: string,
        category: string,
        content: string,
        importance: number = 1,
        createdAt: string = new Date().toISOString(),
        userId?: string | null,
        source: string = 'user',
        projectId?: string | null,
        updatedAt: string = createdAt,
        lastAccessedAt?: string | null
    ): MemoryEntity {
        return new MemoryEntity(
            id,
            category,
            content,
            importance,
            createdAt,
            userId,
            source,
            projectId,
            updatedAt,
            lastAccessedAt
        );
    }
}