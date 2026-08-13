# Camada de Banco de Dados — J.A.R.V.I.S.

Esta camada é responsável por toda a persistência de dados do assistente J.A.R.V.I.S.

## Tecnologias
- **Banco de Dados:** SQLite 3 (`better-sqlite3`)
- **ORM:** Drizzle ORM
- **Migration Tool:** Drizzle Kit

## Estrutura da Pasta

```text
database/
├── client.ts         # Instância única da conexão com o SQLite
├── drizzle.config.ts # Configuração de migrations do Drizzle Kit
├── index.ts          # Ponto de exportação público do banco
├── migrate.ts        # Script de aplicação das migrations
├── migrations/       # Arquivos SQL gerados pelo Drizzle Kit
├── schema/           # Definição das tabelas (users, memories, projects, settings)
├── seed/             # População de dados padrão do sistema
├── storage/          # Local do arquivo físico jarvis.db
└── README.md