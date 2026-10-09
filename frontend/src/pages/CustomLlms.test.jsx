import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CustomLlmForm, draftFromProvider, wireApisForHarness } from './CustomLlms.jsx';

const harnesses = [
  { id: 'codex', label: 'Codex', wireApis: ['responses'], defaultWireApi: 'responses' },
  { id: 'claude-code', label: 'Claude Code', wireApis: ['anthropic'], defaultWireApi: 'anthropic' },
];

describe('custom LLM form', () => {
  it('offers the protocols each harness can speak directly', () => {
    expect(wireApisForHarness(harnesses, 'codex')).toEqual(['responses']);
    expect(wireApisForHarness(harnesses, 'claude-code')).toEqual(['anthropic']);
  });

  it('renders a Codex endpoint form without echoing a saved key', () => {
    const draft = draftFromProvider(
      {
        id: 'custom:11111111-1111-4111-8111-111111111111',
        name: 'Relay',
        harness: 'codex',
        baseUrl: 'https://relay.example/v1',
        wireApi: 'responses',
        models: [{ id: 'gpt-x', label: 'gpt-x' }],
        defaultModel: 'gpt-x',
        enabled: true,
        apiKeyConfigured: true,
      },
      'codex'
    );
    const html = renderToStaticMarkup(
      <CustomLlmForm
        draft={draft}
        harnesses={harnesses}
        saving={false}
        error=""
        onChange={() => {}}
        onSubmit={() => {}}
        onCancel={() => {}}
      />
    );

    expect(draft.apiKey).toBe('');
    expect(html).toContain('OpenAI Responses');
    expect(html).not.toContain('OpenAI Chat Completions');
    expect(html).toContain('Chat Completions 不能写入 wire_api');
    expect(html).toContain('https://relay.example/v1');
    expect(html).not.toContain('sk-');
    expect(html).toContain('已保存。留空则不修改');
  });
});
