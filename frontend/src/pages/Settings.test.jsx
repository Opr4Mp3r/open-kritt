import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { RuntimeSettingsFields } from './Settings.jsx';

describe('runtime settings fields', () => {
  it('shows Fast mode eligibility, cost and the disabled default', () => {
    const html = renderToStaticMarkup(
      <RuntimeSettingsFields
        data={{
          settings: {
            codexFastMode: {
              value: false,
              defaultValue: false,
              source: 'default',
              valid: true,
              envKey: 'ENGINE_CODEX_FAST_MODE',
              type: 'boolean',
              apply: 'live',
            },
          },
        }}
        draft={{ codexFastMode: false }}
        issues={{}}
        saving={false}
        onChange={() => {}}
      />
    );

    expect(html).toContain('id="setting-codexFastMode"');
    expect(html).toContain('用量成本可能更高');
    expect(html).toContain('未声明支持快速模式的模型仍使用常规服务等级。');
    expect(html).toContain('默认停用');
    expect(html).not.toContain('checked=""');
  });

  it('renders available fields and warns when the backend omits newer settings', () => {
    const html = renderToStaticMarkup(
      <RuntimeSettingsFields
        data={{
          settings: {
            workerCount: {
              value: 2,
              source: 'default',
              valid: true,
              envKey: 'ENGINE_WORKER_COUNT',
              type: 'integer',
              min: 0,
              max: 128,
              recommendedMax: 10,
              apply: 'live',
            },
          },
        }}
        draft={{ workerCount: '2' }}
        issues={{}}
        saving={false}
        onChange={() => {}}
      />
    );

    expect(html).toContain('正在运行的后端无法提供部分设置');
    expect(html).toContain('重启后端以加载当前设置结构。');
    expect(html).toContain('id="setting-workerCount"');
    expect(html).not.toContain('id="setting-ignoreLowStorage"');
  });

  it('explains the total attempt count when cyber-block retries are enabled', () => {
    const html = renderToStaticMarkup(
      <RuntimeSettingsFields
        data={{
          settings: {
            cyberSafetyRetryCount: {
              value: 3,
              source: 'runtime_config',
              valid: true,
              envKey: 'ENGINE_CYBER_SAFETY_RETRY_COUNT',
              type: 'integer',
              min: 0,
              max: 10,
              recommendedMax: 3,
              apply: 'live',
            },
          },
        }}
        draft={{ cyberSafetyRetryCount: '3' }}
        issues={{}}
        saving={false}
        onChange={() => {}}
      />
    );

    expect(html).toContain('id="setting-cyberSafetyRetryCount"');
    expect(html).toContain('up to 4 total attempts');
    expect(html).toContain('ENGINE_CYBER_SAFETY_RETRY_COUNT');
  });
});
