import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import express from 'express';

import {
  readCustomLlmCatalogSync,
  readCustomLlmRuntimeSync,
  readCustomLlmSecretsSync,
  selectableCustomLlms,
} from '../src/lib/customLlm.js';
import { assertModelSelectionAvailable } from '../src/lib/modelSelection.js';
import { createCustomLlmsRouter } from '../src/routes/customLlms.js';

function cloneRow(row) {
  if (!row) return null;
  return {
    ...row,
    models: Array.isArray(row.models) ? [...row.models] : row.models,
  };
}

function parkOnce() {
  let markEntered;
  let release;
  const ready = new Promise((resolve) => {
    markEntered = resolve;
  });
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  return {
    ready,
    release,
    markEntered,
    gate,
  };
}

function memoryPrisma() {
  const rows = new Map();
  let failNextRead = false;
  let failNextUpdate = false;
  let parkedUpdate = null;
  let parkedDelete = null;
  const prisma = {
    customLlmProvider: {
      findMany: async () => {
        if (failNextRead) {
          failNextRead = false;
          throw new Error('catalog publish failed');
        }
        return [...rows.values()].map(cloneRow);
      },
      findUnique: async ({ where: { id } }) => cloneRow(rows.get(id)),
      create: async ({ data }) => {
        const row = { ...data, models: [...data.models], insertedAt: new Date(), updatedAt: new Date() };
        rows.set(data.id, row);
        return cloneRow(row);
      },
      update: async ({ where: { id }, data }) => {
        if (parkedUpdate) {
          const parked = parkedUpdate;
          parkedUpdate = null;
          parked.markEntered();
          await parked.gate;
          if (parked.fail) throw new Error('database update failed');
        }
        if (failNextUpdate) {
          failNextUpdate = false;
          throw new Error('database update failed');
        }
        const row = rows.get(id);
        if (!row) throw Object.assign(new Error('not found'), { code: 'P2025' });
        const next = {
          ...row,
          ...data,
          models: Array.isArray(data.models) ? [...data.models] : row.models,
          updatedAt: new Date(),
        };
        rows.set(id, next);
        return cloneRow(next);
      },
      delete: async ({ where: { id } }) => {
        if (parkedDelete) {
          const parked = parkedDelete;
          parkedDelete = null;
          parked.markEntered();
          await parked.gate;
          if (parked.fail) throw new Error('database delete failed');
        }
        const row = rows.get(id);
        if (!row) throw Object.assign(new Error('not found'), { code: 'P2025' });
        rows.delete(id);
        return cloneRow(row);
      },
    },
    scan: { findMany: async () => [] },
    generation: { count: async () => 0 },
    stepMetadata: { count: async () => 0 },
    postProcessMetadata: { count: async () => 0 },
    supplementalPostScriptRun: { count: async () => 0 },
  };
  return {
    prisma,
    rows,
    failNextCatalogRead() {
      failNextRead = true;
    },
    failNextUpdate() {
      failNextUpdate = true;
    },
    parkNextUpdate(fail = false) {
      const parked = parkOnce();
      parked.fail = fail;
      parkedUpdate = parked;
      return parked;
    },
    parkNextDelete(fail = false) {
      const parked = parkOnce();
      parked.fail = fail;
      parkedDelete = parked;
      return parked;
    },
  };
}

function providerBody(overrides = {}) {
  return {
    name: 'Relay',
    harness: 'codex',
    baseUrl: 'https://old.example/v1',
    wireApi: 'responses',
    models: ['gpt-x'],
    defaultModel: 'gpt-x',
    apiKey: 'old-key',
    ...overrides,
  };
}

async function start(prisma, credentialsPath) {
  const app = express();
  app.use(express.json());
  app.use('/api/custom-llms', createCustomLlmsRouter({ prisma, credentialsPath }));
  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => {
    if (error?.name === 'CustomLlmCredentialError') {
      return res.status(error.statusCode || 409).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error.' });
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  return {
    server,
    url: `http://127.0.0.1:${port}/api/custom-llms`,
  };
}

async function request(url, method, body) {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function withApi(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'custom-llm-api-'));
  const credentialsPath = join(dir, 'providers.json');
  const store = memoryPrisma();
  const started = await start(store.prisma, credentialsPath);
  try {
    await fn({ ...started, ...store, credentialsPath, dir });
  } finally {
    await new Promise((resolve, reject) => started.server.close((error) => (error ? reject(error) : resolve())));
  }
}

test('a failed PATCH restores the endpoint, key, and catalog together', async () => {
  await withApi(async ({ url, rows, credentialsPath, dir }) => {
    const created = await request(url, 'POST', providerBody());
    assert.equal(created.status, 201);
    const id = created.body.id;
    const secretsPath = join(dir, 'custom-llm-secrets.json');
    const broken = '{"version":1,"secrets":{"truncated":';
    await writeFile(secretsPath, broken);

    const patched = await request(`${url}/${id}`, 'PATCH', {
      baseUrl: 'https://new.example/v1',
      apiKey: 'new-key',
    });

    assert.equal(patched.status, 409);
    assert.equal(rows.get(id).baseUrl, 'https://old.example/v1');
    assert.equal(await readFile(secretsPath, 'utf8'), broken);
    assert.equal(readCustomLlmCatalogSync(credentialsPath).providers[0].baseUrl, 'https://old.example/v1');

    await writeFile(secretsPath, `${JSON.stringify({ version: 1, secrets: { [id]: 'old-key' } }, null, 2)}\n`);
    const listed = await request(url, 'GET');
    assert.equal(listed.status, 200);
    assert.equal(listed.body.providers[0].baseUrl, 'https://old.example/v1');
    assert.equal(listed.body.providers[0].apiKeyConfigured, true);
    assert.equal(readCustomLlmCatalogSync(credentialsPath).providers[0].baseUrl, 'https://old.example/v1');
    assert.equal(readCustomLlmSecretsSync(credentialsPath).secrets[id], 'old-key');
  });
});

test('a failed DELETE keeps the provider row, key, and catalog', async () => {
  await withApi(async ({ url, rows, credentialsPath, dir }) => {
    const created = await request(url, 'POST', providerBody());
    const id = created.body.id;
    const secretsPath = join(dir, 'custom-llm-secrets.json');
    const broken = '{"version":1,"secrets":';
    await writeFile(secretsPath, broken);

    const removed = await request(`${url}/${id}`, 'DELETE');

    assert.equal(removed.status, 409);
    assert.equal(rows.has(id), true);
    assert.equal(await readFile(secretsPath, 'utf8'), broken);
    assert.equal(readCustomLlmCatalogSync(credentialsPath).providers[0].id, id);

    await writeFile(secretsPath, `${JSON.stringify({ version: 1, secrets: { [id]: 'old-key' } }, null, 2)}\n`);
    const listed = await request(url, 'GET');
    assert.deepEqual(
      listed.body.providers.map((provider) => provider.id),
      [id]
    );
    assert.equal(readCustomLlmSecretsSync(credentialsPath).secrets[id], 'old-key');
    assert.equal(readCustomLlmCatalogSync(credentialsPath).providers[0].baseUrl, 'https://old.example/v1');
  });
});

test('a catalog failure after PATCH rolls the database and key back', async () => {
  await withApi(async ({ url, rows, credentialsPath, failNextCatalogRead }) => {
    const created = await request(url, 'POST', providerBody());
    const id = created.body.id;
    failNextCatalogRead();

    const patched = await request(`${url}/${id}`, 'PATCH', {
      baseUrl: 'https://new.example/v1',
      apiKey: 'new-key',
    });

    assert.equal(patched.status, 500);
    assert.equal(rows.get(id).baseUrl, 'https://old.example/v1');
    assert.equal(readCustomLlmSecretsSync(credentialsPath).secrets[id], 'old-key');
    assert.equal(readCustomLlmCatalogSync(credentialsPath).providers[0].baseUrl, 'https://old.example/v1');
  });
});

test('a catalog failure after DELETE restores the provider row and key', async () => {
  await withApi(async ({ url, rows, credentialsPath, failNextCatalogRead }) => {
    const created = await request(url, 'POST', providerBody());
    const id = created.body.id;
    failNextCatalogRead();

    const removed = await request(`${url}/${id}`, 'DELETE');

    assert.equal(removed.status, 500);
    assert.equal(rows.has(id), true);
    assert.equal(rows.get(id).baseUrl, 'https://old.example/v1');
    assert.equal(readCustomLlmSecretsSync(credentialsPath).secrets[id], 'old-key');
    assert.equal(readCustomLlmCatalogSync(credentialsPath).providers[0].id, id);
    assert.equal(readCustomLlmCatalogSync(credentialsPath).providers[0].baseUrl, 'https://old.example/v1');
  });
});

test('a database failure after the key is replaced restores the old key', async () => {
  await withApi(async ({ url, rows, credentialsPath, failNextUpdate }) => {
    const created = await request(url, 'POST', providerBody());
    const id = created.body.id;
    failNextUpdate();

    const patched = await request(`${url}/${id}`, 'PATCH', {
      baseUrl: 'https://new.example/v1',
      apiKey: 'new-key',
    });

    assert.equal(patched.status, 500);
    assert.equal(rows.get(id).baseUrl, 'https://old.example/v1');
    assert.equal(readCustomLlmSecretsSync(credentialsPath).secrets[id], 'old-key');
    assert.equal(readCustomLlmCatalogSync(credentialsPath).providers[0].baseUrl, 'https://old.example/v1');
  });
});

function runtimeProvider(credentialsPath, id) {
  return readCustomLlmRuntimeSync(credentialsPath).providers.find((provider) => provider.id === id) || null;
}

test('a failed update cannot roll back over a newer saved key', async () => {
  await withApi(async ({ url, rows, credentialsPath, parkNextUpdate }) => {
    const created = await request(url, 'POST', providerBody());
    const id = created.body.id;
    const parked = parkNextUpdate(true);
    const failing = request(`${url}/${id}`, 'PATCH', {
      baseUrl: 'https://a.example/v1',
      apiKey: 'key-a',
    });
    await parked.ready;

    assert.equal(readCustomLlmSecretsSync(credentialsPath).secrets[id], 'key-a');
    assert.equal(runtimeProvider(credentialsPath, id).baseUrl, 'https://old.example/v1');
    assert.equal(runtimeProvider(credentialsPath, id).apiKey, 'old-key');

    const saved = request(`${url}/${id}`, 'PATCH', {
      baseUrl: 'https://b.example/v1',
      apiKey: 'key-b',
    });
    parked.release();
    const [failed, succeeded] = await Promise.all([failing, saved]);

    assert.equal(failed.status, 500);
    assert.equal(succeeded.status, 200);
    assert.equal(rows.get(id).baseUrl, 'https://b.example/v1');
    assert.equal(readCustomLlmSecretsSync(credentialsPath).secrets[id], 'key-b');
    assert.equal(readCustomLlmCatalogSync(credentialsPath).providers[0].baseUrl, 'https://b.example/v1');
    assert.equal(runtimeProvider(credentialsPath, id).baseUrl, 'https://b.example/v1');
    assert.equal(runtimeProvider(credentialsPath, id).apiKey, 'key-b');
  });
});

test('two successful updates publish one endpoint with its own key', async () => {
  await withApi(async ({ url, credentialsPath, parkNextUpdate }) => {
    const created = await request(url, 'POST', providerBody());
    const id = created.body.id;
    const parked = parkNextUpdate(false);
    const first = request(`${url}/${id}`, 'PATCH', {
      baseUrl: 'https://a.example/v1',
      apiKey: 'key-a',
    });
    await parked.ready;
    const second = request(`${url}/${id}`, 'PATCH', {
      baseUrl: 'https://b.example/v1',
      apiKey: 'key-b',
    });
    parked.release();
    const [firstResult, secondResult] = await Promise.all([first, second]);

    assert.equal(firstResult.status, 200);
    assert.equal(secondResult.status, 200);
    const runtime = runtimeProvider(credentialsPath, id);
    const secret = readCustomLlmSecretsSync(credentialsPath).secrets[id];
    assert.equal(readCustomLlmCatalogSync(credentialsPath).providers[0].baseUrl, runtime.baseUrl);
    assert.equal(secret, runtime.apiKey);
    assert.equal(
      (runtime.baseUrl === 'https://a.example/v1' && secret === 'key-a') ||
        (runtime.baseUrl === 'https://b.example/v1' && secret === 'key-b'),
      true
    );
  });
});

test('a failed DELETE does not restore an older key over a newer update', async () => {
  await withApi(async ({ url, rows, credentialsPath, parkNextDelete }) => {
    const created = await request(url, 'POST', providerBody());
    const id = created.body.id;
    const parked = parkNextDelete(true);
    const failing = request(`${url}/${id}`, 'DELETE');
    await parked.ready;

    assert.equal(readCustomLlmSecretsSync(credentialsPath).secrets[id], undefined);
    assert.equal(runtimeProvider(credentialsPath, id).apiKey, 'old-key');
    assert.equal(runtimeProvider(credentialsPath, id).baseUrl, 'https://old.example/v1');

    const saved = request(`${url}/${id}`, 'PATCH', {
      baseUrl: 'https://b.example/v1',
      apiKey: 'key-b',
    });
    parked.release();
    const [removed, patched] = await Promise.all([failing, saved]);

    assert.equal(removed.status, 500);
    assert.equal(patched.status, 200);
    assert.equal(rows.get(id).baseUrl, 'https://b.example/v1');
    assert.equal(readCustomLlmSecretsSync(credentialsPath).secrets[id], 'key-b');
    assert.equal(runtimeProvider(credentialsPath, id).baseUrl, 'https://b.example/v1');
    assert.equal(runtimeProvider(credentialsPath, id).apiKey, 'key-b');
  });
});

test('a metadata update publishes the same endpoint and key with the new enabled flag', async () => {
  await withApi(async ({ url, rows, credentialsPath }) => {
    const created = await request(url, 'POST', providerBody());
    const id = created.body.id;

    const patched = await request(`${url}/${id}`, 'PATCH', { enabled: false });

    assert.equal(patched.status, 200);
    assert.equal(patched.body.enabled, false);
    assert.equal(rows.get(id).enabled, false);
    assert.equal(runtimeProvider(credentialsPath, id).enabled, false);
    assert.equal(runtimeProvider(credentialsPath, id).baseUrl, 'https://old.example/v1');
    assert.equal(runtimeProvider(credentialsPath, id).apiKey, 'old-key');
    assert.equal(
      selectableCustomLlms(credentialsPath).some((provider) => provider.id === id),
      false
    );
  });
});

test('a metadata update fails when the credential file is unreadable and leaves the runtime snapshot unchanged', async () => {
  await withApi(async ({ url, rows, credentialsPath, dir }) => {
    const created = await request(url, 'POST', providerBody());
    const id = created.body.id;
    const runtimePath = join(dir, 'custom-llm-runtime.json');
    const before = await readFile(runtimePath, 'utf8');
    await writeFile(join(dir, 'custom-llm-secrets.json'), '{', { mode: 0o600 });

    const patched = await request(`${url}/${id}`, 'PATCH', { enabled: false });

    assert.equal(patched.status, 409);
    assert.equal(rows.get(id).enabled, true);
    assert.equal(rows.get(id).baseUrl, 'https://old.example/v1');
    assert.equal(runtimeProvider(credentialsPath, id).enabled, true);
    assert.equal(runtimeProvider(credentialsPath, id).baseUrl, 'https://old.example/v1');
    assert.equal(runtimeProvider(credentialsPath, id).apiKey, 'old-key');
    assert.equal(readCustomLlmCatalogSync(credentialsPath).providers[0].enabled, true);
    assert.equal(await readFile(runtimePath, 'utf8'), before);
    assert.equal(
      selectableCustomLlms(credentialsPath).some((provider) => provider.id === id),
      true
    );
    await assertModelSelectionAvailable(
      { modelProvider: id, model: 'gpt-x', harness: 'codex', thinkingEffort: 'medium' },
      {
        getCustomLlm: async () => {
          const runtime = runtimeProvider(credentialsPath, id);
          const { apiKey, ...safe } = runtime;
          return { ...safe, apiKeyConfigured: Boolean(apiKey) };
        },
      }
    );

    const listed = await request(url, 'GET');
    assert.equal(listed.status, 200);
    assert.equal(listed.body.providers[0].enabled, true);
    assert.equal(await readFile(runtimePath, 'utf8'), before);
  });
});

test('a successful PATCH publishes the new endpoint and key together', async () => {
  await withApi(async ({ url, rows, credentialsPath }) => {
    const created = await request(url, 'POST', providerBody());
    const id = created.body.id;

    const patched = await request(`${url}/${id}`, 'PATCH', {
      baseUrl: 'https://new.example/v1',
      apiKey: 'new-key',
    });

    assert.equal(patched.status, 200);
    assert.equal(patched.body.baseUrl, 'https://new.example/v1');
    assert.equal(patched.body.apiKeyConfigured, true);
    assert.equal(JSON.stringify(patched.body).includes('new-key'), false);
    assert.equal(rows.get(id).baseUrl, 'https://new.example/v1');
    assert.equal(readCustomLlmSecretsSync(credentialsPath).secrets[id], 'new-key');
    assert.equal(readCustomLlmCatalogSync(credentialsPath).providers[0].baseUrl, 'https://new.example/v1');
    assert.equal(runtimeProvider(credentialsPath, id).baseUrl, 'https://new.example/v1');
    assert.equal(runtimeProvider(credentialsPath, id).apiKey, 'new-key');
    assert.equal(JSON.stringify(readCustomLlmCatalogSync(credentialsPath)).includes('new-key'), false);
  });
});
