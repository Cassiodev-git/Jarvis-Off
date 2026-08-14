import { MemoryEntity } from '../entity/memory.entity.js';
import { CreateMemoryDTO, UpdateMemoryDTO } from '../dto/memory.dto.js';

export interface FindRelevantOptions {
    minImportance?: number;
    projectId?: string;
    category?: string;
    limit?: number;
}

export interface IMemoryRepository {
    create(data: CreateMemoryDTO): Promise<MemoryEntity>;
    findById(id: string): Promise<MemoryEntity | null>;
    findAll(): Promise<MemoryEntity[]>;
    findByCategory(category: string): Promise<MemoryEntity[]>;
    findRelevant(options?: FindRelevantOptions): Promise<MemoryEntity[]>;
    update(id: string, data: UpdateMemoryDTO): Promise<MemoryEntity | null>;
    updateLastAccessed(id: string, accessedAt?: string): Promise<void>;
    delete(id: string): Promise<boolean>;
}