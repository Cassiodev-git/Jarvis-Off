export interface CreateMemoryDTO {
    content: string;
    category?: string;
    importance?: number;
    userId?: string;
    source?: 'user' | 'assistant' | 'system' | string;
    projectId?: string;
}

export interface UpdateMemoryDTO {
    content?: string;
    category?: string;
    importance?: number;
    userId?: string;
    source?: 'user' | 'assistant' | 'system' | string;
    projectId?: string;
}

export interface MemoryResponseDTO {
    id: string;
    userId?: string | null;
    content: string;
    category: string;
    importance: number;
    source: string;
    projectId?: string | null;
    createdAt: string;
    updatedAt: string;
    lastAccessedAt?: string | null;
}