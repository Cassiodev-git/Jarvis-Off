import { randomUUID } from 'node:crypto';
import { db } from './client.js'; // Ajuste o caminho para a sua instância do Drizzle db
import { memories } from './schema/memories.js'; // Ajuste o caminho do seu schema

async function seed() {
    console.log('🌱 Populando o banco com memórias avançadas e perfil completo...');

    const now = new Date().toISOString(); // Se seu campo for text/string, use ISOString. Se for integer, use Date.now()

    const initialMemories = [
        {
            id: randomUUID(),
            category: 'profile',
            content: 'O usuário principal é o Cássio (Cássio Lúcio Zeferino de Souza), Desenvolvedor Fullstack residente em Garanhuns - PE, Brasil.',
            importance: 3,
            createdAt: now,
            updatedAt: now,
        },
        {
            id: randomUUID(),
            category: 'hardware',
            content: 'Dispositivos e ecossistema de hardware do usuário: Smartphone POCO X6 PRO, notebook ryzen 7 com 16gb ram',
            importance: 3,
            createdAt: now,
            updatedAt: now,
        },
        {
            id: randomUUID(),
            category: 'stack',
            content: 'Stack técnica principal do Cássio: TypeScript, Node.js, Fastify, React, React Native, C#, SQLite (via Drizzle ORM) e ecossistema Linux/Bash.',
            importance: 3,
            createdAt: now,
            updatedAt: now,
        },
        {
            id: randomUUID(),
            category: 'ai_automation',
            content: 'Interesses e ferramentas de IA/Automação: Arquiteturas de IA Generativa, Engenharia de Prompts, Workflows de Multi-Agentes, Claude Code, n8n, Antigravity e Lovable.',
            importance: 3,
            createdAt: now,
            updatedAt: now,
        },
        {
            id: randomUUID(),
            category: 'coding_style',
            content: 'Diretrizes de arquitetura e código: Aplicação rigorosa de Clean Code, Clean Architecture, princípios SOLID, forte tipagem TypeScript e desacoplamento de camadas.',
            importance: 3,
            createdAt: now,
            updatedAt: now,
        },
        {
            id: randomUUID(),
            category: 'gaming',
            content: 'Preferências de jogos e plataformas: Utiliza a Steam como plataforma principal (jogos como Project Zomboid, Tomb Raider, Dying Light), Nuuvem e ecossistema Ubisoft.',
            importance: 2,
            createdAt: now,
            updatedAt: now,
        },
        {
            id: randomUUID(),
            category: 'preferences',
            content: 'Diretrizes de comportamento do J.A.R.V.I.S.: Respostas ultra diretas, sem pedidos de desculpas, sem enrolação formal, respostas concisas e prontas para sintetizador de voz (TTS).',
            importance: 3,
            createdAt: now,
            updatedAt: now,
        },
        {
            id: randomUUID(),
            category: 'project',
            content: 'Projeto atual em desenvolvimento ativo: J.A.R.V.I.S. Engine v1.0 — Assistente pessoal de automação local e apoio de desenvolvimento.',
            importance: 3,
            createdAt: now,
            updatedAt: now,
        },
    ];

    try {
        await db.insert(memories).values(initialMemories);
        console.log(`✅ Banco populado com sucesso! ${initialMemories.length} memórias registradas.`);
    } catch (error) {
        console.error('❌ Erro ao popular o banco de dados:', error);
    } finally {
        process.exit(0);
    }
}

seed().catch((error) => {
    console.error('❌ Falha crítica no script de seed:', error);
    process.exit(1);
});