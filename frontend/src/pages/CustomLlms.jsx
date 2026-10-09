import { useEffect, useMemo, useState } from 'react';

import { api, apiErrorMessages } from '../api/client.js';
import { Button, EmptyState, ErrorState, Spinner } from '../components/ui.jsx';
import { usePageChrome } from '../context/ui.jsx';
import { useFetch } from '../lib/useFetch.js';

export const WIRE_API_LABELS = {
  responses: 'OpenAI Responses',
  chat: 'OpenAI Chat Completions',
  anthropic: 'Anthropic Messages',
};

const FIELD = {
  width: '100%',
  height: 38,
  padding: '0 11px',
  border: '1px solid var(--border)',
  borderRadius: 8,
  background: 'var(--surface)',
  color: 'var(--text)',
  fontSize: 13,
};

export function wireApisForHarness(harnesses, harness) {
  return harnesses.find((item) => item.id === harness)?.wireApis || [];
}

export function draftFromProvider(provider, harness) {
  if (!provider) {
    return {
      id: '',
      name: '',
      harness,
      baseUrl: '',
      wireApi: harness === 'claude-code' ? 'anthropic' : 'responses',
      modelsText: '',
      defaultModel: '',
      enabled: true,
      apiKey: '',
    };
  }
  return {
    id: provider.id,
    name: provider.name,
    harness: provider.harness,
    baseUrl: provider.baseUrl,
    wireApi: provider.wireApi,
    modelsText: provider.models.map((model) => model.id).join('\n'),
    defaultModel: provider.defaultModel,
    enabled: provider.enabled !== false,
    apiKey: '',
  };
}

export function CustomLlmForm({ draft, harnesses, saving, error, onChange, onSubmit, onCancel }) {
  const wireApis = wireApisForHarness(harnesses, draft.harness);
  const modelIds = draft.modelsText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      style={{ display: 'grid', gap: 12 }}
    >
      <label style={{ display: 'grid', gap: 5, fontSize: 12.5 }}>
        名称
        <input
          value={draft.name}
          onChange={(event) => onChange({ ...draft, name: event.target.value })}
          style={FIELD}
          maxLength={80}
          required
        />
      </label>
      <label style={{ display: 'grid', gap: 5, fontSize: 12.5 }}>
        Base URL
        <input
          value={draft.baseUrl}
          onChange={(event) => onChange({ ...draft, baseUrl: event.target.value })}
          style={FIELD}
          placeholder="https://example.com/v1"
          required
        />
      </label>
      <label style={{ display: 'grid', gap: 5, fontSize: 12.5 }}>
        API Key
        <input
          type="password"
          value={draft.apiKey}
          onChange={(event) => onChange({ ...draft, apiKey: event.target.value })}
          style={FIELD}
          autoComplete="off"
          placeholder={draft.id ? '已保存。留空则不修改' : '必填'}
          required={!draft.id}
        />
      </label>
      <label style={{ display: 'grid', gap: 5, fontSize: 12.5 }}>
        协议
        <select
          value={draft.wireApi}
          onChange={(event) => onChange({ ...draft, wireApi: event.target.value })}
          style={FIELD}
        >
          {!wireApis.includes(draft.wireApi) && draft.wireApi && (
            <option value={draft.wireApi}>{WIRE_API_LABELS[draft.wireApi] || draft.wireApi}（不可用）</option>
          )}
          {wireApis.map((wireApi) => (
            <option key={wireApi} value={wireApi}>
              {WIRE_API_LABELS[wireApi] || wireApi}
            </option>
          ))}
        </select>
        {draft.harness === 'codex' && (
          <span style={{ color: 'var(--text-2)', lineHeight: 1.5 }}>
            Codex 0.145.0 只接受 OpenAI Responses。Chat Completions 不能写入 wire_api。
          </span>
        )}
      </label>
      <label style={{ display: 'grid', gap: 5, fontSize: 12.5 }}>
        模型 ID（一行一个）
        <textarea
          value={draft.modelsText}
          onChange={(event) => onChange({ ...draft, modelsText: event.target.value })}
          rows={5}
          style={{ ...FIELD, height: 'auto', padding: '8px 11px', fontFamily: 'inherit' }}
          required
        />
      </label>
      <label style={{ display: 'grid', gap: 5, fontSize: 12.5 }}>
        默认模型
        <select
          value={draft.defaultModel}
          onChange={(event) => onChange({ ...draft, defaultModel: event.target.value })}
          style={FIELD}
        >
          {modelIds.map((modelId) => (
            <option key={modelId} value={modelId}>
              {modelId}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
        <input
          type="checkbox"
          checked={draft.enabled}
          onChange={(event) => onChange({ ...draft, enabled: event.target.checked })}
        />
        启用后可在扫描里选择
      </label>
      {error && <div style={{ color: 'var(--fail)', fontSize: 12.5 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <Button type="submit" disabled={saving}>
          {saving ? '保存中…' : '保存'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          取消
        </Button>
      </div>
    </form>
  );
}

export default function CustomLlms() {
  const { data, loading, error, reload } = useFetch(() => api.customLlms(), []);
  const [harness, setHarness] = useState('codex');
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const harnesses = data?.harnesses || [];
  const providers = useMemo(
    () => (data?.providers || []).filter((provider) => provider.harness === harness),
    [data, harness]
  );

  usePageChrome([{ label: '自定义 LLM', active: true }], null, []);

  useEffect(() => {
    if (!draft) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setDraft(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [draft]);

  const save = async () => {
    setSaving(true);
    setFormError('');
    const models = draft.modelsText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const body = {
      name: draft.name,
      harness: draft.harness,
      baseUrl: draft.baseUrl,
      wireApi: draft.wireApi,
      models,
      defaultModel: draft.defaultModel || models[0] || '',
      enabled: draft.enabled,
      ...(draft.apiKey ? { apiKey: draft.apiKey } : {}),
    };
    try {
      if (draft.id) await api.updateCustomLlm(draft.id, body);
      else await api.createCustomLlm(body);
      setDraft(null);
      reload();
    } catch (saveError) {
      setFormError(apiErrorMessages(saveError).join(' '));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (provider) => {
    if (!window.confirm(`删除「${provider.name}」？已用于扫描的配置不能删除。`)) return;
    try {
      await api.deleteCustomLlm(provider.id);
      if (draft?.id === provider.id) setDraft(null);
      reload();
    } catch (deleteError) {
      setFormError(apiErrorMessages(deleteError).join(' '));
    }
  };

  return (
    <div style={{ maxWidth: 980, display: 'grid', gap: 16 }}>
      <div style={{ color: 'var(--text-2)', fontSize: 13.5, lineHeight: 1.6 }}>
        运行框架负责读仓库、调用工具并交回结构化结果。自定义 LLM 只替换这个框架要调用的模型接口。Codex 直连 OpenAI
        Responses。当前固定的 Codex 0.145.0 会拒绝 Chat
        Completions（wire_api=chat），所以这里不能选它，也不会做协议转换。Claude Code 直连 Anthropic
        Messages。密钥只写入本机凭据文件，接口不会再把它返回来。Grok Build 仍使用账户页里的 xAI 登录或密钥。
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {(harnesses.length
          ? harnesses
          : [
              { id: 'codex', label: 'Codex' },
              { id: 'claude-code', label: 'Claude Code' },
            ]
        ).map((item) => (
          <Button
            key={item.id}
            type="button"
            variant={harness === item.id ? 'primary' : 'ghost'}
            onClick={() => {
              setHarness(item.id);
              setDraft(null);
            }}
          >
            {item.label}
          </Button>
        ))}
      </div>
      {loading && <Spinner />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
            {providers.length === 0 && (
              <EmptyState title="还没有自定义 LLM" sub="添加一个与当前运行框架协议匹配的接口。" />
            )}
            {providers.map((provider) => (
              <button
                key={provider.id}
                type="button"
                onClick={() => {
                  setDraft(draftFromProvider(provider, harness));
                  setFormError('');
                }}
                style={{
                  textAlign: 'left',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  background: draft?.id === provider.id ? 'var(--accent-subtle)' : 'var(--surface)',
                  padding: '12px 14px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 600 }}>{provider.name}</div>
                <div className="mono" style={{ marginTop: 4, color: 'var(--text-3)', fontSize: 12 }}>
                  {WIRE_API_LABELS[provider.wireApi] || provider.wireApi} · {provider.defaultModel}
                  {provider.enabled ? '' : ' · 已停用'}
                  {provider.apiKeyConfigured ? '' : ' · 缺少密钥'}
                </div>
              </button>
            ))}
            <div>
              <Button
                type="button"
                variant="subtle"
                onClick={() => {
                  setDraft(draftFromProvider(null, harness));
                  setFormError('');
                }}
              >
                添加
              </Button>
            </div>
          </div>
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 12,
              background: 'var(--surface)',
              padding: 16,
            }}
          >
            {draft ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <strong>{draft.id ? '编辑' : '新建'}</strong>
                  {draft.id && (
                    <Button type="button" variant="danger" onClick={() => remove(draft)}>
                      删除
                    </Button>
                  )}
                </div>
                <CustomLlmForm
                  draft={draft}
                  harnesses={harnesses}
                  saving={saving}
                  error={formError}
                  onChange={setDraft}
                  onSubmit={save}
                  onCancel={() => setDraft(null)}
                />
              </>
            ) : (
              <div style={{ color: 'var(--text-3)', fontSize: 13 }}>选择左侧的配置，或添加一个新的。</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
