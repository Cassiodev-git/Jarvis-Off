import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { promises as fsPromises } from 'node:fs';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import { BrowserTab, IBrowserAutomation } from '../../core/contracts/IBrowserAutomation.js';

const execFileAsync = promisify(execFile);

export class BrowserAutomationService implements IBrowserAutomation {
    private context?: BrowserContext;
    private connectedBrowser?: Browser;
    private pages: Page[] = [];
    private currentPage?: Page;

    public async open(url: string): Promise<string> {
        const safeUrl = this.validateUrl(url);
        const page = await this.activePage();
        await page.goto(safeUrl, { waitUntil: 'domcontentloaded', timeout: env.BROWSER_TIMEOUT_MS });
        return `Página aberta: ${await this.describePage(page)}`;
    }

    public async search(query: string): Promise<string> {
        const normalized = query.trim();
        if (normalized.length < 2) throw new AppError('Informe o que deseja pesquisar.', 400);
        return this.open(`${env.BROWSER_SEARCH_URL}${encodeURIComponent(normalized)}`);
    }

    public async newTab(url?: string): Promise<string> {
        const context = await this.getContext();
        const page = await context.newPage();
        this.trackPage(page);
        this.currentPage = page;
        if (url) await page.goto(this.validateUrl(url), { waitUntil: 'domcontentloaded', timeout: env.BROWSER_TIMEOUT_MS });
        return `Nova aba aberta: ${await this.describePage(page)}`;
    }

    public async closeTab(): Promise<string> {
        const page = await this.activePage();
        if (this.pages.length <= 1) return 'A última aba não pode ser fechada.';
        await page.close();
        this.pages = this.pages.filter((candidate) => candidate !== page);
        this.currentPage = this.pages.at(-1);
        return 'Aba fechada.';
    }

    public async back(): Promise<string> {
        const page = await this.activePage();
        await page.goBack({ waitUntil: 'domcontentloaded', timeout: env.BROWSER_TIMEOUT_MS }).catch(() => null);
        return `Página anterior: ${await this.describePage(page)}`;
    }

    public async forward(): Promise<string> {
        const page = await this.activePage();
        await page.goForward({ waitUntil: 'domcontentloaded', timeout: env.BROWSER_TIMEOUT_MS }).catch(() => null);
        return `Página seguinte: ${await this.describePage(page)}`;
    }

    public async refresh(): Promise<string> {
        const page = await this.activePage();
        await page.reload({ waitUntil: 'domcontentloaded', timeout: env.BROWSER_TIMEOUT_MS });
        return `Página atualizada: ${await this.describePage(page)}`;
    }

    public async readPage(): Promise<string> {
        const page = await this.activePage();
        const text = await page.locator('body').evaluate((body) => {
            const copy = body.cloneNode(true) as HTMLElement;
            copy.querySelectorAll('a, [role="link"]').forEach((link) => link.remove());
            return (copy.innerText || copy.textContent || '').replace(/\s+/g, ' ').trim();
        });
        const excerpt = text.slice(0, env.BROWSER_MAX_READ_CHARS);
        return excerpt ? `Conteúdo da página: ${excerpt}` : 'A página não possui texto legível.';
    }

    public async listTabs(): Promise<BrowserTab[]> {
        await this.getContext();
        return Promise.all(this.pages.map(async (page, index) => ({
            index,
            title: await page.title().catch(() => ''),
            url: page.url(),
        })));
    }

    public async click(selector: string): Promise<string> {
        const page = await this.activePage();
        const safeSelector = this.validateSelector(selector);
        try {
            await page.locator(safeSelector).first().click({ timeout: env.BROWSER_TIMEOUT_MS });
        } catch (error) {
            // Recuperação: quando o comando veio como texto, tenta localizar por
            // acessibilidade/texto antes de desistir.
            if (!this.looksLikeCssSelector(safeSelector)) {
                await this.clickText(safeSelector);
            } else {
                throw error;
            }
        }
        return `Elemento clicado. Página atual: ${await this.describePage(page)}`;
    }

    public async fill(selector: string, value: string): Promise<string> {
        const page = await this.activePage();
        const safeSelector = this.validateSelector(selector);
        if (!value.trim()) throw new AppError('O valor para preenchimento não pode estar vazio.', 400);
        await page.locator(safeSelector).first().fill(value, { timeout: env.BROWSER_TIMEOUT_MS });
        return 'Campo preenchido. O envio não foi executado automaticamente.';
    }

    public async clickText(text: string): Promise<string> {
        const page = await this.activePage();
        const normalized = text.trim();
        if (!normalized || normalized.length > 200) throw new AppError('Texto de clique inválido.', 400);

        const candidates = [
            page.getByRole('button', { name: normalized, exact: false }).first(),
            page.getByRole('link', { name: normalized, exact: false }).first(),
            page.getByText(normalized, { exact: false }).first(),
        ];
        for (const candidate of candidates) {
            if (await candidate.count() > 0) {
                await candidate.click({ timeout: env.BROWSER_TIMEOUT_MS });
                return `Elemento "${normalized}" clicado.`;
            }
        }
        throw new AppError(`Não encontrei o elemento "${normalized}".`, 404);
    }

    public async fillLabel(label: string, value: string): Promise<string> {
        const page = await this.activePage();
        if (!label.trim() || !value.trim()) throw new AppError('Informe o rótulo e o valor do campo.', 400);
        await page.getByLabel(label.trim(), { exact: false }).first().fill(value, {
            timeout: env.BROWSER_TIMEOUT_MS,
        });
        return `Campo "${label.trim()}" preenchido. O envio não foi executado automaticamente.`;
    }

    public async selectTab(index: number): Promise<string> {
        await this.getContext();
        if (!Number.isInteger(index) || index < 1 || index > this.pages.length) {
            throw new AppError(`A aba ${index} não existe.`, 404);
        }
        this.currentPage = this.pages[index - 1];
        await this.currentPage.bringToFront();
        return `Aba ${index} selecionada.`;
    }

    public async requiresClickConfirmation(selector: string): Promise<boolean> {
        const page = await this.activePage();
        const safeSelector = this.validateSelector(selector);
        const target = page.locator(safeSelector).first();
        if (await target.count() === 0) return false;
        return target.evaluate((element) => {
            const text = `${element.textContent || ''} ${(element as HTMLInputElement).value || ''}`.toLowerCase();
            const tag = element.tagName.toLowerCase();
            const type = (element as HTMLInputElement).type?.toLowerCase();
            return type === 'submit'
                || tag === 'button'
                || Boolean(element.closest('form'))
                || /enviar|publicar|comprar|confirmar|excluir|apagar|remover|delete|submit|send/.test(text);
        });
    }

    public async selectVideo(index = 1, title?: string): Promise<string> {
        const page = await this.activePage();
        if (title) {
            const titledVideo = page.getByText(title, { exact: false }).first();
            await titledVideo.click({ timeout: env.BROWSER_TIMEOUT_MS });
            return `Vídeo "${title}" selecionado.`;
        }

        const videos = page.locator([
            'ytd-video-renderer',
            'ytd-grid-video-renderer',
            'a[href*="/watch"]',
            'a[href*="/video/"]',
        ].join(', ')).filter({ visible: true });

        const count = await videos.count();
        if (count < index || index < 1) {
            throw new AppError(`Não encontrei o ${this.ordinal(index)} vídeo visível.`, 404);
        }

        await videos.nth(index - 1).click({ timeout: env.BROWSER_TIMEOUT_MS });
        return `${this.ordinal(index)} vídeo selecionado.`;
    }

    public async analyzeScreen(): Promise<Buffer> {
        const desktopCapture = await this.captureDesktop().catch(() => undefined);
        if (desktopCapture) return desktopCapture;

        const page = await this.activePage();
        return page.screenshot({ type: 'png' });
    }

    public async searchAndRead(query: string): Promise<string> {
        await this.search(query);
        const page = await this.activePage();
        const results = page.locator('a.result__a, [data-testid="result-title-a"], main a[href]')
            .filter({ visible: true });
        const count = await results.count();
        if (count === 0) throw new AppError('Não encontrei um resultado para abrir.', 404);
        await results.first().click({ timeout: env.BROWSER_TIMEOUT_MS });
        await page.waitForLoadState('domcontentloaded', { timeout: env.BROWSER_TIMEOUT_MS }).catch(() => undefined);
        return this.readPage();
    }

    public async close(): Promise<void> {
        if (this.connectedBrowser) {
            // Não fecha o Brave do usuário; apenas libera a conexão do Jarvis.
            this.connectedBrowser = undefined;
        } else {
            await this.context?.close();
        }
        this.context = undefined;
        this.pages = [];
        this.currentPage = undefined;
    }

    private async activePage(): Promise<Page> {
        const context = await this.getContext();
        const current = this.currentPage && !this.currentPage.isClosed() ? this.currentPage : this.pages.at(-1);
        if (current && !current.isClosed()) return current;
        const page = await context.newPage();
        this.trackPage(page);
        return page;
    }

    private async getContext(): Promise<BrowserContext> {
        if (this.context) return this.context;
        try {
            this.connectedBrowser = await chromium.connectOverCDP(env.BROWSER_REMOTE_DEBUGGING_URL, {
                timeout: 1500,
            });
            this.context = this.connectedBrowser.contexts()[0];
            if (!this.context) throw new Error('Nenhum contexto do Brave foi encontrado.');
        } catch {
            this.connectedBrowser = undefined;

            const executablePath = this.findBraveExecutable();
            if (!executablePath) {
                throw new AppError('Brave não encontrado. Instale-o ou defina BROWSER_EXECUTABLE_PATH.', 503);
            }

            try {
                this.context = await chromium.launchPersistentContext(path.resolve(env.BROWSER_PROFILE_PATH), {
                    executablePath,
                    headless: env.BROWSER_HEADLESS,
                    viewport: { width: 1440, height: 900 },
                    args: ['--remote-debugging-port=9222'],
                });
            } catch (error) {
                throw new AppError(`Não foi possível iniciar o Brave: ${(error as Error).message}`, 503);
            }
        }
        this.pages = [...this.context.pages()];
        for (const page of this.pages) this.trackPage(page);
        this.currentPage = this.pages.at(-1);
        return this.context;
    }

    private findBraveExecutable(): string | undefined {
        const candidates = [
            env.BROWSER_EXECUTABLE_PATH,
            '/usr/bin/brave-browser',
            '/usr/bin/brave',
            '/opt/brave.com/brave/brave-browser',
        ].filter(Boolean);
        return candidates.find((candidate) => fs.existsSync(candidate));
    }

    private trackPage(page: Page): void {
        if (!this.pages.includes(page)) this.pages.push(page);
        page.on('close', () => {
            this.pages = this.pages.filter((candidate) => candidate !== page);
        });
    }

    private validateUrl(url: string): string {
        let parsed: URL;
        try {
            parsed = new URL(url.trim());
        } catch {
            throw new AppError('Informe uma URL válida.', 400);
        }
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            throw new AppError('Apenas URLs HTTP e HTTPS são permitidas.', 400);
        }
        if (env.BROWSER_ALLOWED_HOSTS.length > 0 && !env.BROWSER_ALLOWED_HOSTS.includes(parsed.hostname.toLowerCase())) {
            throw new AppError('Este site não está na lista permitida do navegador.', 403);
        }
        if (env.BROWSER_BLOCKED_HOSTS.includes(parsed.hostname.toLowerCase())) {
            throw new AppError('Este site está bloqueado pela política do navegador.', 403);
        }
        return parsed.toString();
    }

    private validateSelector(selector: string): string {
        const normalized = selector.trim();
        if (!normalized || normalized.length > 300 || /[\r\n]/.test(normalized)) {
            throw new AppError('Seletor CSS inválido ou muito longo.', 400);
        }
        return normalized;
    }

    private async describePage(page: Page): Promise<string> {
        return (await page.title().catch(() => 'Sem título')) || 'Sem título';
    }

    private looksLikeCssSelector(value: string): boolean {
        return /^[.#\[]|^[a-z][a-z0-9-]*(?:[#.\[: ]|$)/i.test(value);
    }

    private async captureDesktop(): Promise<Buffer | undefined> {
        const outputPath = path.join(tmpdir(), `jarvis-screen-${randomUUID()}.png`);
        const commands: Array<{ command: string; args: string[] }> = [
            { command: 'gnome-screenshot', args: ['-f', outputPath] },
            { command: 'scrot', args: [outputPath] },
            { command: 'grim', args: [outputPath] },
            { command: 'import', args: ['-window', 'root', outputPath] },
        ];

        try {
            for (const candidate of commands) {
                try {
                    await execFileAsync(candidate.command, candidate.args, { timeout: env.BROWSER_TIMEOUT_MS });
                    return await fsPromises.readFile(outputPath);
                } catch {
                    // Tenta a próxima ferramenta disponível no sistema.
                }
            }
            return undefined;
        } finally {
            await fsPromises.unlink(outputPath).catch(() => undefined);
        }
    }

    private ordinal(index: number): string {
        return ({ 1: 'primeiro', 2: 'segundo', 3: 'terceiro', 4: 'quarto', 5: 'quinto' } as Record<number, string>)[index]
            || `${index}º`;
    }
}
