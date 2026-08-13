import { db } from '../client.js';
import { users, settings } from '../schema/index.js';

async function seed() {
    console.log('🌱 Populando dados iniciais...');

    const userCount = db.select().from(users).all();
    if (userCount.length === 0) {
        db.insert(users)
            .values({
                name: 'Cassio',
                city: 'São joão',
                email: 'cassiolucio4@gmail.com',
                state: 'Pernambuco',
                nickname: 'Senhor',
                language: 'pt-BR',
            })
            .run();
        console.log('Adiministrador gerado');
    }

    const settingsCount = db.select().from(settings).all();
    if (settingsCount.length === 0) {
        db.insert(settings)
            .values({
                model: 'llama3.2:1b',
                language: 'pt-BR',
                wakeWord: 'jarvis',
                voice: 'pt_BR-faber-medium',
                volume: 80,
            })
            .run();
        console.log('⚙️ Configurações iniciais criadas.');
    }

    console.log('✅ Seeding concluído!');
}

seed().catch((err) => {
    console.error('❌ Erro no seeding:', err);
    process.exit(1);
});