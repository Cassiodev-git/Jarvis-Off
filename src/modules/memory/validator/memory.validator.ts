import { AppError } from '../../../shared/errors/AppError.js';
import { CreateMemoryDTO, UpdateMemoryDTO } from '../dto/memory.dto.js';

export class MemoryValidator {
    public static validateCreate(data: CreateMemoryDTO): void {
        if (!data.content || data.content.trim().length === 0) {
            throw new AppError('O conteúdo da memória é obrigatório.', 400);
        }

        if (!data.category || data.category.trim().length === 0) {
            throw new AppError('A categoria da memória é obrigatória.', 400);
        }

        if (data.importance !== undefined && (data.importance < 1 || data.importance > 5)) {
            throw new AppError('A importância da memória deve ser um valor entre 1 e 5.', 400);
        }
    }

    public static validateUpdate(data: UpdateMemoryDTO): void {
        if (data.content !== undefined && data.content.trim().length === 0) {
            throw new AppError('O conteúdo da memória não pode ser vazio.', 400);
        }

        if (data.category !== undefined && data.category.trim().length === 0) {
            throw new AppError('A categoria da memória não pode ser vazia.', 400);
        }

        if (data.importance !== undefined && (data.importance < 1 || data.importance > 5)) {
            throw new AppError('A importância da memória deve ser um valor entre 1 e 5.', 400);
        }
    }
}