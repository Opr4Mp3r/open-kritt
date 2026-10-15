import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DEFAULT_WORKFLOW_NAMES, DEFAULT_WORKFLOWS } from '../src/lib/defaultWorkflows.js';
import { validateWorkflow } from '../src/lib/validation.js';

test('ships valid default workflows', () => {
  assert.deepEqual(DEFAULT_WORKFLOW_NAMES, ['external-flow-analysis', 'Cosmos ABCI Panic Halt Review']);
  assert.equal(DEFAULT_WORKFLOWS.length, 2);

  for (const workflow of DEFAULT_WORKFLOWS) {
    const validated = validateWorkflow({
      name: workflow.name,
      description: workflow.description,
      levels: workflow.levels.map((level) => ({
        depth: level.depth,
        multiOutput: level.multiOutput,
        consumesAll: level.consumeAll,
        outputFormat: level.outputFormat,
        steps: level.steps,
      })),
    });

    assert.equal(validated.description, workflow.description);
  }
});

test('ships the external-flow-analysis workflow', () => {
  const workflow = DEFAULT_WORKFLOWS.find(({ name }) => name === 'external-flow-analysis');
  assert.deepEqual(
    workflow.levels.map((level) => level.depth),
    [0, 1, 2]
  );
  assert.deepEqual(
    workflow.levels.map((level) => level.steps.map((step) => step.name)),
    [['梳理外部入口'], ['跟踪可达执行路径'], ['调查路径中的漏洞']]
  );
  assert.ok(workflow.levels.every((level) => level.multiOutput && !level.consumeAll));
  assert.equal(workflow.levels.at(-1).outputFormat.trigger_flow, 'array');
  const prompts = workflow.levels.flatMap((level) => level.steps.map((step) => step.content)).join('\n');
  assert.equal(prompts.includes('path:line symbol - behavior'), false);
  assert.equal(prompts.includes('例如 explicit_panic'), false);
  assert.equal(prompts.includes('给人读的说明用简体中文写完整句子'), true);
  assert.equal(prompts.includes('{{repo_full}}'), true);
});

test('ships the Cosmos ABCI panic review workflow', () => {
  const workflow = DEFAULT_WORKFLOWS.find(({ name }) => name === 'Cosmos ABCI Panic Halt Review');

  assert.deepEqual(
    workflow.levels.map((level) => level.depth),
    [0, 1]
  );
  assert.deepEqual(
    workflow.levels.map((level) => level.steps.map((step) => step.name)),
    [['枚举 ABCI 方法'], ['调查显式 panic 调用', '调查算术 panic', '调查 nil 指针 panic', '调查越界与类型 panic']]
  );
  assert.ok(workflow.levels.every((level) => level.multiOutput && !level.consumeAll));
  assert.equal(workflow.levels[0].outputFormat.abci_method_name, 'string');
  assert.equal(workflow.levels[1].outputTable, 'workflows.vulnerabilities');
  assert.equal(workflow.levels[1].outputFormat.trigger_flow, 'array');
  const prompts = workflow.levels.flatMap((level) => level.steps.map((step) => step.content)).join('\n');
  assert.equal(prompts.includes('例如 explicit_panic'), false);
  assert.equal(prompts.includes('例如「显式 panic」'), true);
  assert.equal(prompts.includes('BeginBlock'), true);
});
