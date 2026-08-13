// src/modules/memory/factory/memory.factory.ts
import { MemoryRepository } from '../repository/memory.repository.js';
import { MemoryService } from '../service/memory.service.js';

/**
 * Factory responsável por instanciar o MemoryService encapsulando
 * a criação do repositório e conexões internas do módulo.
 */
export function makeMemoryService(): MemoryService {
    const memoryRepository = new MemoryRepository();
    return new MemoryService(memoryRepository);
}