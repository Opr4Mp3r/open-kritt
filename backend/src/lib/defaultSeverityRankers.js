import { prisma } from '../db.js';

export const DEFAULT_SEVERITY_RANKERS = [
  {
    name: 'Blockchain security triage',
    description: '采用保守的生产影响标准，适合首次扫描的严重性评级规则。',
    content: `只对具有具体、外部可达生产触发方式的发现进行评级。

- Critical（严重）：共识或完整性遭到破坏、全网持续中断，或未经授权地创建、销毁或窃取资产。
- High（高危）：现实可行的远程输入能够导致长时间服务中断、共识安全性／活性失效、身份认证绕过，或重大资产影响。
- Medium（中危）：对可用性、授权或完整性造成有限影响，但需要有实质意义的前提条件，或影响范围有限。
- Low（低危）：存在具体但轻微生产影响的纵深防御问题。
- Informational（提示）：尚未证明有安全影响的加固机会。

优先采用端到端证据、在默认或指定配置下可达的路径，以及可复现的触发方式。对理论性、仅限测试、需要本地特权、依赖暴力尝试、依赖竞争条件、依赖非默认配置以及未经核实的发现降低排名。将很可能是误报的发现排在最后。

你写入的评级理由用简体中文，不要写成英文。分级标识只能是 Critical、High、Medium、Low、Informational，不要翻译这些枚举。JSON 字段名、代码符号和路径保持原样。`,
  },
];

export const DEFAULT_SEVERITY_RANKER_NAMES = DEFAULT_SEVERITY_RANKERS.map((ranker) => ranker.name);

export function isDefaultSeverityRankerName(name) {
  return DEFAULT_SEVERITY_RANKER_NAMES.includes(name);
}

export async function ensureDefaultSeverityRankers(client = prisma) {
  return client.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('open-kritt-default-severity-rankers'))`;

    const installed = [];
    for (const ranker of DEFAULT_SEVERITY_RANKERS) {
      const existing = await tx.severityRanker.findFirst({
        where: { name: ranker.name },
        orderBy: { insertedAt: 'asc' },
        select: { id: true },
      });
      if (existing) continue;
      await tx.severityRanker.create({ data: ranker });
      installed.push(ranker.name);
    }
    return installed;
  });
}
