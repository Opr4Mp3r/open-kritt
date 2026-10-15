import { createReadStream } from 'node:fs';
import { resolve } from 'node:path';

import { HeadlessApiClient, HeadlessApiError, resolveHeadlessApiBase } from './kritt-headless-lib.mjs';

const BODY_LIMIT = 8 * 1024 * 1024;
const METHODS = new Set(['GET', 'POST', 'PATCH', 'PUT', 'DELETE']);
const REDACTED = '[REDACTED]';

function secretField(key, value) {
  const normalized = key.replace(/[-_\s]/g, '').toLowerCase();
  if (
    (value === null || (typeof value === 'number' && Number.isFinite(value))) &&
    /^(?:tokencount\w*|(?:cachedinput|input|output|reasoningoutput|total|prompt|completion|cached|reasoning)tokens|tokens(?:used|total|remaining|count))$/.test(
      normalized
    )
  ) {
    return false;
  }
  // Traverse usage containers so any nested credential still gets redacted.
  if (
    typeof value === 'object' &&
    /^(?:rawtokenusage|tokenusage|totaltokenusage|lasttokenusage|inputtokensdetails|outputtokensdetails)$/.test(
      normalized
    )
  ) {
    return false;
  }
  if (
    typeof value === 'boolean' &&
    (/^(has|is)/.test(normalized) || /(configured|present|available|enabled|exists|set)$/.test(normalized))
  ) {
    return false;
  }
  return /(^auth$|^key$|apikey|accesskey|password|passwd|passphrase|secret|token|authorization|cookie|credential|privatekey)/.test(
    normalized
  );
}

function collectSecrets(value, secrets, sensitive = false) {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectSecrets(entry, secrets, sensitive));
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, entry]) =>
      collectSecrets(entry, secrets, sensitive || secretField(key, entry))
    );
  } else if (sensitive && (typeof value === 'string' || typeof value === 'number') && `${value}`) {
    secrets.add(`${value}`);
    secrets.add(encodeURIComponent(`${value}`));
    secrets.add(new URLSearchParams({ value: `${value}` }).toString().slice('value='.length));
    secrets.add(JSON.stringify(`${value}`).slice(1, -1));
    const authValue = typeof value === 'string' ? value.match(/^(?:Bearer|Basic)\s+(.+)$/i)?.[1] : null;
    if (authValue) secrets.add(authValue);
  }
}

function redact(value, secrets) {
  if (typeof value === 'string') {
    for (const secret of [...secrets].sort((left, right) => right.length - left.length)) {
      value = value.split(secret).join(REDACTED);
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((entry) => redact(entry, secrets));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, secretField(key, entry) ? REDACTED : redact(entry, secrets)])
    );
  }
  return value;
}

function parseArgs(argv) {
  const positional = [];
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (['--body', '--api-url', '--timeout-ms'].includes(argument)) {
      if (Object.hasOwn(options, argument) || !argv[index + 1] || argv[index + 1].startsWith('--')) {
        throw new Error('请求选项缺少值或重复。');
      }
      options[argument] = argv[++index];
    } else if (argument === '--dry-run') {
      if (options.dryRun) throw new Error('请求选项重复。');
      options.dryRun = true;
    } else if (argument.startsWith('--')) {
      throw new Error('不支持此请求选项。');
    } else {
      positional.push(argument);
    }
  }
  const [method, path] = positional;
  if (positional.length !== 2 || !METHODS.has(method)) {
    throw new Error('用法：api <GET|POST|PATCH|PUT|DELETE> /资源路径 [--body 文件|-] [--dry-run]。');
  }
  const timeoutText = options['--timeout-ms'] ?? '15000';
  const timeoutMs = Number(timeoutText);
  if (!/^\d+$/.test(timeoutText) || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 2147483647) {
    throw new Error('timeout-ms 必须是 1 至 2147483647 之间的整数。');
  }
  if (method === 'GET' && options['--body']) throw new Error('GET 请求不接受请求体。');
  return {
    method,
    path,
    timeoutMs,
    bodyFile: options['--body'],
    apiUrl: options['--api-url'],
    dryRun: !!options.dryRun,
  };
}

function decodedPath(path) {
  let decoded = path;
  try {
    for (let count = 0; count < 8 && decoded.includes('%'); count += 1) decoded = decodeURIComponent(decoded);
  } catch {
    throw new Error('资源路径编码无效。');
  }
  if (
    decoded.includes('%') ||
    !decoded.startsWith('/') ||
    /[\s\u0000-\u001f\u007f\\?#]/.test(decoded) ||
    decoded.includes('//') ||
    decoded.split('/').some((segment) => segment === '.' || segment === '..')
  ) {
    throw new Error('资源路径必须位于 API 内，不能包含 URL、路径穿越或片段。');
  }
  return decoded;
}

function resourcePath(raw, secrets) {
  if (typeof raw !== 'string' || /[\u0000-\u0020\u007f#\\]/.test(raw)) {
    throw new Error('资源路径无效。');
  }
  const queryIndex = raw.indexOf('?');
  const pathname = queryIndex === -1 ? raw : raw.slice(0, queryIndex);
  const query = queryIndex === -1 ? '' : raw.slice(queryIndex);
  let hasSecretQuery = false;
  for (const part of query.replace(/^\?/, '').split('&')) {
    for (const [key, value] of new URLSearchParams(part)) {
      if (secretField(key, value)) {
        hasSecretQuery = true;
        collectSecrets(value, secrets, true);
        if (part.includes('=')) collectSecrets(part.slice(part.indexOf('=') + 1), secrets, true);
      }
    }
  }
  const normalized = decodedPath(pathname).replace(/^\/api(?=\/|$)/, '') || '/';
  return { path: normalized + query, pathname: normalized, hasSecretQuery };
}

async function apiBase(options, rootDir, env) {
  const configured = options.apiUrl || env.OPEN_KRITT_API_URL;
  if (configured) {
    try {
      const parsed = new URL(configured);
      if (parsed.username || parsed.password || !['http:', 'https:'].includes(parsed.protocol)) throw new Error();
      const rawPath = configured.match(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]*(\/[^?#]*)?/i)?.[1] || '/';
      decodedPath(rawPath);
    } catch {
      throw new Error('API 地址无效；仅允许不含用户名、密码或路径穿越的 HTTP(S) 地址。');
    }
  }
  try {
    const base = await resolveHeadlessApiBase({ rootDir, env, apiUrl: options.apiUrl });
    const parsed = new URL(base);
    if (parsed.username || parsed.password) throw new Error();
    decodedPath(parsed.pathname);
    return base;
  } catch {
    throw new Error('无法解析 API 地址或读取项目端口配置。');
  }
}

async function readBody(file, io, rootDir) {
  if (file === undefined) return undefined;
  const stream = file === '-' ? io.input : createReadStream(resolve(rootDir, file));
  const chunks = [];
  let bytes = 0;
  try {
    for await (const chunk of stream) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytes += buffer.length;
      if (bytes > BODY_LIMIT) throw new Error('请求体超过 8 MiB 上限。');
      chunks.push(buffer);
    }
  } catch {
    throw new Error(bytes > BODY_LIMIT ? '请求体超过 8 MiB 上限。' : '无法读取请求体文件或标准输入。');
  }
  let body;
  try {
    body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
  } catch {
    throw new Error('请求体必须是有效的 UTF-8 JSON 对象。');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('请求体必须是 JSON 对象。');
  return body;
}

function writeAllowed(method, pathname, body) {
  if (method === 'GET') return true;
  if (method === 'POST' && pathname === '/scans') {
    return body?.launchPolicy === 'draft' && (!Object.hasOwn(body, 'launch_policy') || body.launch_policy === 'draft');
  }
  return (
    method === 'PATCH' &&
    /^\/scans\/\d+$/.test(pathname) &&
    body &&
    Object.keys(body).length === 1 &&
    ['paused', 'stopped', 'completed'].includes(body.status)
  );
}

export async function runApiCli(argv, options = {}) {
  const io = options.io || { input: process.stdin, output: process.stdout, error: process.stderr };
  const rootDir = options.rootDir || process.cwd();
  const secrets = new Set();
  let method;
  let dispatched = false;
  try {
    const args = parseArgs(argv);
    method = args.method;
    const body = await readBody(args.bodyFile, io, rootDir);
    collectSecrets(body, secrets);
    const resource = resourcePath(args.path, secrets);
    const baseUrl = await apiBase(args, rootDir, options.env || process.env);
    const url = `${baseUrl}${resource.path}`;
    if (args.dryRun) {
      io.output.write(`${JSON.stringify(redact({ method, url, body: body ?? null }, secrets))}\n`);
      return 0;
    }
    if (resource.hasSecretQuery) throw new Error('秘密值不能放在 URL 查询参数中；请改用请求体文件或标准输入。');
    if (!writeAllowed(method, resource.pathname, body)) {
      throw new Error(
        '此 API 模式仅允许查询、创建 launchPolicy=draft 的暂停草稿，以及暂停、停止或标记完成。其他写入仅可 --dry-run。'
      );
    }
    if (/\/export\/?$/.test(resource.pathname)) throw new Error('二进制导出请使用既有的 scan export 命令。');
    const client = new HeadlessApiClient({
      baseUrl,
      fetchImpl: async (requestUrl, requestOptions) => {
        const signal = AbortSignal.timeout(args.timeoutMs);
        dispatched = true;
        const response = await (options.fetchImpl || fetch)(requestUrl, {
          ...requestOptions,
          signal,
          redirect: 'error',
        });
        if (
          response.ok &&
          response.status !== 204 &&
          !/\bapplication\/(?:[\w.+-]+\+)?json\b/i.test(response.headers.get('content-type') || '')
        ) {
          throw new Error('接口未返回 JSON；二进制导出请使用 scan export。');
        }
        return response;
      },
    });
    const result = await client.request(resource.path, { method, body });
    collectSecrets(result, secrets);
    io.output.write(`${JSON.stringify(redact(result, secrets))}\n`);
    return 0;
  } catch (error) {
    const result = {
      error: error.message || 'API 请求失败。',
      ...(error instanceof HeadlessApiError ? { status: error.status, code: error.code, errors: error.errors } : {}),
      ...(dispatched && method !== 'GET' && (!(error instanceof HeadlessApiError) || error.status >= 500)
        ? { unknownOutcome: true }
        : {}),
    };
    collectSecrets(error.data, secrets);
    collectSecrets(result, secrets);
    io.error.write(`${JSON.stringify(redact(result, secrets))}\n`);
    return 1;
  }
}
