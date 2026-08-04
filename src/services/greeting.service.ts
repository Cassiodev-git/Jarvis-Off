import { db } from '../modules/memory/db';
import { sql } from 'drizzle-orm';
import { speak } from '../voice/tts.service.js';

export async function handleDailyGreeting(): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];

    // Garante que a tabela existe com a coluna updated_at
    await db.run(sql`
        CREATE TABLE IF NOT EXISTS system_state (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Consulta a última data de saudação salva
    const result = await db.all<{ value: string }>(sql`
        SELECT value FROM system_state WHERE key = 'last_greeting_date'
    `);

    const lastGreetingDate = result[0]?.value;

    // Se já deu a saudação hoje, encerra sem repetir
    if (lastGreetingDate === today) {
        return false;
    }

    // Define a saudação conforme a hora do dia
    const hour = new Date().getHours();
    let timeGreeting = 'Bom dia';
    if (hour >= 12 && hour < 18) timeGreeting = 'Boa tarde';
    if (hour >= 18 || hour < 5) timeGreeting = 'Boa noite';

    const greetingMessage = `${timeGreeting}, senhor. Todos os sistemas operacionais estão online. Como posso ajudar hoje?`;

    // Registra no banco enviando updated_at para cumprir a constraint NOT NULL
    await db.run(sql`
        INSERT INTO system_state (key, value, updated_at) 
        VALUES ('last_greeting_date', ${today}, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET 
            value = ${today},
            updated_at = CURRENT_TIMESTAMP
    `);

    // Executa o áudio da saudação
    await speak(greetingMessage);
    return true;
}