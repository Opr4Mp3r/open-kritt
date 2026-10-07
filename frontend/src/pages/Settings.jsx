import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { api, apiErrorMessages } from '../api/client.js';
import { Button, ErrorState, Spinner } from '../components/ui.jsx';
import { usePageChrome } from '../context/ui.jsx';
import { runtimeSettingsDraft, runtimeSettingsIssues, runtimeSettingsPatch } from '../lib/runtimeSettings.js';
import { useFetch } from '../lib/useFetch.js';
import { useUnsavedChangesPrompt } from '../lib/useUnsavedChangesPrompt.js';

const PRESENTATION = {
  workerCount: {
    label: '引擎工作进程数',
    unit: '个工作进程',
    description:
      '扫描工作流和后处理任务共用的容量。设为 0 时会暂停接收新任务，但已在运行的任务会继续执行。',
  },
  maxConcurrentScans: {
    label: '并发扫描池',
    unit: '项扫描',
    description: '可同时立即运行的扫描数量上限。排队中的扫描会等待当前扫描池清空。',
  },
  maxWorkersPerScan: {
    label: '每项扫描的工作进程数',
    unit: '个工作进程',
    description: '单项扫描的工作进程数上限。设为 0 时，会在活动扫描之间自动、均衡地分配工作进程。',
  },
  workersPerAccount: {
    label: '每个账户的工作进程数',
    unit: '个工作进程',
    description:
      '所有扫描中分配给同一提供商账户的根模型调用并发上限。每个会话内的 Codex 子智能体使用单独的上限。',
  },
  autoscaleScanWorkersOnProviderCapacity: {
    label: '容量错误时自动调整扫描工作进程',
    description:
      '当提供商报告暂时的服务器容量限制，或 Codex 达到单独的子智能体限制时，仅将受影响扫描后续的工作进程上限减少一个并重试。账户配额错误不会触发自动调整。',
    enabledDescription: '遇到容量限制时，将受影响扫描的工作进程数减少一个。',
    disabledDescription: '工作进程数上限保持不变。',
  },
  codexMaxSubagentsPerSession: {
    label: '每个 Codex 会话的子智能体数',
    unit: '个子智能体',
    description: '每个 Codex 扫描会话中可同时运行的子智能体数量上限。',
  },
  codexFastMode: {
    label: 'Codex 快速模式',
    description:
      '为支持的原生 Codex 模型请求更快的响应，但用量成本可能更高。未声明支持快速模式的模型仍使用常规服务等级。可用性和费用取决于模型与账户。',
    enabledDescription: '适用于使用受支持的原生 Codex 模型发起的新调用；不会影响正在运行的调用。',
    disabledDescription: '新调用继续使用常规服务等级。',
  },
  minFreeStorageGb: {
    label: '最低可用存储空间',
    unit: 'GiB',
    description:
      '可用磁盘空间低于此值时，暂停启动新的扫描容器。降低此值可以让扫描继续进行，但会增加磁盘完全写满的风险。',
  },
  ignoreLowStorage: {
    label: '忽略低存储空间保护',
    description:
      '无论可用磁盘空间多少，都允许启动新的扫描容器。只有在接受主机磁盘耗尽的风险时才使用。',
    enabledDescription: '不强制执行最低可用存储空间阈值。',
    disabledDescription: '可用空间低于配置阈值时，暂停启动新容器。',
  },
  memoryReserveGb: {
    label: 'Docker 内存预留',
    unit: 'GiB',
    description:
      '为引擎、数据库、API 和系统开销预留的内存，不分配给扫描运行器。如果剩余内存无法容纳所有运行器，系统会自动降低工作进程上限。',
  },
  scanRunnerMemoryMb: {
    label: '运行器内存硬限制',
    unit: 'MiB',
    description:
      '每个启用工具的模型会话的 Docker 内存硬限制。超出限制的运行器会被终止；仅在需要禁用硬限制时设为 0。',
  },
  scanRunnerMemoryReservationMb: {
    label: '运行器内存预留',
    unit: 'MiB',
    description:
      '用于工作进程容量规划和实时准入的软内存预留值。此值可低于硬限制，让空闲运行器共享未使用的 Docker 内存。',
  },
  scanRunnerCpus: {
    label: '运行器 CPU 限制',
    unit: '个 CPU',
    description: '每个后续扫描运行器可使用的 CPU 上限。小数值允许多个运行器共享 CPU；设为 0 表示不限制 CPU。',
  },
  scanRunnerOomScoreAdj: {
    label: '运行器 OOM 优先级',
    description:
      '后续运行器的 Linux 内存不足优先级。正值会提高运行器在引擎协调进程之前被终止的可能性。',
  },
  memoryPressureEvictionEnabled: {
    label: '内存压力过高时回收一个运行器',
    description:
      '默认停用。启用后，如果 Docker 可用内存低于引擎预留值与单个运行器预留值之和，会终止最新的运行器，并以较低并发重试。',
    enabledDescription: '在整体内存压力导致引擎重启之前，先回收最新启动的一个运行器。',
    disabledDescription: '仅通过准入控制和 Docker OOM 处理来保护引擎。',
  },
  workspaceSetupConcurrency: {
    label: '工作区初始化并发数',
    unit: '项初始化',
    description: '限制同时检出代码库和准备隔离工作区的任务数量。降低此值可减少 Docker、磁盘和网络突发负载。',
  },
  retryCount: {
    label: '模型调用重试次数',
    unit: '次重试',
    description: '工作流步骤和后处理脚本失败后可额外尝试的次数。此设置不会自动恢复整项失败的扫描。',
  },
  cyberSafetyRetryCount: {
    label: '安全策略拦截重试次数',
    unit: '次重试',
    description: '仅当提供商依据网络安全政策拦截请求时额外尝试的次数。设为 0 表示首次被拦截后即判定失败。',
  },
  harnessTimeoutSeconds: {
    label: '模型调用超时',
    unit: '秒',
    description: '每次扫描运行框架调用的最长时长。超过该时长后会终止调用并标记为超时。',
  },
};

const SOURCE_LABELS = {
  runtime_config: '运行时配置',
  process_environment: '进程环境变量',
  project_environment: '项目 .env 文件',
  default: '内置默认值',
};

const CAPABILITIES = [
  {
    key: 'automaticScanResume',
    label: '自动恢复整项扫描',
    description: '自动恢复失败的扫描，并保留持久化进度及退避重试机制。',
  },
];

export default function Settings() {
  const { hash } = useLocation();
  const { data, loading, error, reload, setData } = useFetch(() => api.settings(), []);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [notice, setNotice] = useState('');
  const fieldsReady = Boolean(draft);

  useEffect(() => {
    if (data) setDraft(runtimeSettingsDraft(data));
  }, [data]);

  useEffect(() => {
    if (!fieldsReady || !hash.startsWith('#setting-')) return;
    const input = document.getElementById(hash.slice(1));
    input?.scrollIntoView({ block: 'center' });
    input?.focus({ preventScroll: true });
  }, [hash, fieldsReady]);

  const issues = useMemo(() => runtimeSettingsIssues(data, draft), [data, draft]);
  const patch = useMemo(() => runtimeSettingsPatch(data, draft), [data, draft]);
  const issueCount = Object.keys(issues).length;
  const changeCount = Object.keys(patch).length;
  const dirty = issueCount > 0 || changeCount > 0;
  useUnsavedChangesPrompt(dirty || saving);
  usePageChrome([{ label: '系统设置', active: true }], null, []);

  const set = (key, value) => {
    setNotice('');
    setSaveError(null);
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const reset = () => {
    setDraft(runtimeSettingsDraft(data));
    setNotice('');
    setSaveError(null);
  };

  const save = async () => {
    if (!changeCount || issueCount || saving) return;
    if (
      patch.workerCount === 0 &&
      !window.confirm('Pause pickup of new engine work? Jobs already running will be allowed to finish.')
    )
      return;
    const worker = data.settings.workerCount;
    if (
      patch.workerCount > worker.recommendedMax &&
      !window.confirm(
        `Use ${patch.workerCount} engine workers? Values above ${worker.recommendedMax} can exhaust provider, Docker, network, CPU, or memory capacity.`
      )
    )
      return;
    if (
      patch.ignoreLowStorage === true &&
      !window.confirm(
        'Ignore the low-storage safeguard? New scan containers may fill the host disk, causing scans or other services to fail.'
      )
    )
      return;
    if (
      patch.codexFastMode === true &&
      !window.confirm(
        'Enable Codex Fast mode? Supported models can respond faster at a higher usage cost. Pricing and availability depend on your model and account.'
      )
    )
      return;

    setSaving(true);
    setSaveError(null);
    setNotice('');
    try {
      const updated = await api.updateSettings(patch);
      setData(updated);
      setDraft(runtimeSettingsDraft(updated));
      setNotice(
        Object.prototype.hasOwnProperty.call(patch, 'workspaceSetupConcurrency')
          ? 'Settings saved. Live values apply to future work; recreate the engine container to apply workspace setup concurrency.'
          : 'Settings saved. Updated live values apply to future work.'
      );
    } catch (nextError) {
      setSaveError(nextError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-heading">
        <div>
          <h1>系统设置</h1>
          <p>
            调整非机密的引擎运行时行为。提供商凭据单独保存在
            <Link to="/accounts">账户</Link>页面，不会在此处返回。
          </p>
        </div>
        {data && <div className="mono settings-updated-at">加载时间：{new Date(data.generatedAt).toLocaleString('zh-CN')}</div>}
      </div>

      {loading && !data && <Spinner label="正在加载设置…" />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {saveError && <SettingsError error={saveError} />}
      {notice && <div className="settings-notice">{notice}</div>}

      {data && draft && (
        <>
          {!data.persistence.projectEnvironment && (
            <div className="settings-warning">
              项目环境文件不可用。实时值可以更新，但重建引擎时可能会恢复部署时提供的值。
            </div>
          )}

          <section className="settings-section">
            <div className="settings-section-heading">
              <div>
                <h2>引擎运行时</h2>
                <p>API 仅公开列入白名单的非机密设置。</p>
              </div>
              <div className="settings-actions">
                <Button variant="ghost" onClick={reset} disabled={!dirty || saving}>
                  重置
                </Button>
                <Button onClick={save} disabled={!changeCount || issueCount > 0 || saving}>
                  {saving
                    ? '正在保存…'
                    : issueCount
                      ? '请修正校验错误'
                      : changeCount
                        ? `保存 ${changeCount} 项更改`
                        : '已保存'}
                </Button>
              </div>
            </div>

            <RuntimeSettingsFields data={data} draft={draft} issues={issues} saving={saving} onChange={set} />
          </section>

          <section className="settings-section">
            <div className="settings-section-heading">
              <div>
                <h2>调度规划</h2>
                <p>其他生命周期行为目前仍需手动操作。</p>
              </div>
            </div>
            <div className="settings-capability-grid">
              {CAPABILITIES.map((capability) => {
                const state = data.capabilities[capability.key];
                return (
                  <div className="settings-capability" key={capability.key}>
                    <div className="settings-card-topline">
                      <h3>{capability.label}</h3>
                      <span className="settings-badge settings-badge-muted">不可用</span>
                    </div>
                    <p>{capability.description}</p>
                    <div className="mono settings-env-key">来源：{state.trackedBy}</div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export function RuntimeSettingsFields({ data, draft, issues, saving, onChange }) {
  const entries = Object.entries(PRESENTATION);
  const availableEntries = entries.filter(([key]) => data.settings?.[key]);
  const missingLabels = entries.filter(([key]) => !data.settings?.[key]).map(([, presentation]) => presentation.label);

  return (
    <>
      {missingLabels.length > 0 && (
        <div className="settings-warning">
          正在运行的后端无法提供部分设置，已将其隐藏：{missingLabels.join('、')}。重启后端以加载当前设置结构。
        </div>
      )}
      <div className="settings-grid">
        {availableEntries.map(([key, presentation]) =>
          data.settings[key].type === 'boolean' ? (
            <BooleanRuntimeSetting
              key={key}
              name={key}
              presentation={presentation}
              setting={data.settings[key]}
              value={draft[key]}
              issue={issues[key]}
              disabled={saving}
              onChange={(value) => onChange(key, value)}
            />
          ) : (
            <RuntimeSetting
              key={key}
              name={key}
              presentation={presentation}
              setting={data.settings[key]}
              value={draft[key]}
              issue={issues[key]}
              disabled={saving}
              ignored={key === 'minFreeStorageGb' && draft.ignoreLowStorage}
              onChange={(value) => onChange(key, value)}
            />
          )
        )}
      </div>
    </>
  );
}

function BooleanRuntimeSetting({ name, presentation, setting, value, issue, disabled, onChange }) {
  return (
    <article className="settings-card">
      <div className="settings-card-topline">
        <h3>{presentation.label}</h3>
        <span className="settings-badge settings-badge-live">实时生效</span>
      </div>
      <p>{presentation.description}</p>
      <label className="settings-toggle-row" htmlFor={`setting-${name}`}>
        <span>
          <strong>{value ? 'Enabled' : 'Disabled'}</strong>
          <small>{value ? presentation.enabledDescription : presentation.disabledDescription}</small>
        </span>
        <input
          id={`setting-${name}`}
          type="checkbox"
          checked={value}
          disabled={disabled}
          aria-invalid={Boolean(issue) || !setting.valid}
          onChange={(event) => onChange(event.target.checked)}
        />
      </label>
      {issue && <div className="settings-field-error">{issue}</div>}
      {!setting.valid && !issue && (
        <div className="settings-field-error">存储的值无效，当前显示安全的默认值。</div>
      )}
      <div className="settings-card-meta">
        <span className="mono settings-env-key">{setting.envKey}</span>
        <span>{SOURCE_LABELS[setting.source] || setting.source}</span>
        <span>默认{setting.defaultValue ? '启用' : '停用'}</span>
      </div>
    </article>
  );
}

function RuntimeSetting({ name, presentation, setting, value, issue, disabled, ignored, onChange }) {
  const rawValue = `${value}`.trim();
  const numericValue = rawValue && Number.isFinite(Number(rawValue)) ? Number(rawValue) : null;
  const aboveRecommendation = numericValue !== null && numericValue > setting.recommendedMax;
  const paused = name === 'workerCount' && numericValue === 0;
  const cyberRetryEnabled = name === 'cyberSafetyRetryCount' && numericValue !== null && numericValue > 0;
  return (
    <article className="settings-card">
      <div className="settings-card-topline">
        <h3>{presentation.label}</h3>
        <span className={`settings-badge ${setting.apply === 'live' ? 'settings-badge-live' : ''}`}>
          {setting.apply === 'live' ? '实时生效' : '需重建引擎'}
        </span>
      </div>
      <p>{presentation.description}</p>
      <label className="settings-input-label" htmlFor={`setting-${name}`}>
        <span>数值</span>
        <span className="mono">{presentation.unit}</span>
      </label>
      <input
        id={`setting-${name}`}
        className="mono settings-number-input"
        aria-label={`${presentation.label}${presentation.unit ? ` (${presentation.unit})` : ''}`}
        type="number"
        inputMode={setting.type === 'number' ? 'decimal' : 'numeric'}
        min={setting.min}
        max={setting.max}
        step={setting.step || 1}
        value={value}
        disabled={disabled}
        aria-invalid={Boolean(issue) || !setting.valid}
        onChange={(event) => onChange(event.target.value)}
      />
      {issue && <div className="settings-field-error">{issue}</div>}
      {!setting.valid && !issue && (
        <div className="settings-field-error">存储的值无效，当前显示安全的默认值。</div>
      )}
      {(aboveRecommendation || paused || ignored || cyberRetryEnabled) && !issue && (
        <div className="settings-field-warning">
          {ignored
            ? 'This threshold is preserved but not enforced while the low-storage safeguard is ignored.'
            : paused
              ? 'New engine work will remain queued until worker slots are raised above zero.'
              : cyberRetryEnabled
                ? `A blocked request may run up to ${numericValue + 1} total attempts. The provider may reject every attempt.`
                : `Above the conservative recommendation of ${setting.recommendedMax}; verify provider and host capacity.`}
        </div>
      )}
      <div className="settings-card-meta">
        <span className="mono settings-env-key">{setting.envKey}</span>
        <span>{SOURCE_LABELS[setting.source] || setting.source}</span>
        <span>
          Range {setting.min}–{setting.max}
        </span>
      </div>
    </article>
  );
}

function SettingsError({ error }) {
  return (
    <div className="settings-error">
      {apiErrorMessages(error).map((message) => (
        <div key={message}>{message}</div>
      ))}
    </div>
  );
}
