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
```

## Automação local do navegador

O Jarvis usa Playwright e Brave localmente, sem API paga. Ele tenta conectar-se ao
Brave já aberto pela porta de depuração `9222`; se não encontrar uma sessão, inicia
o Brave automaticamente com um perfil persistente.

Exemplos:

- `abra https://example.com`
- `pesquise no navegador por TypeScript`
- `abra uma nova aba`
- `volte uma página`, `avance uma página` ou `atualize a página`
- `leia a página` ou `liste as abas`
- `clique no seletor #entrar`
- `clique no botão Entrar` (pede confirmação antes de executar)
- `preencha o campo #email com cassio@example.com`
- `preencha o campo chamado E-mail com cassio@example.com`
- `selecione o primeiro vídeo`
- `selecione o segundo vídeo com título TypeScript`
- `mude para a aba 2`
- `pesquise TypeScript, abra o primeiro resultado e leia a página`
- `veja minha tela` (requer um modelo de visão local, como `llava`)

O navegador fica visível por padrão. Use `BROWSER_HEADLESS=true` em servidores
sem interface gráfica. O perfil persistente fica em `.jarvis-browser-profile` ou
no caminho de `BROWSER_PROFILE_PATH`. Para conectar a uma janela já aberta, o Brave
precisa ter sido iniciado com `--remote-debugging-port=9222`.

Para restringir a navegação, configure `BROWSER_ALLOWED_HOSTS` com hosts separados
por vírgula; `BROWSER_BLOCKED_HOSTS` pode bloquear hosts específicos. O histórico
enviado ao modelo é limitado por `MAX_HISTORY_MESSAGES`. Para habilitar a visão,
instale um modelo compatível no Ollama e configure `VISION_MODEL`.
