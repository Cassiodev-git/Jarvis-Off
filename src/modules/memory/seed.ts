import { db } from './db';
import { userProfile, devices, projects, systemState, memories } from './schema';

export async function seedInitialMemory() {
    // 1. Ver se já existe perfil cadastrado
    const existingProfile = await db.select().from(userProfile).limit(1);

    if (existingProfile.length === 0) {
        console.log('🌱 Semeando dados iniciais na memória do Jarvis...');

        // Inserir Perfil do Usuário
        await db.insert(userProfile).values({
            name: 'Cássio',
            title: 'Senhor',
            language: 'Português',
            personality: 'Humor leve, formalidade e cortesia alta',
        });

        // Inserir Hardware Atual
        await db.insert(devices).values({
            name: 'PC Principal',
            processor: 'Ryzen 7 7730U',
            ram: '16GB RAM',
            os: 'Linux',
            isOnline: true,
        });

        // Inserir Projetos Iniciais
        await db.insert(projects).values([
            {
                name: 'Jarvis',
                status: 'Em desenvolvimento',
                techStack: 'Node.js, TypeScript, Fastify, SQLite, Drizzle ORM, Ollama',
                importance: 5,
            },
            {
                name: 'CashFlow Mobile',
                status: 'Em desenvolvimento',
                techStack: 'React Native, Expo, SQLite, Drizzle ORM',
                importance: 5,
            },
        ]);

        // Inserir Estado Atual Inicial
        await db.insert(systemState).values([
            { key: 'current_mode', value: 'Desenvolvimento' },
            { key: 'active_project', value: 'Jarvis' },
        ]);

        // Inserir Memórias Críticas de Nível 5
        await db.insert(memories).values([
            {
                content: 'O usuário prefere respostas diretas, sem enrolação e em Português e sinceridade.',
                category: 'preferencia',
                importance: 5,
            },
            {
                content: 'O ambiente roda 100% offline e sem custos de API externa.',
                category: 'arquitetura',
                importance: 5,
            },
        ]);

        console.log('✅ Memória inicial semeada com sucesso!');
    }
}