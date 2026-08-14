import { CreateMemoryDTO, UpdateMemoryDTO } from '../dto/memory.dto.js';
import { AppError } from '../../../shared/errors/AppError.js';

export class MemoryValidator {
    private static readonly VALID_SOURCES = ['user', 'assistant', 'system'];

    public static validateCreate(data: CreateMemoryDTO): void {
        if (!data) {
            throw new AppError('Dados para criação de memória não fornecidos.', 400);
        }

        if (!data.content || typeof data.content !== 'string' || data.content.trim().length === 0) {
            throw new AppError('O conteúdo da memória é obrigatório e deve ser um texto não vazio.', 400);
        }

        if (data.category !== undefined && (typeof data.category !== 'string' || data.category.trim().length === 0)) {
            throw new AppError('A categoria, quando informada, deve ser um texto válido.', 400);
        }

        if (data.importance !== undefined) {
            if (!Number.isInteger(data.importance) || data.importance < 1 || data.importance > 5) {
                throw new AppError('A importância deve ser um número inteiro entre 1 e 5.', 400);
            }
        }

        if (data.source !== undefined && !this.VALID_SOURCES.includes(data.source)) {
            throw new AppError(
                `A origem (source) deve ser uma das seguintes: ${this.VALID_SOURCES.join(', ')}.`,
                400
            );
        }

        if (data.userId !== undefined && data.userId !== null && (typeof data.userId !== 'string' || data.userId.trim().length === 0)) {
            throw new AppError('O userId, quando informado, deve ser uma string válida.', 400);
        }

        if (data.projectId !== undefined && data.projectId !== null && (typeof data.projectId !== 'string' || data.projectId.trim().length === 0)) {
            throw new AppError('O projectId, quando informado, deve ser uma string válida.', 400);
        }
    }

    public static validateUpdate(data: UpdateMemoryDTO): void {
        if (!data || Object.keys(data).length === 0) {
            throw new AppError('Forneça ao menos um campo para atualização da memória.', 400);
        }

        if (data.content !== undefined && (typeof data.content !== 'string' || data.content.trim().length === 0)) {
            throw new AppError('O conteúdo da memória deve ser um texto não vazio.', 400);
        }

        if (data.category !== undefined && (typeof data.category !== 'string' || data.category.trim().length === 0)) {
            throw new AppError('A categoria deve ser um texto válido.', 400);
        }

        if (data.importance !== undefined) {
            if (!Number.isInteger(data.importance) || data.importance < 1 || data.importance > 5) {
                throw new AppError('A importância deve ser um número inteiro entre 1 e 5.', 400);
            }
        }

        if (data.source !== undefined && !this.VALID_SOURCES.includes(data.source)) {
            throw new AppError(
                `A origem (source) deve ser uma das seguintes: ${this.VALID_SOURCES.join(', ')}.`,
                400
            );
        }

        if (data.userId !== undefined && data.userId !== null && (typeof data.userId !== 'string' || data.userId.trim().length === 0)) {
            throw new AppError('O userId deve ser uma string válida.', 400);
        }

        if (data.projectId !== undefined && data.projectId !== null && (typeof data.projectId !== 'string' || data.projectId.trim().length === 0)) {
            throw new AppError('O projectId deve ser uma string válida.', 400);
        }
    }
}