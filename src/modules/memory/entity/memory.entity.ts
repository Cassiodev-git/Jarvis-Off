export class MemoryEntity {
    constructor(
        public readonly id: number,
        public category: string,
        public content: string,
        public importance: number,
        public readonly createdAt: string
    ) {}

    public static create(
        id: number,
        category: string,
        content: string,
        importance: number = 1,
        createdAt: string = new Date().toISOString()
    ): MemoryEntity {
        return new MemoryEntity(id, category, content, importance, createdAt);
    }
}