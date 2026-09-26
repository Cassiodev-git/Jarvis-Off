import { MemoryService } from '../service/memory.service.js';
import { CreateMemoryDTO, UpdateMemoryDTO, MemoryResponseDTO } from '../dto/memory.dto.js';
import { AppError } from '../../../shared/errors/AppError.js';

export class MemoryController {
    constructor(private readonly memoryService: MemoryService) {}

    public async create(data: CreateMemoryDTO): Promise<MemoryResponseDTO> {
        if (!data || !data.content || data.content.trim().length === 0) {
            throw new AppError('O conteúdo da memória é obrigatório.', 400);
        }
        return await this.memoryService.remember(data);
    }

    public async getById(id: string): Promise<MemoryResponseDTO> {
        //this.validateId(id);
        return await this.memoryService.getMemoryById(id);
    }

    public async listAll(): Promise<MemoryResponseDTO[]> {
        return await this.memoryService.listAllMemories();
    }

    public async listByCategory(category: string): Promise<MemoryResponseDTO[]> {
        if (!category || category.trim().length === 0) {
            throw new AppError('A categoria informada é inválida.', 400);
        }
        return await this.memoryService.listMemoriesByCategory(category);
    }

    public async search(query: string, limit = 5): Promise<MemoryResponseDTO[]> {
        return await this.memoryService.searchMemories(query, limit);
    }

    public async update(id: string, data: UpdateMemoryDTO): Promise<MemoryResponseDTO> {
        //this.validateId(id);
        return await this.memoryService.updateMemory(id, data);
    }

    public async delete(id: string): Promise<{ success: boolean; message: string }> {
        //this.validateId(id);
        await this.memoryService.forgetMemory(id);
        return { success: true, message: `Memória ${id} removida com sucesso.` };
    }

    private validateId(id: number): void {
        if (!id || isNaN(id) || id <= 0) {
            throw new AppError('ID de memória inválido.', 400);
        }
    }
}
