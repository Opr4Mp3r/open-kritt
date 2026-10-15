import { useSyncExternalStore } from 'react';
import { DEFAULT_VISIBLE_PROVIDERS, PROVIDER_LABELS, providerVisibilityStore } from '../lib/providerVisibility.js';

const initialSnapshot = { visible: DEFAULT_VISIBLE_PROVIDERS, persistenceError: false };

export function useProviderVisibility() {
  const preferences = useSyncExternalStore(
    providerVisibilityStore.subscribe,
    providerVisibilityStore.getSnapshot,
    () => initialSnapshot
  );
  return { ...preferences, setVisible: providerVisibilityStore.setVisible };
}

export default function ProviderVisibility({ configuredProviders = [], selected = '' }) {
  const { visible, setVisible, persistenceError } = useProviderVisibility();
  const hiddenConfigured = configuredProviders.filter((provider) => !visible.includes(provider)).length;
  return (
    <div style={{ margin: '12px 0', fontSize: 12.5, color: 'var(--text-2)' }}>
      <details>
        <summary style={{ cursor: 'pointer', color: 'var(--accent)' }}>
          显示或隐藏提供商{hiddenConfigured > 0 ? ` · ${hiddenConfigured} 个已配置项已隐藏` : ''}
        </summary>
        <p>可见性设置保存在此浏览器中。隐藏提供商不会删除账户或已保存的选择。</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {Object.entries(PROVIDER_LABELS).map(([id, label]) => (
            <label key={id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={visible.includes(id)}
                onChange={(e) => setVisible(id, e.target.checked)}
              />
              {label}
              {configuredProviders.includes(id) ? '（已配置）' : ''}
              {id === 'deepseek' ? ' · Codex 运行框架' : ''}
            </label>
          ))}
        </div>
      </details>
      {selected && !visible.includes(selected) && (
        <p>所选的 {PROVIDER_LABELS[selected] || selected} 提供商虽然已隐藏，但仍可在此处使用。</p>
      )}
      {persistenceError && <p role="alert">本次会话中的可见性已更改，但无法保存到此浏览器。</p>}
    </div>
  );
}
