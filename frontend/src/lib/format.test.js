import { describe, expect, it } from 'vitest';

import {
  findingSeverity,
  providerCapacityAutoscalePresentation,
  rateLimitPresentation,
  rateLimitRetryText,
  sevColor,
  storageWarningPresentation,
  statusMeta,
} from './format.js';

describe('rate-limited scans', () => {
  it('has explicit status presentation and a deterministic retry summary', () => {
    expect(statusMeta('queued').label).toBe('排队中');
    expect(statusMeta('rate_limited').label).toBe('请求受限');
    expect(
      rateLimitRetryText({ retry_count: 2, retry_after: '2026-07-19T12:10:00Z' }, Date.parse('2026-07-19T12:00:00Z'))
    ).toBe('自动重试 #2：10m 00s 后。');
    expect(
      rateLimitRetryText({ retry_count: 2, retry_after: '2026-07-19T12:10:00Z' }, Date.parse('2026-07-19T12:09:42Z'))
    ).toBe('自动重试 #2：18s 后。');
  });

  it('distinguishes provider capacity throttling from account quota exhaustion', () => {
    expect(statusMeta('rate_limited', { limit_kind: 'provider_throttled' }).label).toBe('提供商繁忙');
    expect(rateLimitPresentation({ limit_kind: 'provider_throttled' })).toMatchObject({
      accountRelated: false,
      label: '提供商繁忙',
    });
    expect(statusMeta('rate_limited', { limit_kind: 'account_quota_limited' }).label).toBe('配额已耗尽');
    expect(rateLimitPresentation({ limit_kind: 'account_quota_limited' })).toMatchObject({
      accountRelated: true,
      label: '配额已耗尽',
    });
    expect(statusMeta('rate_limited', { limit_kind: 'subagent_limited' }).label).toBe('子智能体限制');
    expect(rateLimitPresentation({ limit_kind: 'subagent_limited' })).toMatchObject({
      accountRelated: false,
      label: '子智能体限制',
    });
    expect(
      providerCapacityAutoscalePresentation({
        limit_kind: 'subagent_limited',
        provider_capacity_autoscale_enabled: true,
        provider_capacity_initial_worker_cap: 4,
        provider_capacity_worker_cap: 3,
        provider_capacity_autoscale_events: 1,
      }).compact
    ).toBe('子智能体限制后自动缩容：4 → 3 个工作进程');
  });

  it('summarizes a scan-specific provider capacity reduction', () => {
    expect(
      providerCapacityAutoscalePresentation({
        provider_capacity_autoscale_enabled: true,
        provider_capacity_initial_worker_cap: 20,
        provider_capacity_worker_cap: 18,
        provider_capacity_autoscale_events: 2,
      })
    ).toMatchObject({
      initialCap: 20,
      workerCap: 18,
      reductions: 2,
      compact: '提供商容量不足时自动缩容：20 → 18 个工作进程',
    });
  });
});

describe('scan storage warning', () => {
  it('presents the persisted low-storage guard details', () => {
    expect(
      storageWarningPresentation({
        storage_warning: {
          code: 'low_storage',
          free_bytes: 12 * 1024 ** 3,
          required_bytes: 20 * 1024 ** 3,
        },
      })
    ).toMatchObject({
      code: 'low_storage',
      freeGiB: 12,
      requiredGiB: 20,
    });
  });

  it('returns no warning when the scan has no storage guard state', () => {
    expect(storageWarningPresentation(null)).toBeNull();
  });
});

describe('findingSeverity', () => {
  it('uses the ranker impact level when no post-script severity exists', () => {
    expect(findingSeverity({ bountyRank: { impactLevel: 'informational' } })).toBe('informational');
  });

  it('keeps an explicit post-script severity ahead of the ranker fallback', () => {
    expect(
      findingSeverity({
        severity: 'high',
        bountyRank: { impactLevel: 'informational' },
      })
    ).toBe('high');
  });
});

describe('sevColor', () => {
  it('recognizes the ranker informational label', () => {
    expect(sevColor('informational')).toBe('var(--text-3)');
  });
});
