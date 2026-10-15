import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import test from 'node:test';

import { runHeadlessCli } from './kritt-headless-lib.mjs';

const CUSTOM_PROVIDER = 'custom:11111111-1111-4111-8111-111111111111';

async function fixture(t, input = '') {
  const rootDir = await mkdtemp(join(tmpdir(), 'kritt-api-test-'));
  t.after(() => rm(rootDir, { recursive: true, force: true }));
  let unexpectedRequests = 0;
  t.after(() => assert.equal(unexpectedRequests, 0, 'Rejected requests and previews must not call fetch.'));
  const output = {
    text: '',
    write(value) {
      this.text += value;
    },
  };
  const error = {
    text: '',
    write(value) {
      this.text += value;
    },
  };
  const options = {
    rootDir,
    env: {},
    io: { input: Readable.from([input]), output, error },
    fetchImpl: async () => {
      unexpectedRequests += 1;
      assert.fail('This request must not use the network.');
    },
  };
  return { options, output, error, run: (args) => runHeadlessCli(['api', ...args], options) };
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

test('API mode returns JSON without a TTY and reuses the project port and client options', async (t) => {
  const { options, output, error, run } = await fixture(t);
  await writeFile(join(options.rootDir, '.env'), 'BACKEND_PORT=4312\n');
  const requests = [];
  options.fetchImpl = async (url, init) => {
    requests.push({ url, init });
    return jsonResponse([{ id: '9007199254740993', status: 'paused' }]);
  };
  assert.equal(await run(['GET', '/api/scans?status=paused']), 0);
  assert.deepEqual(JSON.parse(output.text), [{ id: '9007199254740993', status: 'paused' }]);
  assert.equal(error.text, '');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'http://127.0.0.1:4312/api/scans?status=paused');
  assert.equal(requests[0].init.method, 'GET');
  assert.equal(requests[0].init.redirect, 'error');
  assert.equal(requests[0].init.headers.Accept, 'application/json');
  assert.ok(requests[0].init.signal instanceof AbortSignal);
});

test('API mode supports the existing global URL position and preserves a base path', async (t) => {
  const { options, output } = await fixture(t);
  options.fetchImpl = async (url) => {
    assert.equal(url, 'http://127.0.0.1:4312/base/api/health');
    return jsonResponse({ status: 'ok' });
  };
  assert.equal(
    await runHeadlessCli(['--api-url', 'http://127.0.0.1:4312/base/api', 'api', 'GET', '/api/health'], options),
    0
  );
  assert.deepEqual(JSON.parse(output.text), { status: 'ok' });
});

test('POST only sends a paused draft once and preserves custom provider IDs from stdin', async (t) => {
  const body = { launchPolicy: 'draft', model_provider: CUSTOM_PROVIDER, workflow_id: '12' };
  const { options, output, run } = await fixture(t, JSON.stringify(body));
  let calls = 0;
  options.fetchImpl = async (url, init) => {
    calls += 1;
    assert.equal(url, 'http://127.0.0.1:3002/api/scans');
    assert.equal(init.method, 'POST');
    assert.equal(init.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(init.body), body);
    return jsonResponse({ id: '12', status: 'paused', modelProvider: CUSTOM_PROVIDER }, 201);
  };
  assert.equal(await run(['POST', '/scans', '--body', '-']), 0);
  assert.equal(calls, 1);
  assert.equal(JSON.parse(output.text).modelProvider, CUSTOM_PROVIDER);
});

test('safe scan status updates read a JSON file and handle an empty response', async (t) => {
  for (const status of ['paused', 'stopped', 'completed']) {
    await t.test(status, async (t) => {
      const { options, output, error, run } = await fixture(t);
      await writeFile(join(options.rootDir, 'body.json'), JSON.stringify({ status }));
      options.fetchImpl = async (url, init) => {
        assert.equal(url, 'http://127.0.0.1:3002/api/scans/12');
        assert.equal(init.method, 'PATCH');
        assert.deepEqual(JSON.parse(init.body), { status });
        return new Response(null, { status: 204 });
      };
      assert.equal(await run(['PATCH', '/scans/12', '--body', 'body.json']), 0);
      assert.equal(output.text, 'null\n');
      assert.equal(error.text, '');
    });
  }
});

test('live writes that could start work or alter other resources are rejected before a request', async (t) => {
  for (const [method, path, body] of [
    ['POST', '/scans', { launchPolicy: 'immediate' }],
    ['POST', '/scans', { launchPolicy: 'queue' }],
    ['POST', '/scans', { launchPolicy: 'draft', launch_policy: 'immediate' }],
    ['POST', '/scans', {}],
    ['PATCH', '/scans/12', { status: 'pending' }],
    ['PATCH', '/scans/12', { status: 'paused', configuration: {} }],
    ['POST', '/generations', {}],
    ['PUT', '/settings', {}],
    ['DELETE', '/scans/12', {}],
  ]) {
    await t.test(`${method} ${path} ${JSON.stringify(body)}`, async (t) => {
      const { output, error, run } = await fixture(t, JSON.stringify(body));
      assert.equal(await run([method, path, '--body', '-']), 1);
      assert.equal(output.text, '');
      assert.match(JSON.parse(error.text).error, /仅允许查询/);
      assert.equal(JSON.parse(error.text).unknownOutcome, undefined);
    });
  }
});

test('dry-run is offline for any method and redacts nested secrets and query encodings', async (t) => {
  const body = {
    apiKey: 'review-key-only',
    apiKeyConfigured: true,
    authorization: 'Bearer review-token-only',
    password: 'review password',
    auth: 'review-auth-only',
    accessKey: 'review-access-key-only',
    nested: [{ access_token: 'review-access-only', hasApiKey: false }],
    echoed: 'review-key-only / review-token-only / review password',
    model_provider: CUSTOM_PROVIDER,
  };
  for (const method of ['POST', 'PATCH', 'PUT', 'DELETE']) {
    await t.test(method, async (t) => {
      const { output, error, run } = await fixture(t, JSON.stringify(body));
      assert.equal(await run([method, '/custom-llms?token=%72eview+query', '--body', '-', '--dry-run']), 0);
      const preview = JSON.parse(output.text);
      assert.equal(preview.method, method);
      assert.equal(preview.body.apiKey, '[REDACTED]');
      assert.equal(preview.body.apiKeyConfigured, true);
      assert.equal(preview.body.nested[0].hasApiKey, false);
      assert.equal(preview.body.model_provider, CUSTOM_PROVIDER);
      assert.equal(error.text, '');
      for (const value of [
        'review-key-only',
        'review-token-only',
        'review password',
        'review-access-only',
        'review-auth-only',
        'review-access-key-only',
        '%72eview+query',
      ]) {
        assert.ok(!output.text.includes(value));
      }
    });
  }
});

test('response and HTTP error JSON redact secrets without losing status and validation fields', async (t) => {
  for (const status of [200, 422]) {
    await t.test(`${status}`, async (t) => {
      const body = { launchPolicy: 'draft', apiKey: 'request-key-only' };
      const { options, output, error, run } = await fixture(t, JSON.stringify(body));
      options.fetchImpl = async () =>
        jsonResponse(
          {
            error: 'request-key-only and response-key-only',
            code: 'VALIDATION_FAILED',
            apiKey: 'response-key-only',
            apiKeyConfigured: true,
            password: 'response-password-only',
            errors: [{ field: 'apiKey', message: 'request-key-only was rejected' }],
          },
          status
        );
      assert.equal(await run(['POST', '/scans', '--body', '-']), status === 200 ? 0 : 1);
      const text = status === 200 ? output.text : error.text;
      const parsed = JSON.parse(text);
      for (const secret of ['request-key-only', 'response-key-only', 'response-password-only'])
        assert.ok(!text.includes(secret));
      assert.equal(parsed.errors[0].field, 'apiKey');
      if (status === 200) assert.equal(parsed.apiKeyConfigured, true);
      else {
        assert.equal(parsed.status, 422);
        assert.equal(parsed.code, 'VALIDATION_FAILED');
        assert.equal(parsed.unknownOutcome, undefined);
        assert.equal(output.text, '');
      }
    });
  }
});

test('live URLs reject secret query fields before fetching while dry-run remains redacted', async (t) => {
  for (const key of ['apiKey', 'token', 'password', 'authorization', 'cookie', 'a%70i_key', 'access_token']) {
    await t.test(key, async (t) => {
      const { output, error, run } = await fixture(t);
      assert.equal(await run(['GET', `/health?${key}=query-secret-only`]), 1);
      assert.equal(output.text, '');
      assert.match(JSON.parse(error.text).error, /不能放在 URL 查询参数/);
      assert.ok(!error.text.includes('query-secret-only'));
    });
  }
});

test('usage counters and raw usage remain visible while nested or similarly named credentials stay redacted', async (t) => {
  const { options, output, run } = await fixture(t);
  options.fetchImpl = async () =>
    jsonResponse({
      tokenCountInput: 120,
      token_count_total: 150,
      tokenCountCachedInput: null,
      tokenCountOutput: 'not-a-counter-secret',
      rawTokenUsage: {
        input_tokens: 120,
        output_tokens: 30,
        total_tokens: 150,
        input_tokens_details: { cached_tokens: 10 },
        accessToken: 'nested-secret-only',
        explanation: '120 tokens; nested-secret-only',
      },
      accessToken: 'top-secret-only',
      refresh_token: 'refresh-secret-only',
      apiKeyConfigured: true,
    });
  assert.equal(await run(['GET', '/scans/1']), 0);
  const result = JSON.parse(output.text);
  assert.equal(result.tokenCountInput, 120);
  assert.equal(result.token_count_total, 150);
  assert.equal(result.tokenCountCachedInput, null);
  assert.equal(result.tokenCountOutput, '[REDACTED]');
  assert.deepEqual(result.rawTokenUsage, {
    input_tokens: 120,
    output_tokens: 30,
    total_tokens: 150,
    input_tokens_details: { cached_tokens: 10 },
    accessToken: '[REDACTED]',
    explanation: '120 tokens; [REDACTED]',
  });
  assert.equal(result.accessToken, '[REDACTED]');
  assert.equal(result.refresh_token, '[REDACTED]');
  assert.equal(result.apiKeyConfigured, true);
});

test('HTTP 5xx marks write outcomes unknown without marking GET or explicit 4xx rejections', async (t) => {
  for (const [method, path, body, status] of [
    ['GET', '/health', undefined, 500],
    ['POST', '/scans', { launchPolicy: 'draft' }, 500],
    ['PATCH', '/scans/1', { status: 'completed' }, 502],
    ['POST', '/scans', { launchPolicy: 'draft' }, 422],
  ]) {
    await t.test(`${method} ${status}`, async (t) => {
      const { options, output, error, run } = await fixture(t, body ? JSON.stringify(body) : '');
      let calls = 0;
      options.fetchImpl = async () => {
        calls += 1;
        return jsonResponse({ error: 'Service error' }, status);
      };
      assert.equal(await run([method, path, ...(body ? ['--body', '-'] : [])]), 1);
      assert.equal(calls, 1);
      assert.equal(output.text, '');
      const result = JSON.parse(error.text);
      assert.equal(result.status, status);
      assert.equal(result.unknownOutcome, method !== 'GET' && status >= 500 ? true : undefined);
    });
  }
});

test('paths cannot escape the API through schemes, traversal, slashes or encoded segments', async (t) => {
  for (const path of [
    'https://example.com/scans',
    '//example.com/scans',
    '/../health',
    '/api/../health',
    '/%2e%2e/health',
    '/%252e%252e/health',
    '/api%2f..%2fhealth',
    '/%5c..%5chealth',
    '/scans#fragment',
    '/scans/./1',
    '/scans/%zz',
  ]) {
    await t.test(path, async (t) => {
      const { output, error, run } = await fixture(t);
      assert.equal(await run(['GET', path, '--dry-run']), 1);
      assert.equal(output.text, '');
      assert.equal(typeof JSON.parse(error.text).error, 'string');
    });
  }
});

test('invalid or credential-bearing base URLs never appear in errors', async (t) => {
  for (const apiUrl of [
    'http://user:private-value-only@example.com',
    'not-a-url-private-value-only',
    'file:///private-value-only',
    'http://localhost/base/../api',
    'http://localhost/%252e%252e/api',
  ]) {
    await t.test(apiUrl, async (t) => {
      const { output, error, run } = await fixture(t);
      assert.equal(await run(['GET', '/health', '--api-url', apiUrl]), 1);
      assert.equal(output.text, '');
      assert.ok(!error.text.includes('private-value-only'));
      assert.equal(typeof JSON.parse(error.text).error, 'string');
    });
  }
});

test('body errors are bounded and never echo malformed JSON or secret file paths', async (t) => {
  for (const input of [
    '{"apiKey":"do-not-echo-only",',
    'null',
    '[]',
    '"do-not-echo-only"',
    '{"padding":"' + 'x'.repeat(8 * 1024 * 1024) + '"}',
  ]) {
    await t.test(`${input.length} bytes`, async (t) => {
      const { output, error, run } = await fixture(t, input);
      assert.equal(await run(['POST', '/scans', '--body', '-', '--dry-run']), 1);
      assert.equal(output.text, '');
      assert.ok(!error.text.includes('do-not-echo-only'));
      assert.ok(error.text.length < 300);
    });
  }
  const { error, run } = await fixture(t);
  assert.equal(await run(['POST', '/scans', '--body', 'missing-private-path', '--dry-run']), 1);
  assert.ok(!error.text.includes('missing-private-path'));
});

test('argument failures stay structured and binary exports are not fetched', async (t) => {
  for (const args of [
    ['GET', '/scans', '--unknown'],
    ['GET', '/scans', '--timeout-ms', '0'],
    ['GET', '/scans', '--timeout-ms', 'Infinity'],
    ['GET', '/scans', '--body', '-'],
    ['POST', '/scans', '{"apiKey":"argv-secret-only"}'],
    ['GET', '/scans', '--api-url'],
    ['GET', '/scans/1/export'],
  ]) {
    await t.test(args.join(' '), async (t) => {
      const { output, error, run } = await fixture(t);
      assert.equal(await run(args), 1);
      assert.equal(output.text, '');
      assert.ok(!error.text.includes('argv-secret-only'));
      assert.equal(typeof JSON.parse(error.text).error, 'string');
    });
  }
});

test('network failures are never retried and mark the outcome of allowed writes as unknown', async (t) => {
  for (const method of ['GET', 'POST']) {
    await t.test(method, async (t) => {
      const { options, output, error, run } = await fixture(t, '{"launchPolicy":"draft","apiKey":"request-key-only"}');
      let calls = 0;
      options.fetchImpl = async () => {
        calls += 1;
        throw new Error('Connection lost: request-key-only');
      };
      const args = method === 'GET' ? ['GET', '/health'] : ['POST', '/scans', '--body', '-'];
      assert.equal(await run(args), 1);
      assert.equal(calls, 1);
      assert.equal(output.text, '');
      assert.equal(JSON.parse(error.text).unknownOutcome, method === 'POST' ? true : undefined);
      if (method === 'POST') assert.ok(!error.text.includes('request-key-only'));
    });
  }
});

test('the configured HTTP timeout aborts an allowed write and reports an unknown outcome', async (t) => {
  const { options, error, run } = await fixture(t, '{"status":"paused"}');
  let calls = 0;
  options.fetchImpl = async (_url, { signal }) => {
    calls += 1;
    return new Promise((_resolve, reject) => {
      const fallback = setTimeout(() => reject(new Error('Timeout signal was not connected')), 1000);
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(fallback);
          reject(signal.reason);
        },
        { once: true }
      );
    });
  };
  assert.equal(await run(['PATCH', '/scans/1', '--body', '-', '--timeout-ms', '5']), 1);
  assert.equal(calls, 1);
  assert.equal(JSON.parse(error.text).unknownOutcome, true);
  assert.doesNotMatch(error.text, /Timeout signal was not connected/);
});
