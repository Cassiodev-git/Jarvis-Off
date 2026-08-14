import { MemoryRepository } from './repository/MemoryRepository.js';
import { MemoryService } from './service/memory.service.js';
import { MemoryController } from './controller/memory.controller.js';

const memoryRepository = new MemoryRepository();
const memoryService = new MemoryService(memoryRepository);
const memoryController = new MemoryController(memoryService);

export { memoryRepository, memoryService, memoryController };
export * from './entity/memory.entity.js';
export * from './dto/memory.dto.js';
export * from './repository/ImemoryRepository.js';
export * from './repository/MemoryRepository.js';
export * from './service/memory.service.js';
export * from './controller/memory.controller.js';