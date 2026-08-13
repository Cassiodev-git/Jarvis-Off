import { eq } from 'drizzle-orm';
import { db } from '../../../infrastructure/database/client.js';
import { memories } from '../../../infrastructure/database/schema/memories.js';
import { MemoryEntity } from '../entity/memory.entity.js';
import { CreateMemoryDTO, UpdateMemoryDTO } from '../dto/memory.dto.js';
import { IMemoryRepository } from './IMemoryRepository.js';
import { AppError } from '../../../shared/errors/AppError.js';

export class MemoryRepository implements IMemoryRepository {
    private toEntity(row: typeof memories.$inferSelect): MemoryEntity {
        return MemoryEntity.create(
            row.id,
            row.category,
            row.content,
            row.importance,
            row.createdAt
        );
    }

    public async create(data: CreateMemoryDTO): Promise<MemoryEntity> {
        const [inserted] = await db
            .insert(memories)
            .values({
                category: data.category,
                content: data.content,
                importance: data.importance ?? 1,
            })
            .returning();

        if (!inserted) {
            throw new AppError('Falha ao criar registro de memória no banco de dados.', 500);
        }

        return this.toEntity(inserted);
    }

    public async findById(id: number): Promise<MemoryEntity | null> {
        const [row] = await db.select().from(memories).where(eq(memories.id, id)).limit(1);
        if (!row) return null;
        return this.toEntity(row);
    }

    public async findAll(): Promise<MemoryEntity[]> {
        const rows = await db.select().from(memories);
        return rows.map((row) => this.toEntity(row));
    }

    public async findByCategory(category: string): Promise<MemoryEntity[]> {
        const rows = await db.select().from(memories).where(eq(memories.category, category));
        return rows.map((row) => this.toEntity(row));
    }

    public async update(id: number, data: UpdateMemoryDTO): Promise<MemoryEntity | null> {
        const [updated] = await db
            .update(memories)
            .set(data)
            .where(eq(memories.id, id))
            .returning();

        if (!updated) return null;
        return this.toEntity(updated);
    }

    public async delete(id: number): Promise<boolean> {
        const result = await db.delete(memories).where(eq(memories.id, id)).returning();
        return result.length > 0;
    }
}
