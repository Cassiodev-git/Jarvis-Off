import { IMemoryRepository, FindRelevantOptions } from '../repository/ImemoryRepository.js';
import { CreateMemoryDTO, UpdateMemoryDTO, MemoryResponseDTO } from '../dto/memory.dto.js';
import { MemoryValidator } from '../validator/MemoryValidator.js';
import { AppError } from '../../../shared/errors/AppError.js';
import { MemoryEntity } from '../entity/memory.entity.js';

export class MemoryService {
    constructor(private readonly memoryRepository: IMemoryRepository) {}

    private toDTO(entity: MemoryEntity): MemoryResponseDTO {
        return {
            id: entity.id,
            userId: entity.userId,
            content: entity.content,
            category: entity.category,
            importance: entity.importance,
            source: entity.source,
            projectId: entity.projectId,
            createdAt: entity.createdAt,
            updatedAt: entity.updatedAt,
            lastAccessedAt: entity.lastAccessedAt,
        };
    }

    public async remember(data: CreateMemoryDTO): Promise<MemoryResponseDTO> {
        MemoryValidator.validateCreate(data);
        const memory = await this.memoryRepository.create(data);
        return this.toDTO(memory);
    }

    public async getMemoryById(id: string): Promise<MemoryResponseDTO> {
        if (!id || id.trim().length === 0) {
            throw new AppError('ID da memória não informado.', 400);
        }
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

    /**
     * Recupera memórias relevantes para montar o contexto da IA sem lotar a memória RAM.
     * Atualiza o carimbo lastAccessedAt de forma assíncrona.
     */
    public async getContextualMemories(options?: FindRelevantOptions): Promise<MemoryResponseDTO[]> {
        const memories = await this.memoryRepository.findRelevant(options);

        // Atualiza o carimbo de acesso em segundo plano
        for (const memory of memories) {
            void this.memoryRepository.updateLastAccessed(memory.id);
        }

        return memories.map((m) => this.toDTO(m));
    }

    public async updateMemory(id: string, data: UpdateMemoryDTO): Promise<MemoryResponseDTO> {
        MemoryValidator.validateUpdate(data);
        await this.getMemoryById(id);

        const updated = await this.memoryRepository.update(id, data);
        if (!updated) {
            throw new AppError(`Falha ao atualizar memória com ID ${id}.`, 500);
        }
        return this.toDTO(updated);
    }

    public async forgetMemory(id: string): Promise<void> {
        await this.getMemoryById(id);
        const deleted = await this.memoryRepository.delete(id);
        if (!deleted) {
            throw new AppError(`Falha ao remover memória com ID ${id}.`, 500);
        }
    }
}