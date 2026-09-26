import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { IntentManager } from '../src/core/IntentManager.ts';
import { PhoneticNormalizer } from '../src/core/services/PhoneticNormalizer.ts';
import { IntentPayloadSanitizer } from '../src/core/services/IntentPayloadSanitizer.ts';
import { ResponseFormatter } from '../src/core/services/ResponseFormatter.ts';
import { WakePhraseMatcher } from '../src/core/services/WakePhraseMatcher.ts';
import { TemporaryAudioStore } from '../src/infrastructure/speech/TemporaryAudioStore.ts';
import { CommandDispatcher } from '../src/modules/system/CommandDispatcher.ts';

const logger = { info() {}, warn() {}, error() {}, debug() {} };

test('normaliza variações fonéticas de comandos', () => {
    const normalized = PhoneticNormalizer.normalize('Jervis, abri a ves code');
    assert.equal(normalized, 'Jarvis, abra a VS Code');
    assert.equal(PhoneticNormalizer.normalize('As chaves da casa'), 'As chaves da casa');
    assert.equal(PhoneticNormalizer.normalize('J.A.R.V.I.S., abra o VS Code'), 'Jarvis, abra o VS Code');
});

test('preserva Cássio e varia o vocativo final', () => {
    assert.match(ResponseFormatter.format('Olá, Cássio.'), /^Olá, Cássio\.$/);
    assert.match(ResponseFormatter.format('Sou o J.A.R.V.I.S.'), /^Sou o Jarvis, (senhor|Cássio|chefe|comandante)\.$/);
});

test('remove links e URLs das respostas', () => {
    assert.match(ResponseFormatter.format('Veja [esta página](https://example.com).'), /^Veja esta página,? (senhor|Cássio|chefe|comandante)\.$/);
    assert.doesNotMatch(ResponseFormatter.format('Acesse https://example.com para continuar.'), /https?:\/\//);
});

test('reconhece frases de despertar e rejeita fala comum', () => {
    assert.equal(WakePhraseMatcher.matches('Jervis, acorda'), true);
    assert.equal(WakePhraseMatcher.matches('Jarvis, acorda criança'), true);
    assert.equal(WakePhraseMatcher.matches('opa'), true);
    assert.equal(WakePhraseMatcher.matches('acorda agora'), false);
});

test('extrai somente o nome da aplicação', async () => {
    const manager = new IntentManager(undefined, logger);
    const result = await manager.analyze('Jarvis, abra o VS Code para mim e me avise quando terminar');
    assert.equal(result.intent, 'OPEN_APPLICATION');
    assert.equal(result.payload?.target, 'VS Code');
    assert.equal(IntentPayloadSanitizer.sanitizeApplicationTarget('o navegador por favor'), 'navegador');
    assert.equal(
        IntentPayloadSanitizer.sanitizeApplicationTarget('VS Code! depois'),
        'VS Code',
    );
    const courteousResult = await manager.analyze('por favor, abra o VS Code depois');
    assert.equal(courteousResult.payload?.target, 'VS Code');
});

test('reconhece variações fonéticas das intenções', async () => {
    const manager = new IntentManager(undefined, logger);
    assert.equal((await manager.analyze('Jervis, executa o script typecheck')).intent, 'RUN_SCRIPT');
    assert.equal((await manager.analyze('Jervis, fecha o Firefox')).intent, 'CLOSE_APPLICATION');
    assert.equal((await manager.analyze('Jervis, memoriza que tenho reunião')).intent, 'SAVE_MEMORY');
    assert.equal((await manager.analyze('Jervis, desligar sistema')).intent, 'SYSTEM_SHUTDOWN');
});

test('detecta alteração e remoção de qualquer memória por UUID', async () => {
    const manager = new IntentManager(undefined, logger);
    const id = '123e4567-e89b-12d3-a456-426614174000';
    const update = await manager.analyze(`Jervis, mude a memória ${id} para reunião amanhã`);
    assert.equal(update.intent, 'UPDATE_MEMORY');
    assert.equal(update.payload?.id, id);
    assert.equal(update.payload?.rawContent, 'reunião amanhã');

    const deletion = await manager.analyze(`Jervis, apague a memória ${id}`);
    assert.equal(deletion.intent, 'DELETE_MEMORY');
    assert.equal(deletion.payload?.id, id);
});

test('detecta operações de memória pelo conteúdo', async () => {
    const manager = new IntentManager(undefined, logger);
    const update = await manager.analyze('altere a memória que diz reunião com cliente para reunião com equipe');
    assert.equal(update.intent, 'UPDATE_MEMORY');
    assert.equal(update.payload?.memoryQuery, 'reunião com cliente');
    assert.equal(update.payload?.rawContent, 'reunião com equipe');

    const deletion = await manager.analyze('apague a memória que diz senha temporária');
    assert.equal(deletion.intent, 'DELETE_MEMORY');
    assert.equal(deletion.payload?.memoryQuery, 'senha temporária');
});

test('detecta busca de notícias por tema', async () => {
    const manager = new IntentManager(undefined, logger);
    const result = await manager.analyze('Jarvis, pesquise notícias sobre inteligência artificial');
    assert.equal(result.intent, 'SEARCH_NEWS');
    assert.equal(result.payload?.query, 'inteligência artificial');
});

test('detecta comandos de automação do navegador', async () => {
    const manager = new IntentManager(undefined, logger);
    assert.equal((await manager.analyze('abra https://example.com')).intent, 'BROWSER_OPEN');
    assert.equal((await manager.analyze('pesquise no navegador por TypeScript')).intent, 'BROWSER_SEARCH');
    assert.equal((await manager.analyze('abra uma nova aba')).intent, 'BROWSER_NEW_TAB');
    assert.equal((await manager.analyze('feche a aba')).intent, 'BROWSER_CLOSE_TAB');
    assert.equal((await manager.analyze('volte uma página')).intent, 'BROWSER_BACK');
    assert.equal((await manager.analyze('atualize a página')).intent, 'BROWSER_REFRESH');
    assert.equal((await manager.analyze('leia a página')).intent, 'BROWSER_READ');
    assert.equal((await manager.analyze('preencha o campo #email com cassio@example.com')).intent, 'BROWSER_FILL');
    const video = await manager.analyze('selecione o primeiro vídeo');
    assert.equal(video.intent, 'BROWSER_SELECT_VIDEO');
    assert.equal(video.payload?.index, 1);
    assert.equal((await manager.analyze('clique no botão Entrar')).intent, 'BROWSER_CLICK_TEXT');
    assert.equal((await manager.analyze('preencha o campo chamado E-mail com cassio@example.com')).intent, 'BROWSER_FILL_LABEL');
    const tab = await manager.analyze('mude para a aba 2');
    assert.equal(tab.intent, 'BROWSER_SELECT_TAB');
    assert.equal(tab.payload?.index, 2);
    const workflow = await manager.analyze('pesquise TypeScript, abra o primeiro resultado e leia a página');
    assert.equal(workflow.intent, 'BROWSER_WORKFLOW');
    assert.equal(workflow.payload?.query, 'TypeScript');
    assert.equal((await manager.analyze('veja minha tela')).intent, 'BROWSER_SCREEN_ANALYZE');
});

test('recusa executáveis que não estão na whitelist', async () => {
    const dispatcher = new CommandDispatcher(logger);
    const result = await dispatcher.dispatch('OPEN_APPLICATION', { appName: 'sh' });
    assert.equal(result.success, false);
});

test('remove o WAV temporário após uso', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'jarvis-stt-'));
    const store = new TemporaryAudioStore(directory);
    const filePath = await store.createWav(Buffer.alloc(3200), 16000);
    assert.equal((await fs.stat(filePath)).isFile(), true);
    await store.remove(filePath);
    await assert.rejects(fs.stat(filePath));
    await fs.rm(directory, { recursive: true, force: true });
});
