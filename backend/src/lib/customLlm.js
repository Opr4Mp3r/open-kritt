import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { access, chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { HARNESS_THINKING_EFFORTS } from './constants.js';
import { PROVIDER_CREDENTIALS_PATH } from './providerCredentials.js';
import { ValidationError } from './validation.js';

export const CUSTOM_LLM_ID_RE = /^custom:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Direct mode: the harness keeps the protocol it actually speaks.
// Pinned Codex 0.145.0 rejects wire_api="chat" before any network call, and this
// process does not translate Chat Completions into Responses. Codex custom LLMs
// therefore require an OpenAI Responses endpoint. Claude Code speaks Anthropic
// Messages. Grok Build has no generic third-party base URL here.
export const CUSTOM_LLM_HARNESSES = {
  codex: {
    label: 'Codex',
    wireApis: ['responses'],
    defaultWireApi: 'responses',
  },
  'claude-code': {
    label: 'Claude Code',
    wireApis: ['anthropic'],
    defaultWireApi: 'anthropic',
  },
};

const MAX_NAME_LENGTH = 80;
const MAX_URL_LENGTH = 300;
const MAX_MODELS = 20;
const MAX_MODEL_ID_LENGTH = 200;
const MAX_SECRET_LENGTH = 16 * 1024;
const MAX_FILE_BYTES = 1024 * 1024;

let writeQueue = Promise.resolve();
const mutationStorage = new AsyncLocalStorage();
const mutationTails = new Map();

export function isCustomModelProvider(value) {
  return CUSTOM_LLM_ID_RE.test(`${value || ''}`.trim().toLowerCase());
}

export function customLlmPaths(credentialsPath = PROVIDER_CREDENTIALS_PATH) {
  const dir = dirname(credentialsPath);
  return {
    catalog: join(dir, 'custom-llm-providers.json'),
    secrets: join(dir, 'custom-llm-secrets.json'),
    // One file the engine reads. A rename publishes the endpoint and key together.
    runtime: join(dir, 'custom-llm-runtime.json'),
  };
}

// Serializes a whole save, delete, or rollback for one credential directory.
// Re-entering from a nested secret write or catalog publish is the same critical section.
export function withCustomLlmMutation(credentialsPath, operation) {
  const key = customLlmPaths(credentialsPath).runtime;
  if (mutationStorage.getStore() === key) return operation();
  const previous = mutationTails.get(key) || Promise.resolve();
  const run = previous.catch(() => {}).then(() => mutationStorage.run(key, operation));
  const settled = run.then(
    () => {},
    () => {}
  );
  mutationTails.set(key, settled);
  settled.then(() => {
    if (mutationTails.get(key) === settled) mutationTails.delete(key);
  });
  return run;
}

function queuedWrite(operation) {
  const pending = writeQueue.then(operation);
  writeQueue = pending.catch(() => {});
  return pending;
}

function emptySecrets() {
  return { version: 1, secrets: {} };
}

export function customLlmCredentialError(message) {
  const error = new Error(message);
  error.name = 'CustomLlmCredentialError';
  error.statusCode = 409;
  return error;
}

function normalizeSecrets(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 1) return emptySecrets();
  const secrets = {};
  if (value.secrets && typeof value.secrets === 'object' && !Array.isArray(value.secrets)) {
    for (const [id, secret] of Object.entries(value.secrets)) {
      if (isCustomModelProvider(id) && typeof secret === 'string' && secret.trim()) {
        secrets[id.toLowerCase()] = secret;
      }
    }
  }
  return { version: 1, secrets };
}

export function readCustomLlmSecretsSync(credentialsPath = PROVIDER_CREDENTIALS_PATH) {
  try {
    const path = customLlmPaths(credentialsPath).secrets;
    const text = readFileSync(path, 'utf8');
    if (Buffer.byteLength(text) > MAX_FILE_BYTES) return emptySecrets();
    return normalizeSecrets(JSON.parse(text));
  } catch {
    return emptySecrets();
  }
}

function emptyCatalog() {
  return { version: 1, providers: [] };
}

function normalizeCatalogProvider(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const id = `${value.id || ''}`.trim().toLowerCase();
  if (!isCustomModelProvider(id)) return null;
  const harness = `${value.harness || ''}`.trim();
  const spec = CUSTOM_LLM_HARNESSES[harness];
  const wireApi = `${value.wireApi || value.wire_api || ''}`.trim();
  const baseUrl = `${value.baseUrl || value.base_url || ''}`.trim();
  const name = `${value.name || ''}`.trim();
  const models = Array.isArray(value.models)
    ? value.models
        .map((model) => {
          if (typeof model === 'string') return { id: model.trim(), label: model.trim() };
          if (!model || typeof model !== 'object') return null;
          const modelId = `${model.id || ''}`.trim();
          if (!modelId) return null;
          return { id: modelId, label: `${model.label || ''}`.trim() || modelId };
        })
        .filter(Boolean)
    : [];
  const defaultModel = `${value.defaultModel || value.default_model || ''}`.trim();
  if (!spec || !spec.wireApis.includes(wireApi) || !name || !baseUrl || !models.length) return null;
  if (!models.some((model) => model.id === defaultModel)) return null;
  return {
    id,
    name,
    harness,
    baseUrl,
    wireApi,
    models,
    defaultModel,
    enabled: value.enabled !== false,
  };
}

function readJsonProviders(path, mapProvider) {
  try {
    const text = readFileSync(path, 'utf8');
    if (Buffer.byteLength(text) > MAX_FILE_BYTES) return emptyCatalog();
    const parsed = JSON.parse(text);
    const providers = Array.isArray(parsed?.providers) ? parsed.providers.map(mapProvider).filter(Boolean) : [];
    return { version: 1, providers };
  } catch {
    return emptyCatalog();
  }
}

export function readCustomLlmCatalogSync(credentialsPath = PROVIDER_CREDENTIALS_PATH) {
  return readJsonProviders(customLlmPaths(credentialsPath).catalog, normalizeCatalogProvider);
}

export function readCustomLlmRuntimeSync(credentialsPath = PROVIDER_CREDENTIALS_PATH) {
  return readJsonProviders(customLlmPaths(credentialsPath).runtime, (entry) => {
    const provider = normalizeCatalogProvider(entry);
    if (!provider) return null;
    const apiKey = typeof entry?.apiKey === 'string' ? entry.apiKey : '';
    return apiKey ? { ...provider, apiKey } : provider;
  });
}

async function writeJson(path, payload) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const tempPath = join(dirname(path), `.${path.split('/').pop()}.${process.pid}.${randomUUID()}.tmp`);
  await writeFile(tempPath, `${JSON.stringify(payload, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  await rename(tempPath, path);
  await chmod(path, 0o600);
}

export function serializeCustomLlm(record, secrets = {}) {
  const id = `${record.id}`.toLowerCase();
  return {
    id,
    name: record.name,
    harness: record.harness,
    baseUrl: record.baseUrl,
    wireApi: record.wireApi,
    models: record.models,
    defaultModel: record.defaultModel,
    enabled: record.enabled !== false,
    apiKeyConfigured: Boolean(secrets[id]),
  };
}

export function selectableCustomLlms(credentialsPath = PROVIDER_CREDENTIALS_PATH) {
  return readCustomLlmRuntimeSync(credentialsPath)
    .providers.filter((provider) => provider.enabled && provider.apiKey)
    .map((provider) => serializeCustomLlm(provider, { [provider.id]: provider.apiKey }));
}

export function customModelCatalogEntries(credentialsPath = PROVIDER_CREDENTIALS_PATH) {
  return selectableCustomLlms(credentialsPath).map((provider) => {
    const thinkingEfforts = HARNESS_THINKING_EFFORTS[provider.harness] || [];
    return {
      provider: provider.id,
      label: provider.name,
      harness: provider.harness,
      input: 'select',
      status: 'ready',
      defaultModel: provider.defaultModel,
      models: provider.models.map((model) => ({
        id: model.id,
        label: model.label || model.id,
        thinkingEfforts,
        isDefault: model.id === provider.defaultModel,
      })),
    };
  });
}

export async function publishCustomLlmCatalog(
  loadRecords,
  credentialsPath = PROVIDER_CREDENTIALS_PATH,
  { onCredentialError = 'throw' } = {}
) {
  if (typeof loadRecords !== 'function') {
    throw new TypeError('publishCustomLlmCatalog reads the current providers inside the write queue.');
  }
  if (onCredentialError !== 'throw' && onCredentialError !== 'keep-runtime') {
    throw new TypeError('publishCustomLlmCatalog credential failure mode is invalid.');
  }
  return withCustomLlmMutation(credentialsPath, () =>
    queuedWrite(async () => {
      const records = await loadRecords();
      const providers = (Array.isArray(records) ? records : [])
        .map((record) => normalizeCatalogProvider(record))
        .filter(Boolean);
      const paths = customLlmPaths(credentialsPath);
      // An empty database list has no key to attach. Write that empty pair even
      // when the credential file is unreadable, so a removed provider cannot
      // stay selected from an older snapshot. Leave the credential file itself
      // untouched.
      if (providers.length === 0) {
        await writeJson(paths.runtime, { version: 1, providers: [] });
        await writeJson(paths.catalog, { version: 1, providers: [] });
        return records;
      }
      // The runtime file is the only pair the engine reads. A save that cannot
      // build that pair must fail before either file is replaced. A listing may
      // keep the previous pair instead of failing the response.
      let secrets;
      try {
        secrets = await readSecretsForUpdate(credentialsPath);
      } catch (error) {
        if (error?.name !== 'CustomLlmCredentialError' || onCredentialError === 'throw') throw error;
        return records;
      }
      const runtimeProviders = providers.map((provider) => {
        const apiKey = secrets.secrets[provider.id];
        return apiKey ? { ...provider, apiKey } : provider;
      });
      await writeJson(paths.runtime, { version: 1, providers: runtimeProviders });
      await writeJson(paths.catalog, { version: 1, providers });
      return records;
    })
  );
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

// Historical state is any file a restore might publish. A runtime snapshot counts
// even when it is the only file: the database, not that file, decides which
// providers remain selectable.
async function customLlmHasHistoricalState(credentialsPath) {
  const paths = customLlmPaths(credentialsPath);
  const present = await Promise.all([pathExists(paths.runtime), pathExists(paths.catalog), pathExists(paths.secrets)]);
  return present.some(Boolean);
}

// Publish the snapshot the engine and model selector read. Skip the write only
// when nothing is configured and this directory has no older files, so a local
// process does not need permission to create the default credential directory.
export async function ensureCustomLlmRuntime(prisma, credentialsPath = PROVIDER_CREDENTIALS_PATH) {
  if (typeof prisma?.customLlmProvider?.findMany !== 'function') {
    throw new TypeError('ensureCustomLlmRuntime needs the custom LLM provider store.');
  }
  const records = await prisma.customLlmProvider.findMany({ orderBy: { insertedAt: 'asc' } });
  const configured = Array.isArray(records) && records.length > 0;
  if (!configured && !(await customLlmHasHistoricalState(credentialsPath))) return [];
  await publishCustomLlmCatalog(() => records, credentialsPath);
  return records;
}

function parseSecretsForUpdate(text) {
  if (Buffer.byteLength(text) > MAX_FILE_BYTES) {
    throw customLlmCredentialError(
      'The custom LLM credential file is too large to update. The existing file was left unchanged.'
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw customLlmCredentialError(
      'The custom LLM credential file is invalid JSON. The existing file was left unchanged.'
    );
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || parsed.version !== 1) {
    throw customLlmCredentialError(
      'The custom LLM credential file has an unrecognized format. The existing file was left unchanged.'
    );
  }
  if (parsed.secrets != null && (typeof parsed.secrets !== 'object' || Array.isArray(parsed.secrets))) {
    throw customLlmCredentialError(
      'The custom LLM credential file has an unrecognized format. The existing file was left unchanged.'
    );
  }
  return normalizeSecrets(parsed);
}

async function readSecretsForUpdate(credentialsPath) {
  const path = customLlmPaths(credentialsPath).secrets;
  try {
    return parseSecretsForUpdate(await readFile(path, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return emptySecrets();
    if (error?.name === 'CustomLlmCredentialError') throw error;
    throw customLlmCredentialError(
      'The custom LLM credential file could not be read. The existing file was left unchanged.'
    );
  }
}

export async function writeCustomLlmSecret(id, secret, credentialsPath = PROVIDER_CREDENTIALS_PATH) {
  const providerId = `${id}`.trim().toLowerCase();
  if (!isCustomModelProvider(providerId)) {
    throw new ValidationError([{ field: 'apiKey', message: 'Custom LLM id is invalid.' }]);
  }
  if (typeof secret !== 'string' || !secret.trim() || secret.length > MAX_SECRET_LENGTH) {
    throw new ValidationError([{ field: 'apiKey', message: `API key must be 1 to ${MAX_SECRET_LENGTH} characters.` }]);
  }
  return withCustomLlmMutation(credentialsPath, () =>
    queuedWrite(async () => {
      const store = await readSecretsForUpdate(credentialsPath);
      const previous = store.secrets[providerId] || null;
      store.secrets[providerId] = secret;
      await writeJson(customLlmPaths(credentialsPath).secrets, store);
      return previous;
    })
  );
}

export async function deleteCustomLlmSecret(id, credentialsPath = PROVIDER_CREDENTIALS_PATH) {
  const providerId = `${id}`.trim().toLowerCase();
  return withCustomLlmMutation(credentialsPath, () =>
    queuedWrite(async () => {
      const store = await readSecretsForUpdate(credentialsPath);
      const previous = store.secrets[providerId] || null;
      delete store.secrets[providerId];
      await writeJson(customLlmPaths(credentialsPath).secrets, store);
      return previous;
    })
  );
}

function pushError(errors, field, message) {
  errors.push({ field, message });
}

function containsControlCharacter(value) {
  for (let index = 0; index < value.length; index += 1) {
    if (value.charCodeAt(index) < 32) return true;
  }
  return false;
}

function normalizeBaseUrl(value, errors) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) {
    pushError(errors, 'baseUrl', 'Base URL is required.');
    return '';
  }
  if (raw.length > MAX_URL_LENGTH || /[\s"\\]/.test(raw)) {
    pushError(errors, 'baseUrl', 'Base URL must be an http(s) URL without spaces or quotes.');
    return '';
  }
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      pushError(errors, 'baseUrl', 'Base URL must start with http:// or https://.');
      return '';
    }
    if (url.username || url.password) {
      pushError(errors, 'baseUrl', 'Put the API key in the key field, not in the URL.');
      return '';
    }
    return url.toString().replace(/\/$/, '');
  } catch {
    pushError(errors, 'baseUrl', 'Base URL is not a valid URL.');
    return '';
  }
}

export function validateCustomLlmInput(body, { requireApiKey = false } = {}) {
  const errors = [];
  const source = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const name = typeof source.name === 'string' ? source.name.trim() : '';
  if (!name || name.length > MAX_NAME_LENGTH || containsControlCharacter(name) || /["\\]/.test(name)) {
    pushError(errors, 'name', `Name must be 1 to ${MAX_NAME_LENGTH} characters without quotes or control characters.`);
  }
  const harness = typeof source.harness === 'string' ? source.harness.trim() : '';
  const spec = CUSTOM_LLM_HARNESSES[harness];
  if (!spec) {
    pushError(errors, 'harness', 'Harness must be codex or claude-code.');
  }
  const requestedWireApi = typeof source.wireApi === 'string' ? source.wireApi.trim() : '';
  const wireApi = requestedWireApi || spec?.defaultWireApi || '';
  if (spec && !spec.wireApis.includes(wireApi)) {
    pushError(
      errors,
      'wireApi',
      harness === 'codex' && wireApi === 'chat'
        ? 'Codex 0.145.0 rejects wire_api="chat". Use an OpenAI Responses endpoint.'
        : `Protocol for ${harness} must be one of: ${spec.wireApis.join(', ')}.`
    );
  }
  const baseUrl = normalizeBaseUrl(source.baseUrl, errors);
  const rawModels = Array.isArray(source.models)
    ? source.models
    : typeof source.models === 'string'
      ? source.models.split(/\r?\n/)
      : [];
  const models = [];
  const seen = new Set();
  for (const item of rawModels) {
    const modelId = `${typeof item === 'string' ? item : item?.id || ''}`.trim();
    if (!modelId) continue;
    if (modelId.length > MAX_MODEL_ID_LENGTH || /\s/.test(modelId)) {
      pushError(errors, 'models', `Model id "${modelId.slice(0, 40)}" is invalid.`);
      continue;
    }
    if (seen.has(modelId)) continue;
    seen.add(modelId);
    const label = `${typeof item === 'object' && item ? item.label || '' : ''}`.trim() || modelId;
    models.push({ id: modelId, label: label.slice(0, MAX_MODEL_ID_LENGTH) });
  }
  if (!models.length) pushError(errors, 'models', 'Add at least one model id.');
  if (models.length > MAX_MODELS) pushError(errors, 'models', `Use at most ${MAX_MODELS} models.`);
  const requestedDefault = typeof source.defaultModel === 'string' ? source.defaultModel.trim() : '';
  const defaultModel = models.some((model) => model.id === requestedDefault) ? requestedDefault : models[0]?.id || '';
  if (models.length && !defaultModel) pushError(errors, 'defaultModel', 'Choose a default model from the list.');
  const enabled = source.enabled === undefined ? true : source.enabled === true;
  if (source.enabled !== undefined && source.enabled !== true && source.enabled !== false) {
    pushError(errors, 'enabled', 'Enabled must be true or false.');
  }
  const apiKey = source.apiKey === undefined || source.apiKey === null ? undefined : source.apiKey;
  if (apiKey !== undefined && typeof apiKey !== 'string') {
    pushError(errors, 'apiKey', 'API key must be a string.');
  } else if (typeof apiKey === 'string' && apiKey.length > MAX_SECRET_LENGTH) {
    pushError(errors, 'apiKey', `API key must be ${MAX_SECRET_LENGTH} characters or fewer.`);
  } else if (requireApiKey && (typeof apiKey !== 'string' || !apiKey.trim())) {
    pushError(errors, 'apiKey', 'API key is required.');
  }
  if (errors.length) throw new ValidationError(errors);
  return {
    name,
    harness,
    baseUrl,
    wireApi,
    models,
    defaultModel,
    enabled,
    apiKey: typeof apiKey === 'string' && apiKey.trim() ? apiKey : undefined,
  };
}

export function newCustomLlmId() {
  return `custom:${randomUUID()}`;
}
