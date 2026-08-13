import { IMemoryRepository } from '../repository/Imemory.repository';
import { CreateMemoryDTO, UpdateMemoryDTO, MemoryResponseDTO } from '../dto/memory.dto.js';
import { MemoryValidator } from '../validator/memory.validator.js';
import { AppError } from '../../../shared/errors/AppError.js';
import { MemoryEntity } from '../entity/memory.entity.js';

export class MemoryService {
    constructor(private readonly memoryRepository: IMemoryRepository) {}

    private toDTO(entity: MemoryEntity): MemoryResponseDTO {
        return {
            id: entity.id,
            category: entity.category,
            content: entity.content,
            importance: entity.importance,
            createdAt: entity.createdAt,
        };
    }

    public async remember(data: CreateMemoryDTO): Promise<MemoryResponseDTO> {
        MemoryValidator.validateCreate(data);
        const memory = await this.memoryRepository.create(data);
        return this.toDTO(memory);
    }

    public async getMemoryById(id: number): Promise<MemoryResponseDTO> {
        const memory = await this.memoryRepository.findById(id);
        if (!memory) {
            throw new AppError(`Memória com ID ${id} não encontrada.`, 404);
        }
        return this.toDTO(memory);
    }

    public async listAllMemories(): Promise<MemoryResponseDTO[]> {
        const memories = await this.memoryRepository.findAll();
        return memories.map((m) => this.toDTO(m));
    }

    public async listMemoriesByCategory(category: string): Promise<MemoryResponseDTO[]> {
        if (!category || category.trim().length === 0) {
            throw new AppError('Categoria não informada para busca.', 400);
        }
        const memories = await this.memoryRepository.findByCategory(category);
        return memories.map((m) => this.toDTO(m));
    }

    public async updateMemory(id: number, data: UpdateMemoryDTO): Promise<MemoryResponseDTO> {
        MemoryValidator.validateUpdate(data);
        await this.getMemoryById(id);

        const updated = await this.memoryRepository.update(id, data);
        if (!updated) {
            throw new AppError(`Falha ao atualizar memória com ID ${id}.`, 500);
        }
        return this.toDTO(updated);
    }

    public async forgetMemory(id: number): Promise<void> {
        await this.getMemoryById(id);
        const deleted = await this.memoryRepository.delete(id);
        if (!deleted) {
            throw new AppError(`Falha ao remover memória com ID ${id}.`, 500);
        }
    }
}