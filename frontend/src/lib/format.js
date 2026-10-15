// Status + severity presentation helpers (ported from the design logic).

export function rateLimitPresentation(reasoning) {
  if (reasoning?.limit_kind === 'runner_resource_limited') {
    return {
      label: '运行器等待重试',
      message:
        '运行器已被终止。原因未知，可能是内存压力、容器限制或外部停止所致。请检查 Docker/容器事件和引擎日志。仅凭退出码 137 不能证明内存不足。',
      accountRelated: false,
    };
  }
  if (reasoning?.limit_kind === 'provider_throttled') {
    return {
      label: '提供商繁忙',
      message: '提供商暂时限制了服务器容量；你的账户用量配额并未耗尽。',
      accountRelated: false,
    };
  }
  if (reasoning?.limit_kind === 'subagent_limited') {
    return {
      label: '子智能体限制',
      message: 'Codex 启动子智能体时触及了单独的高级功能限制；账户用量配额并未耗尽。',
      accountRelated: false,
    };
  }
  if (reasoning?.limit_kind === 'account_quota_limited') {
    return {
      label: '配额已耗尽',
      message: '提供商报告此账户已达到用量配额。',
      accountRelated: true,
    };
  }
  return {
    label: '请求受限',
    message: '提供商暂时限制了请求频率。',
    accountRelated: true,
  };
}

export function providerCapacityAutoscalePresentation(reasoning) {
  const initialCap = reasoning?.provider_capacity_initial_worker_cap;
  const workerCap = reasoning?.provider_capacity_worker_cap;
  const events = reasoning?.provider_capacity_autoscale_events;
  if (
    reasoning?.provider_capacity_autoscale_enabled !== true ||
    !Number.isInteger(initialCap) ||
    initialCap < 1 ||
    !Number.isInteger(workerCap) ||
    workerCap < 1
  )
    return null;
  const reductions = Number.isInteger(events) && events > 0 ? events : Math.max(0, initialCap - workerCap);
  const subagentLimited = reasoning?.limit_kind === 'subagent_limited';
  const runnerLimited = reasoning?.limit_kind === 'runner_resource_limited';
  const label = runnerLimited
    ? '运行器终止后自动缩容'
    : subagentLimited
      ? '子智能体限制后自动缩容'
      : '提供商容量不足时自动缩容';
  const cause = runnerLimited ? 'runner-termination' : subagentLimited ? 'subagent-limit' : 'capacity';
  return {
    initialCap,
    workerCap,
    reductions,
    compact: `${label}：${initialCap} → ${workerCap} 个工作进程`,
    message: `${label}：发生 ${reductions} 次${cause === 'capacity' ? '容量' : cause === 'runner-termination' ? '运行器终止' : '子智能体限制'}事件后，此扫描的工作进程数从 ${initialCap} 降至 ${workerCap}。后续再次遇到此类错误时会逐次减少一个工作进程。`,
  };
}

export function storageWarningPresentation(reasoning, status = 'running') {
  if (!['prewarming_cache', 'running', 'post_processing'].includes(status)) return null;
  const warning = reasoning?.storage_warning;
  if (!warning || typeof warning !== 'object') return null;
  if (!['low_storage', 'storage_check_unavailable'].includes(warning.code)) return null;
  const toGiB = (value) => (Number.isSafeInteger(value) && value >= 0 ? value / 1024 ** 3 : null);
  const requiredGiB = toGiB(warning.required_bytes);
  const freeGiB = toGiB(warning.free_bytes);
  const unavailable = warning.code === 'storage_check_unavailable';
  const measured = freeGiB === null ? '未记录可用空间' : `可用空间为 ${Number(freeGiB.toFixed(3))} GiB`;
  const required = requiredGiB === null ? '未记录阈值' : `最低可用空间为 ${Number(requiredGiB.toFixed(3))} GiB`;
  const recordedAt = Date.parse(warning.detected_at);
  return {
    code: warning.code,
    freeGiB,
    requiredGiB,
    title: unavailable ? '无法检查存储空间' : '等待存储空间充足',
    message:
      (unavailable
        ? '无法测量引擎数据所在文件系统的可用空间；目前尚不能确认磁盘空间不足。'
        : `最近一次检查结果：引擎数据所在文件系统${measured}；${required}。`) +
      '只有检查成功且空间充足时才会启动新容器。系统会自动重复检查，正在运行的容器不受影响。',
    detail:
      '这是引擎数据所在的文件系统，可能不同于 Docker 镜像存储或主机上的其他磁盘。此最低值是安全余量，并非对项目所需空间的估算。' +
      (freeGiB !== null && requiredGiB !== null && !unavailable
        ? ` GiB 数值经过四舍五入；记录的比较值为可用 ${warning.free_bytes} 字节，最低需要 ${warning.required_bytes} 字节。`
        : ''),
    remedy: unavailable
      ? '检查引擎数据挂载点是否可访问，并查看引擎日志。请先恢复存储空间测量，再调整保护设置。'
      : '请清理空间或扩展引擎数据所在磁盘。对于较小的项目，降低最低可用空间阈值可能允许在空间较少时启动，但会增加磁盘写满的风险。此操作不会释放空间，也不保证任务能够完成。',
    observedAt: Number.isFinite(recordedAt) ? new Date(recordedAt).toISOString() : null,
    fixLinks: [{ label: '最低可用存储空间', url: '/settings#setting-minFreeStorageGb' }],
  };
}

export function statusMeta(status, reasoning) {
  const map = {
    completed: { label: '已完成', color: 'var(--ok)', bg: 'var(--ok-bg)', pulse: 'none' },
    running: { label: '运行中', color: 'var(--run)', bg: 'var(--run-bg)', pulse: 'okpulse 1.4s ease-in-out infinite' },
    prewarming_cache: {
      label: '正在预热缓存',
      color: 'var(--pend)',
      bg: 'var(--pend-bg)',
      pulse: 'okpulse 1.4s ease-in-out infinite',
    },
    post_processing: {
      label: '后处理中',
      color: 'var(--run)',
      bg: 'var(--run-bg)',
      pulse: 'okpulse 1.4s ease-in-out infinite',
    },
    paused: { label: '已暂停', color: 'var(--stop)', bg: 'var(--stop-bg)', pulse: 'none' },
    queued: { label: '排队中', color: 'var(--pend)', bg: 'var(--pend-bg)', pulse: 'none' },
    pending: {
      label: '等待中',
      color: 'var(--pend)',
      bg: 'var(--pend-bg)',
      pulse: 'okpulse 1.8s ease-in-out infinite',
    },
    rate_limited: {
      label: rateLimitPresentation(reasoning).label,
      color: 'var(--pend)',
      bg: 'var(--pend-bg)',
      pulse: 'okpulse 1.8s ease-in-out infinite',
    },
    failed: { label: '失败', color: 'var(--fail)', bg: 'var(--fail-bg)', pulse: 'none' },
    stopped: { label: '已停止', color: 'var(--stop)', bg: 'var(--stop-bg)', pulse: 'none' },
  };
  return map[status] || { label: status, color: 'var(--text-3)', bg: 'var(--surface-2)', pulse: 'none' };
}

export function rateLimitRetryText(reasoning, now = Date.now()) {
  const retryCount =
    Number.isInteger(reasoning?.retry_count) && reasoning.retry_count > 0 ? reasoning.retry_count : null;
  const retryAt = Date.parse(reasoning?.retry_after || '');
  let timing = '到达重试时间后';
  if (Number.isFinite(retryAt)) {
    const remainingSeconds = Math.max(0, Math.ceil((retryAt - now) / 1000));
    if (remainingSeconds === 0) timing = '即将';
    else {
      const hours = Math.floor(remainingSeconds / 3600);
      const minutes = Math.floor((remainingSeconds % 3600) / 60);
      const seconds = remainingSeconds % 60;
      const countdown = [
        hours ? `${hours}h` : '',
        hours || minutes ? `${minutes}m` : '',
        `${String(seconds).padStart(2, '0')}s`,
      ]
        .filter(Boolean)
        .join(' ');
      timing = `${countdown} 后`;
    }
  }
  return `自动重试${retryCount ? ` #${retryCount}` : ''}：${timing}。`;
}

export function sevColor(sev) {
  const key = String(sev || '').toLowerCase();
  return (
    {
      critical: 'var(--fail)',
      high: 'var(--fail)',
      medium: 'var(--pend)',
      low: 'var(--run)',
      informational: 'var(--text-3)',
      info: 'var(--text-3)',
    }[key] || 'var(--text-3)'
  );
}

// Best-effort severity from a finding's post-script answer.
export function findingSeverity(vuln) {
  return (
    vuln?.severity ||
    vuln?.postScriptAnswer?.severity ||
    (vuln?.enrichments || []).find((e) => e?.result?.severity)?.result?.severity ||
    vuln?.bountyRank?.impactLevel ||
    null
  );
}
