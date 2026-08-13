import { MemoryService } from '../service/memory.service.js';
import { CreateMemoryDTO, UpdateMemoryDTO, MemoryResponseDTO } from '../dto/memory.dto.js';

export class MemoryController {
    constructor(private readonly memoryService: MemoryService) {}

    public async create(data: CreateMemoryDTO): Promise<MemoryResponseDTO> {
        return await this.memoryService.remember(data);
    }

    public async getById(id: number): Promise<MemoryResponseDTO> {
        return await this.memoryService.getMemoryById(id);
    }

    public async listAll(): Promise<MemoryResponseDTO[]> {
        return await this.memoryService.listAllMemories();
    }

    public async listByCategory(category: string): Promise<MemoryResponseDTO[]> {
        return await this.memoryService.listMemoriesByCategory(category);
    }

    public async update(id: number, data: UpdateMemoryDTO): Promise<MemoryResponseDTO> {
        return await this.memoryService.updateMemory(id, data);
    }

    public async delete(id: number): Promise<{ success: boolean; message: string }> {
        await this.memoryService.forgetMemory(id);
        return { success: true, message: `Memória ${id} removida com sucesso.` };
    }
}