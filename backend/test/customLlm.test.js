import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chmod, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  ensureCustomLlmRuntime,
  publishCustomLlmCatalog,
  readCustomLlmCatalogSync,
  readCustomLlmRuntimeSync,
  readCustomLlmSecretsSync,
  selectableCustomLlms,
  validateCustomLlmInput,
  writeCustomLlmSecret,
} from '../src/lib/customLlm.js';
import { assertModelSelectionAvailable } from '../src/lib/modelSelection.js';

const PROVIDER_ID = 'custom:11111111-1111-4111-8111-111111111111';

test('custom LLM validation accepts a Codex responses endpoint and rejects secrets in the URL', () => {
  const valid = validateCustomLlmInput(
    {
      name: 'Relay',
      harness: 'codex',
      baseUrl: 'https://relay.example/v1/',
      wireApi: 'responses',
      models: ['gpt-x'],
      defaultModel: 'gpt-x',
      apiKey: 'secret-key',
    },
    { requireApiKey: true }
  );
  assert.equal(valid.baseUrl, 'https://relay.example/v1');
  assert.equal(valid.apiKey, 'secret-key');

  assert.throws(
    () =>
      validateCustomLlmInput({
        name: 'Relay',
        harness: 'codex',
        baseUrl: 'https://user:password@relay.example/v1',
        models: ['gpt-x'],
      }),
    (error) => error.errors.some((item) => item.field === 'baseUrl')
  );
});

test('custom LLM files store the key separately from the catalog', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'custom-llm-'));
  const credentialsPath = join(dir, 'providers.json');
  await writeCustomLlmSecret(PROVIDER_ID, 'secret-key', credentialsPath);
  await publishCustomLlmCatalog(
    () => [
      {
        id: PROVIDER_ID,
        name: 'Relay',
        harness: 'codex',
        baseUrl: 'https://relay.example/v1',
        wireApi: 'responses',
        models: [{ id: 'gpt-x', label: 'gpt-x' }],
        defaultModel: 'gpt-x',
        enabled: true,
      },
    ],
    credentialsPath
  );

  const catalogText = await readFile(join(dir, 'custom-llm-providers.json'), 'utf8');
  const runtimeText = await readFile(join(dir, 'custom-llm-runtime.json'), 'utf8');
  assert.equal(catalogText.includes('secret-key'), false);
  assert.equal(runtimeText.includes('secret-key'), true);
  assert.equal(readCustomLlmSecretsSync(credentialsPath).secrets[PROVIDER_ID], 'secret-key');
  assert.equal(readCustomLlmRuntimeSync(credentialsPath).providers[0].apiKey, 'secret-key');
  assert.equal(readCustomLlmRuntimeSync(credentialsPath).providers[0].baseUrl, 'https://relay.example/v1');
  assert.equal(readCustomLlmCatalogSync(credentialsPath).providers[0].name, 'Relay');
  assert.deepEqual(
    selectableCustomLlms(credentialsPath).map((provider) => provider.apiKeyConfigured),
    [true]
  );
  assert.equal(JSON.stringify(selectableCustomLlms(credentialsPath)).includes('secret-key'), false);
});

test('Codex chat completions are rejected instead of stored as wire_api=chat', () => {
  assert.throws(
    () =>
      validateCustomLlmInput(
        {
          name: 'Relay',
          harness: 'codex',
          baseUrl: 'https://relay.example/v1',
          wireApi: 'chat',
          models: ['gpt-x'],
          apiKey: 'secret-key',
        },
        { requireApiKey: true }
      ),
    (error) => error.errors.some((item) => item.field === 'wireApi' && item.message.includes('wire_api="chat"'))
  );
});

function provider(baseUrl) {
  return {
    id: PROVIDER_ID,
    name: 'Relay',
    harness: 'codex',
    baseUrl,
    wireApi: 'responses',
    models: [{ id: 'gpt-x', label: 'gpt-x' }],
    defaultModel: 'gpt-x',
    enabled: true,
  };
}

test('a catalog publish reads inside the write queue, so a newer save is not overwritten by an older read', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'custom-llm-race-'));
  const credentialsPath = join(dir, 'providers.json');
  let version = 'https://old.example/v1';
  let releaseFirst;
  const firstHolding = new Promise((resolve) => {
    releaseFirst = resolve;
  });
  let entered = false;
  const first = publishCustomLlmCatalog(async () => {
    const snapshot = provider(version);
    entered = true;
    await firstHolding;
    return [snapshot];
  }, credentialsPath);
  while (!entered) await new Promise((resolve) => setTimeout(resolve, 1));

  version = 'https://new.example/v1';
  const second = publishCustomLlmCatalog(async () => [provider(version)], credentialsPath);
  releaseFirst();
  await first;
  await second;

  assert.equal(readCustomLlmCatalogSync(credentialsPath).providers[0].baseUrl, 'https://new.example/v1');
});

test('startup publishes a runtime snapshot from the database and the credential file', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'custom-llm-startup-'));
  const credentialsPath = join(dir, 'providers.json');
  const record = provider('https://relay.example/v1');
  await writeFile(
    join(dir, 'custom-llm-secrets.json'),
    JSON.stringify({ version: 1, secrets: { [PROVIDER_ID]: 'secret-key' } }),
    { mode: 0o600 }
  );
  await writeFile(
    join(dir, 'custom-llm-providers.json'),
    JSON.stringify({ version: 1, providers: [{ ...record, baseUrl: 'https://old.example/v1' }] }),
    { mode: 0o600 }
  );

  assert.equal(selectableCustomLlms(credentialsPath).length, 0);
  await ensureCustomLlmRuntime({ customLlmProvider: { findMany: async () => [record] } }, credentialsPath);

  const runtime = readCustomLlmRuntimeSync(credentialsPath).providers[0];
  assert.equal(runtime.baseUrl, 'https://relay.example/v1');
  assert.equal(runtime.apiKey, 'secret-key');
  assert.equal(readCustomLlmCatalogSync(credentialsPath).providers[0].baseUrl, 'https://relay.example/v1');
  assert.equal(JSON.stringify(readCustomLlmCatalogSync(credentialsPath)).includes('secret-key'), false);
  assert.equal(selectableCustomLlms(credentialsPath)[0].id, PROVIDER_ID);
});

test('startup does not create a credential directory when nothing is configured', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'custom-llm-empty-startup-'));
  const parent = join(dir, 'readonly');
  await mkdir(parent, { mode: 0o500 });
  const credentialsPath = join(parent, 'credentials', 'providers.json');
  let queries = 0;
  try {
    await ensureCustomLlmRuntime(
      {
        customLlmProvider: {
          findMany: async () => {
            queries += 1;
            return [];
          },
        },
      },
      credentialsPath
    );
    assert.equal(queries, 1);
    assert.equal(existsSync(join(parent, 'credentials')), false);
  } finally {
    await chmod(parent, 0o700);
  }
});

test('startup still publishes when saved providers cannot use an existing snapshot', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'custom-llm-unwritable-startup-'));
  const parent = join(dir, 'readonly');
  await mkdir(parent, { mode: 0o500 });
  const credentialsPath = join(parent, 'credentials', 'providers.json');
  try {
    await assert.rejects(
      ensureCustomLlmRuntime(
        { customLlmProvider: { findMany: async () => [provider('https://relay.example/v1')] } },
        credentialsPath
      )
    );
    assert.equal(existsSync(join(parent, 'credentials', 'custom-llm-runtime.json')), false);
  } finally {
    await chmod(parent, 0o700);
  }
});

test('startup publishes an empty snapshot when older files have no runtime', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'custom-llm-legacy-empty-'));
  const credentialsPath = join(dir, 'providers.json');
  await writeFile(join(dir, 'custom-llm-providers.json'), JSON.stringify({ version: 1, providers: [] }), {
    mode: 0o600,
  });
  await writeFile(join(dir, 'custom-llm-secrets.json'), JSON.stringify({ version: 1, secrets: {} }), {
    mode: 0o600,
  });

  await ensureCustomLlmRuntime({ customLlmProvider: { findMany: async () => [] } }, credentialsPath);

  assert.deepEqual(readCustomLlmRuntimeSync(credentialsPath).providers, []);
  assert.equal(selectableCustomLlms(credentialsPath).length, 0);
});

test('startup clears a stale runtime snapshot when the database has no custom providers', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'custom-llm-stale-runtime-'));
  const credentialsPath = join(dir, 'providers.json');
  const record = provider('https://relay.example/v1');
  const runtimePath = join(dir, 'custom-llm-runtime.json');
  const catalogPath = join(dir, 'custom-llm-providers.json');
  const secretsPath = join(dir, 'custom-llm-secrets.json');
  const secrets = `${JSON.stringify({ version: 1, secrets: { [PROVIDER_ID]: 'secret-key' } })}\n`;
  await writeFile(
    runtimePath,
    `${JSON.stringify({ version: 1, providers: [{ ...record, apiKey: 'secret-key' }] })}\n`,
    { mode: 0o600 }
  );
  await writeFile(catalogPath, `${JSON.stringify({ version: 1, providers: [record] })}\n`, { mode: 0o600 });
  await writeFile(secretsPath, secrets, { mode: 0o600 });
  const selection = {
    modelProvider: PROVIDER_ID,
    model: 'gpt-x',
    harness: 'codex',
    thinkingEffort: 'medium',
  };
  const getCustomLlm = async () => {
    const runtime = readCustomLlmRuntimeSync(credentialsPath).providers.find((item) => item.id === PROVIDER_ID);
    if (!runtime) return null;
    const { apiKey, ...safe } = runtime;
    return { ...safe, apiKeyConfigured: Boolean(apiKey) };
  };

  assert.equal(selectableCustomLlms(credentialsPath).length, 1);
  await assertModelSelectionAvailable(selection, { getCustomLlm });
  await ensureCustomLlmRuntime({ customLlmProvider: { findMany: async () => [] } }, credentialsPath);

  assert.deepEqual(readCustomLlmRuntimeSync(credentialsPath).providers, []);
  assert.deepEqual(readCustomLlmCatalogSync(credentialsPath).providers, []);
  assert.equal(await readFile(secretsPath, 'utf8'), secrets);
  assert.equal(selectableCustomLlms(credentialsPath).length, 0);
  await assert.rejects(assertModelSelectionAvailable(selection, { getCustomLlm }), (error) =>
    error.errors.some((item) => item.field === 'model_provider')
  );
});

test('startup clears a stale runtime snapshot when the credential file cannot be parsed', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'custom-llm-stale-corrupt-'));
  const credentialsPath = join(dir, 'providers.json');
  const record = provider('https://relay.example/v1');
  const secretsPath = join(dir, 'custom-llm-secrets.json');
  await writeFile(
    join(dir, 'custom-llm-runtime.json'),
    `${JSON.stringify({ version: 1, providers: [{ ...record, apiKey: 'secret-key' }] })}\n`,
    { mode: 0o600 }
  );
  await writeFile(join(dir, 'custom-llm-providers.json'), `${JSON.stringify({ version: 1, providers: [record] })}\n`, {
    mode: 0o600,
  });
  await writeFile(secretsPath, '{', { mode: 0o600 });

  await ensureCustomLlmRuntime({ customLlmProvider: { findMany: async () => [] } }, credentialsPath);

  assert.deepEqual(readCustomLlmRuntimeSync(credentialsPath).providers, []);
  assert.deepEqual(readCustomLlmCatalogSync(credentialsPath).providers, []);
  assert.equal(await readFile(secretsPath, 'utf8'), '{');
  assert.equal(selectableCustomLlms(credentialsPath).length, 0);
});

test('startup leaves the previous runtime snapshot in place when the credential file is unreadable', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'custom-llm-startup-corrupt-'));
  const credentialsPath = join(dir, 'providers.json');
  const runtimePath = join(dir, 'custom-llm-runtime.json');
  const catalogPath = join(dir, 'custom-llm-providers.json');
  const runtime = `${JSON.stringify({ version: 1, providers: [{ ...provider('https://old.example/v1'), apiKey: 'old-key' }] })}\n`;
  const catalog = `${JSON.stringify({ version: 1, providers: [provider('https://old.example/v1')] })}\n`;
  await writeFile(runtimePath, runtime, { mode: 0o600 });
  await writeFile(catalogPath, catalog, { mode: 0o600 });
  await writeFile(join(dir, 'custom-llm-secrets.json'), '{', { mode: 0o600 });

  await assert.rejects(
    ensureCustomLlmRuntime(
      { customLlmProvider: { findMany: async () => [provider('https://new.example/v1')] } },
      credentialsPath
    ),
    { name: 'CustomLlmCredentialError' }
  );
  assert.equal(await readFile(runtimePath, 'utf8'), runtime);
  assert.equal(await readFile(catalogPath, 'utf8'), catalog);
});

test('saving a key does not replace a credential file that cannot be parsed', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'custom-llm-corrupt-'));
  const credentialsPath = join(dir, 'providers.json');
  const secretsPath = join(dir, 'custom-llm-secrets.json');
  const original = '{"version":1,"secrets":{"custom:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa":"old-key"';
  await writeFile(secretsPath, original, { mode: 0o600 });

  await assert.rejects(writeCustomLlmSecret(PROVIDER_ID, 'new-key', credentialsPath), {
    name: 'CustomLlmCredentialError',
  });
  assert.equal(await readFile(secretsPath, 'utf8'), original);
});

test('saving a key does not replace an oversized credential file', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'custom-llm-large-'));
  const credentialsPath = join(dir, 'providers.json');
  const secretsPath = join(dir, 'custom-llm-secrets.json');
  const original = `{"version":1,"secrets":{"note":"${'x'.repeat(1024 * 1024)}"}}`;
  await writeFile(secretsPath, original, { mode: 0o600 });

  await assert.rejects(writeCustomLlmSecret(PROVIDER_ID, 'new-key', credentialsPath), {
    name: 'CustomLlmCredentialError',
  });
  assert.equal(await readFile(secretsPath, 'utf8'), original);
});

test('saving a key does not replace a credential file that cannot be read', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'custom-llm-unreadable-'));
  const credentialsPath = join(dir, 'providers.json');
  const secretsPath = join(dir, 'custom-llm-secrets.json');
  const original = '{"version":1,"secrets":{"custom:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa":"old-key"}}\n';
  await writeFile(secretsPath, original, { mode: 0o600 });
  await chmod(secretsPath, 0o000);
  try {
    await assert.rejects(writeCustomLlmSecret(PROVIDER_ID, 'new-key', credentialsPath), {
      name: 'CustomLlmCredentialError',
    });
    await chmod(secretsPath, 0o600);
    assert.equal(await readFile(secretsPath, 'utf8'), original);
  } finally {
    await chmod(secretsPath, 0o600);
  }
});
