import { eq, gte, and, desc, or, isNull, like } from 'drizzle-orm';
import { db, DatabaseInstance } from '../../../infrastructure/database/client.js';
import { memories, MemoryEntity as MemorySchemaEntity } from '../../../infrastructure/database/schema/memories.js';
import { MemoryEntity } from '../entity/memory.entity.js';
import { CreateMemoryDTO, UpdateMemoryDTO } from '../dto/memory.dto.js';
import { IMemoryRepository } from './ImemoryRepository.js';
import { AppError } from '../../../shared/errors/AppError.js';
import { randomUUID } from 'node:crypto';

export class MemoryRepository implements IMemoryRepository {
    constructor(private readonly database: DatabaseInstance = db) {}

    private toEntity(row: MemorySchemaEntity): MemoryEntity {
        return MemoryEntity.create(
            row.id,
            row.category,
            row.content,
            row.importance,
            row.createdAt,
            row.userId ?? undefined,
            row.source ?? undefined,
            row.projectId ?? undefined,
            row.updatedAt,
            row.lastAccessedAt ?? undefined
        );
    }

    public async create(data: CreateMemoryDTO): Promise<MemoryEntity> {
        const now = new Date().toISOString();
        const id = randomUUID();

        const [inserted] = await this.database
            .insert(memories)
            .values({
                id,
                userId: data.userId ?? null,
                content: data.content,
                category: data.category ?? 'personal',
                importance: data.importance ?? 1,
                source: data.source ?? 'user',
                projectId: data.projectId ?? null,
                createdAt: now,
                updatedAt: now,
                lastAccessedAt: now,
            })
            .returning();

        if (!inserted) {
            throw new AppError('Falha ao criar registro de memória no banco de dados.', 500);
        }

        return this.toEntity(inserted);
    }

    public async findById(id: string): Promise<MemoryEntity | null> {
        const [row] = await this.database
            .select()
            .from(memories)
            .where(eq(memories.id, id))
            .limit(1);

        if (!row) return null;
        return this.toEntity(row);
    }

    public async findAll(): Promise<MemoryEntity[]> {
        const rows = await this.database.select().from(memories);
        return rows.map((row) => this.toEntity(row));
    }

    public async findByCategory(category: string): Promise<MemoryEntity[]> {
        const rows = await this.database
            .select()
            .from(memories)
            .where(eq(memories.category, category));

        return rows.map((row) => this.toEntity(row));
    }

    public async searchByContent(query: string, limit = 5): Promise<MemoryEntity[]> {
        const rows = await this.database
            .select()
            .from(memories)
            .where(like(memories.content, `%${query}%`))
            .orderBy(desc(memories.importance), desc(memories.updatedAt))
            .limit(limit);

        return rows.map((row) => this.toEntity(row));
    }

    /**
     * Busca otimizada de memórias relevantes por importância e projeto.
     * Evita carregar todo o banco de dados em RAM durante a montagem de contexto.
     */
    public async findRelevant(options: {
        minImportance?: number;
        projectId?: string;
        category?: string;
        limit?: number;
    }): Promise<MemoryEntity[]> {
        const { minImportance = 1, projectId, category, limit = 20 } = options;

        const conditions = [
            gte(memories.importance, minImportance)
        ];

        if (category) {
            conditions.push(eq(memories.category, category));
        }

        if (projectId) {
            conditions.push(
                or(
                    eq(memories.projectId, projectId),
                    isNull(memories.projectId)
                )!
            );
        }

        const rows = await this.database
            .select()
            .from(memories)
            .where(and(...conditions))
            .orderBy(desc(memories.importance), desc(memories.createdAt))
            .limit(limit);

        return rows.map((row) => this.toEntity(row));
    }

    public async update(id: string, data: UpdateMemoryDTO): Promise<MemoryEntity | null> {
        const now = new Date().toISOString();

        const [updated] = await this.database
            .update(memories)
            .set({
                ...data,
                updatedAt: now,
            })
            .where(eq(memories.id, id))
            .returning();

        if (!updated) return null;
        return this.toEntity(updated);
    }

    public async updateLastAccessed(id: string, accessedAt: string = new Date().toISOString()): Promise<void> {
        await this.database
            .update(memories)
            .set({ lastAccessedAt: accessedAt })
            .where(eq(memories.id, id));
    }

    public async delete(id: string): Promise<boolean> {
        const result = await this.database
            .delete(memories)
            .where(eq(memories.id, id))
            .returning();

        return result.length > 0;
    }
}
