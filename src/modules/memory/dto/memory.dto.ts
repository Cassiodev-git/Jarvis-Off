export interface CreateMemoryDTO {
    category: string;
    content: string;
    importance?: number;
}

export interface UpdateMemoryDTO {
    category?: string;
    content?: string;
    importance?: number;
}

export interface MemoryResponseDTO {
    id: number;
    category: string;
    content: string;
    importance: number;
    createdAt: string;
}