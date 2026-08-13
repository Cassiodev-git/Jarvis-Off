import { MemoryEntity } from '../entity/memory.entity.js';
import { CreateMemoryDTO, UpdateMemoryDTO } from '../dto/memory.dto.js';

export interface IMemoryRepository {
    create(data: CreateMemoryDTO): Promise<MemoryEntity>;
    findById(id: number): Promise<MemoryEntity | null>;
    findAll(): Promise<MemoryEntity[]>;
    findByCategory(category: string): Promise<MemoryEntity[]>;
    update(id: number, data: UpdateMemoryDTO): Promise<MemoryEntity | null>;
    delete(id: number): Promise<boolean>;
}