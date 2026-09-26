export class PhoneticNormalizer {
    private static readonly REPLACEMENTS: readonly [RegExp, string][] = [
        [/j\s*\.?\s*a\s*\.?\s*r\s*\.?\s*v\s*\.?\s*i\s*\.?\s*s\s*\.?/gi, 'Jarvis'],
        [/^(?:jervis|jarves|javes|chaves|já\s+vi|javis)(?=\s*,|\s+(?:abra|execute|rode|inicie|feche|mude|anote|acorda)\b|$)/i, 'Jarvis'],
        [/\b(?:ves\s*code|vis\s*code|vscode|vs\s+cod)\b/gi, 'VS Code'],
        [/\b(?:google\s+cr[oô]me|g[uo]g[le]\s+crome|crome)\b/gi, 'Google Chrome'],
        [/\b(?:esp[io]t[ie]f[ai]|spotfy)\b/gi, 'Spotify'],
        [/\b(?:nautilus|n[au]tilo)\b/gi, 'Nautilus'],
        [/\b(?:abr[aei]|abri|abir)\b/gi, 'abra'],
        [/\b(?:abrir|abre|iniciar|inicia|inicie)\b/gi, 'abra'],
        [/\b(?:executa|ex[ei]cuta|rod[aei])\b/gi, 'execute'],
        [/\b(?:executar|rodar|roda)\b/gi, 'execute'],
        [/\b(?:fecha|fechar|encerra|encerrar)\b/gi, 'feche'],
        [/\b(?:memoriza|memorizar|memorise)\b/gi, 'memorize'],
        [/\b(?:lembra|lembrar)\b/gi, 'lembre-se'],
        [/\b(?:salva|salvar)\b/gi, 'salve'],
        [/\b(?:guarda|guardar)\b/gi, 'guarde'],
        [/\b(?:anota|anotar)\b/gi, 'anote'],
        [/\b(?:altera|alterar|edita|editar|muda|mudar)\b/gi, 'altere'],
        [/\b(?:apaga|apagar|remove|remover|esquece|esquecer)\b/gi, 'apague'],
        [/\b(?:busca|buscar|pesquisa|pesquisar|procura|procurar)\b/gi, 'busque'],
        [/\b(?:lista|listar)\b/gi, 'liste'],
        [/\b(?:mostra|mostrar)\b/gi, 'mostre'],
        [/\b(?:desliga|desligar)\b/gi, 'desligue'],
    ];

    public static normalize(text: string): string {
        let normalized = text.normalize('NFC').replace(/\s+/g, ' ').trim();
        for (const [pattern, replacement] of this.REPLACEMENTS) {
            normalized = normalized.replace(pattern, replacement);
        }
        return normalized;
    }
}
