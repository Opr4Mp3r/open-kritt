import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationDir = path.resolve(here, '../../database/init');

test('database init migrations do not drop columns or tables', () => {
  for (const filename of fs.readdirSync(migrationDir).filter((name) => name.endsWith('.sql'))) {
    const sql = fs.readFileSync(path.join(migrationDir, filename), 'utf8');
    assert.doesNotMatch(sql, /\bDROP\s+(?:COLUMN|TABLE)\b/i, `${filename} must remain forward-only`);
  }
});

test('replayed generation checks still accept custom provider rows', () => {
  for (const filename of [
    '032_generations_xai_grok_build.sql',
    '033_generations_deepseek_codex.sql',
    '034_custom_llm_providers.sql',
  ]) {
    const sql = fs.readFileSync(path.join(migrationDir, filename), 'utf8');
    const checks = [...sql.matchAll(/ADD CONSTRAINT generations_(?:model_provider_check|check)\b[\s\S]*?\);/g)].map(
      (match) => match[0]
    );
    assert.ok(checks.length >= 2, `${filename} must rebuild both generation checks`);
    for (const check of checks) {
      assert.match(
        check,
        /model_provider ~ '\^custom:\[0-9a-f\]\{8\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{12\}\$'/,
        `${filename} rebuild would reject an existing custom generation`
      );
    }
  }
});

test('DeepSeek generation storage permits only the Codex harness', () => {
  const sql = fs.readFileSync(path.join(migrationDir, '033_generations_deepseek_codex.sql'), 'utf8');

  assert.match(sql, /model_provider IN \([^)]*'deepseek'[^)]*\)/);
  assert.match(sql, /model_provider = 'deepseek' AND harness = 'codex'/);
  assert.doesNotMatch(sql, /model_provider = 'deepseek' AND harness = '(?:claude-code|grok-build)'/);
});
