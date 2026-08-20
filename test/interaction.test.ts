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

test('formata a resposta sem expor o nome do usuário', () => {
    assert.equal(ResponseFormatter.format('Olá, Cássio.'), 'Olá, senhor.');
    assert.equal(ResponseFormatter.format('Sou o J.A.R.V.I.S.'), 'Sou o Jarvis, senhor.');
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
});

test('reconhece variações fonéticas das intenções', async () => {
    const manager = new IntentManager(undefined, logger);
    assert.equal((await manager.analyze('Jervis, executa o script typecheck')).intent, 'RUN_SCRIPT');
    assert.equal((await manager.analyze('Jervis, fecha o Firefox')).intent, 'CLOSE_APPLICATION');
    assert.equal((await manager.analyze('Jervis, memoriza que tenho reunião')).intent, 'SAVE_MEMORY');
    assert.equal((await manager.analyze('Jervis, desligar sistema')).intent, 'SYSTEM_SHUTDOWN');
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
