-- 将 014 中完全未修改的 30 条内置技能参考说明升级为简体中文。
-- slug、id、来源 URL 和 SPDX 标识保持不变；不涉及历史扫描结果。
-- 同时匹配原始元数据和正文 MD5，任何用户编辑都会使整条记录跳过。
-- MD5 仅用于原始种子文本的精确版本匹配，不用于密码或凭据保护。
-- 014 重放时按 slug 检查存在性；中文记录再次执行本迁移时不匹配英文原值。
WITH translations (
    slug, old_name, old_description, old_content_md5,
    source_url, license_spdx, old_attribution,
    name, description, content, attribution
) AS (
    VALUES
    (
        'cloudflare-security-audit',
        'Cloudflare security audit',
        'Optional external security-audit skill reference for exploitable vulnerabilities with real impact across services, APIs, CLIs, libraries, and daemons.',
        '01d848860dde651f9a5d81b774b59938',
        'https://github.com/cloudflare/security-audit-skill/blob/main/SKILL.md',
        'MIT',
        'References Cloudflare security-audit-skill metadata, concise bridge text only.',
        'Cloudflare 安全审计',
        '可选的外部安全审计技能参考，用于发现服务、API、CLI、库和守护进程中可被利用且有实际影响的漏洞。',
        $skill_zh$
当扫描需要广泛且侧重实际影响的安全审计时，使用此可选的外部技能参考。

重点：
- 发现攻击者在现实条件下具有所需控制能力、且可造成实质影响的可利用漏洞。
- 在报告漏洞前梳理入口点。
- 跟踪从攻击者输入到安全敏感的危险操作或不变量的数据流与控制流。
- 在有助于独立探索代码库、验证线索和减少误报时，使用子智能体。
- 优先依据具体证据，而非仅凭模式匹配报告问题。
- 排除理论性担忧、框架的预期行为、不可达代码、测试、示例，以及没有可达攻击路径的问题。

来源与许可证：
- 上游来源为 Cloudflare 的 security-audit 技能。
- 采用 MIT 许可证。若另行导入完整上游技能正文，须保留上游署名。
$skill_zh$,
        '参考 Cloudflare security-audit-skill 元数据；此处仅为简短衔接说明。'
    ),
    (
        'github-security-review',
        'GitHub security review',
        'Optional external security-review skill reference for tracing code flows and finding vulnerabilities that pattern matching may miss.',
        'f43b73cc8d292dcb614b9ee3a515aa6c',
        'https://github.com/github/awesome-copilot/blob/main/skills/security-review/SKILL.md',
        'MIT',
        'References GitHub awesome-copilot security-review metadata, concise bridge text only.',
        'GitHub 安全审查',
        '可选的外部安全审查技能参考，用于跟踪代码执行流程并发现模式匹配可能遗漏的漏洞。',
        $skill_zh$
当扫描需要对常见应用技术栈开展通用安全审查时，使用此可选的外部技能参考。

重点：
- 检查注入风险、身份认证与授权逻辑、秘密信息泄露、薄弱的密码学实现、不安全的依赖和业务逻辑滥用。
- 跟踪从输入源到危险操作的数据流，而非仅依赖 grep 式的特征匹配。
- 核实组件交互、框架中间件、路由注册、后台任务和依赖边界。
- 仅报告具有合理利用路径、受影响代码定位和具体修复措施的问题。

来源与许可证：
- 上游来源为 GitHub awesome-copilot 的 security-review 技能。
- 采用 MIT 许可证。若另行导入完整上游技能正文，须保留上游署名。
$skill_zh$,
        '参考 GitHub awesome-copilot security-review 元数据；此处仅为简短衔接说明。'
    ),
    (
        'pashov-solidity-auditor',
        'Pashov Solidity auditor',
        'Optional external Solidity audit skill reference for smart-contract vulnerability discovery.',
        '7e859fe4c50cfb253185b089662e201a',
        'https://github.com/pashov/skills/blob/main/solidity-auditor/SKILL.md',
        'MIT',
        'References Pashov Audit Group pashov/skills metadata, concise bridge text only.',
        'Pashov Solidity 审计',
        '可选的外部 Solidity 审计技能参考，用于发现智能合约漏洞。',
        $skill_zh$
对 Solidity 和 EVM 协议进行审计时，使用此可选的外部技能参考。

重点：
- 审查生产环境中的 Solidity 合约；排除测试、模拟对象、接口和随项目分发的第三方库，除非它们属于生产依赖。
- 在寻找漏洞前，建立资产流向和信任边界图。
- 优先关注缺失授权、记账错误、预言机操纵、舍入问题、重入、不安全的外部调用、升级与初始化错误、签名重放，以及导致资金损失的操作序列。
- 使用攻击者交易序列验证每条线索，并解释修饰器、防护条件或不变量为何无法阻止攻击。

来源与许可证：
- 上游来源为 Pashov 的 solidity-auditor 技能。
- 采用 MIT 许可证。若另行导入完整上游技能正文，须保留上游署名。
$skill_zh$,
        '参考 Pashov Audit Group pashov/skills 元数据；此处仅为简短衔接说明。'
    ),
    (
        'pashov-xray',
        'Pashov X-Ray',
        'Optional external pre-audit reconnaissance skill reference for protocol overview, threat modeling, invariants, integrations, and risk surfaces.',
        '8ff1d6a1e67857903b0bc0fedb007dea',
        'https://github.com/pashov/skills/blob/main/x-ray/SKILL.md',
        'MIT',
        'References Pashov Audit Group pashov/skills metadata, concise bridge text only.',
        'Pashov X-Ray 审计前勘察',
        '可选的外部审计前勘察技能参考，涵盖协议概览、威胁建模、不变量、集成和风险面。',
        $skill_zh$
当扫描需要在深入寻找漏洞前开展审计勘察时，使用此可选的外部技能参考。

重点：
- 概述协议或应用的架构、特权参与者、信任边界、可从外部调用的接口、集成和文档质量。
- 提取不变量，并按 Git 活跃度、代码复杂度、价值转移和可组合性依赖对攻击面排序。
- 为后续审查确定具体目标：分发器、权限检查、记账更新、预言机读取、跨链桥验证器、结算逻辑和升级钩子。
- 将可执行的审查目标传递给后续工作流步骤，不能停留在架构笔记。

来源与许可证：
- 上游来源为 Pashov 的 x-ray 技能。
- 采用 MIT 许可证。若另行导入完整上游技能正文，须保留上游署名。
$skill_zh$,
        '参考 Pashov Audit Group pashov/skills 元数据；此处仅为简短衔接说明。'
    ),
    (
        'pashov-fizz',
        'Pashov Fizz fuzzing',
        'Optional external Solidity fuzzing skill reference for Echidna/Medusa-compatible invariant and stateful fuzz suites.',
        'ac15fd2d46271ebcd54253456b640d4e',
        'https://github.com/pashov/skills/blob/main/fizz/SKILL.md',
        'MIT',
        'References Pashov Audit Group pashov/skills metadata, concise bridge text only.',
        'Pashov Fizz 模糊测试',
        '可选的外部 Solidity 模糊测试技能参考，用于编写兼容 Echidna/Medusa 的不变量测试和有状态模糊测试套件。',
        $skill_zh$
当 Solidity 扫描需要提出或分析模糊测试与不变量测试驱动程序时，使用此可选的外部技能参考。

重点：
- 识别与记账、授权、代币守恒、预言机假设、存款、取款、清算和升级有关的有状态不变量。
- 优先复用现有 Foundry 或 Hardhat 配置来构建测试驱动程序，避免另行设计部署方案。
- 除非明确要求，否则生成的模糊测试应与生产代码隔离。
- 使用模糊测试验证或证伪具体漏洞假设，不能用它替代漏洞利用推理。

来源与许可证：
- 上游来源为 Pashov 的 fizz 技能。
- 采用 MIT 许可证。若另行导入完整上游技能正文，须保留上游署名。
$skill_zh$,
        '参考 Pashov Audit Group pashov/skills 元数据；此处仅为简短衔接说明。'
    ),
    (
        'trail-of-bits-entry-point-analyzer',
        'Trail of Bits entry-point analyzer',
        'Optional external Trail of Bits entry-point analysis reference for enumerating realistic attacker-controlled ingress.',
        '92b5fec388360d71ea2c6def7fc42ccb',
        'https://github.com/trailofbits/skills/blob/main/plugins/entry-point-analyzer/skills/entry-point-analyzer/SKILL.md',
        'CC-BY-SA-4.0',
        'References Trail of Bits skills metadata, concise bridge text only.',
        'Trail of Bits 入口点分析',
        '可选的外部 Trail of Bits 入口点分析参考，用于枚举现实中可由攻击者控制的输入入口。',
        $skill_zh$
当扫描需要重点确保入口点发现的完整性时，使用此可选的外部技能参考。

重点：
- 枚举外部可达的 HTTP/RPC 路由、CLI 命令、协议消息、对等节点输入、反序列化入口、软件包公开导出项、定时任务、Webhook 处理程序、智能合约调用，以及验证节点或客户端输入。
- 对攻击者能力、身份认证要求、数据结构和下游处理程序进行分类。
- 根据已发现的入口点，将后续漏洞报告限定在可达的生产代码路径上。

来源与许可证：
- 上游来源为 Trail of Bits 的 entry-point-analyzer 技能。
- Trail of Bits 技能采用 CC-BY-SA-4.0 许可证。本条目仅为简短衔接说明。若另行导入完整上游技能正文，须保留署名并遵守相同方式共享（ShareAlike）义务。
$skill_zh$,
        '参考 Trail of Bits skills 元数据；此处仅为简短衔接说明。'
    ),
    (
        'trail-of-bits-variant-analysis',
        'Trail of Bits variant analysis',
        'Optional external Trail of Bits variant-analysis reference for finding sibling bugs after one concrete pattern is identified.',
        '21964dc381eddaf9e4899e92f2eff57f',
        'https://github.com/trailofbits/skills/blob/main/plugins/variant-analysis/skills/variant-analysis/SKILL.md',
        'CC-BY-SA-4.0',
        'References Trail of Bits skills metadata, concise bridge text only.',
        'Trail of Bits 变体分析',
        '可选的外部 Trail of Bits 变体分析参考，用于在识别出具体漏洞模式后寻找同类漏洞。',
        $skill_zh$
当扫描需要搜索已知漏洞模式的变体时，使用此可选的外部技能参考。

重点：
- 提炼根本原因，而非仅概括表面症状。
- 搜索相关模块、其他协议版本、生成代码、语言绑定、适配器和依赖封装。
- 独立验证每个变体的可达性、攻击者控制能力和影响。
- 不报告缺少原始漏洞利用前提的相似代码。

来源与许可证：
- 上游来源为 Trail of Bits 的 variant-analysis 技能。
- Trail of Bits 技能采用 CC-BY-SA-4.0 许可证。本条目仅为简短衔接说明。若另行导入完整上游技能正文，须保留署名并遵守相同方式共享（ShareAlike）义务。
$skill_zh$,
        '参考 Trail of Bits skills 元数据；此处仅为简短衔接说明。'
    ),
    (
        'trail-of-bits-static-analysis',
        'Trail of Bits static analysis',
        'Optional external Trail of Bits static-analysis reference for using Semgrep, CodeQL, SARIF, and manual validation together.',
        '8c4d04ff4a77c71ccfb2e41acc607d39',
        'https://github.com/trailofbits/skills/tree/main/plugins/static-analysis/skills',
        'CC-BY-SA-4.0',
        'References Trail of Bits skills metadata, concise bridge text only.',
        'Trail of Bits 静态分析',
        '可选的外部 Trail of Bits 静态分析参考，用于结合使用 Semgrep、CodeQL、SARIF 和人工验证。',
        $skill_zh$
当扫描需要将静态分析工具与人工安全推理结合时，使用此可选的外部技能参考。

重点：
- 使用静态分析模式发现候选问题，再手动证明其可达性与影响。
- 将 Semgrep、CodeQL、SARIF 等工具的输出视为线索，不能直接视为已确认漏洞。
- 通过跟踪攻击者可控数据、检查框架语义和确认生产配置来减少误报。
- 当工具结果对应真实漏洞时，报告准确的输入源、危险操作、净化或校验缺口，以及利用序列。

来源与许可证：
- 上游来源为 Trail of Bits 的 static-analysis 插件技能。
- Trail of Bits 技能采用 CC-BY-SA-4.0 许可证。本条目仅为简短衔接说明。若另行导入完整上游技能正文，须保留署名并遵守相同方式共享（ShareAlike）义务。
$skill_zh$,
        '参考 Trail of Bits skills 元数据；此处仅为简短衔接说明。'
    ),
    (
        'trail-of-bits-supply-chain-risk',
        'Trail of Bits supply-chain risk',
        'Optional external Trail of Bits supply-chain risk reference for dependency, build, package, and release-path review.',
        '95d180adf6733fb5840d50b7cce5403e',
        'https://github.com/trailofbits/skills/blob/main/plugins/supply-chain-risk-auditor/skills/supply-chain-risk-auditor/SKILL.md',
        'CC-BY-SA-4.0',
        'References Trail of Bits skills metadata, concise bridge text only.',
        'Trail of Bits 供应链风险',
        '可选的外部 Trail of Bits 供应链风险参考，用于审查依赖、构建、软件包和发布路径。',
        $skill_zh$
当扫描需要审查软件供应链风险时，使用此可选的外部技能参考。

重点：
- 检查依赖执行钩子、软件包脚本、生成代码、二进制下载、随项目分发的第三方代码、锁文件、构建插件、CI 发布步骤和更新机制。
- 优先关注在构建、安装、测试、发布或生产启动期间执行的路径。
- 区分日常运维规范问题与可被利用的入侵路径。
- 报告现实的攻击前提，以及由此导致的代码执行、凭据泄露、软件包接管或构建产物篡改影响。

来源与许可证：
- 上游来源为 Trail of Bits 的 supply-chain-risk-auditor 技能。
- Trail of Bits 技能采用 CC-BY-SA-4.0 许可证。本条目仅为简短衔接说明。若另行导入完整上游技能正文，须保留署名并遵守相同方式共享（ShareAlike）义务。
$skill_zh$,
        '参考 Trail of Bits skills 元数据；此处仅为简短衔接说明。'
    ),
    (
        'trail-of-bits-solana-scanner',
        'Trail of Bits Solana scanner',
        'Optional external Trail of Bits Solana vulnerability-scanner reference for Solana programs, clients, runtimes, and protocol code.',
        '2978cfee5d96ccdbbea64390b42fad79',
        'https://github.com/trailofbits/skills/blob/main/plugins/building-secure-contracts/skills/solana-vulnerability-scanner/SKILL.md',
        'CC-BY-SA-4.0',
        'References Trail of Bits skills metadata, concise bridge text only.',
        'Trail of Bits Solana 漏洞扫描',
        '可选的外部 Trail of Bits Solana 漏洞扫描参考，适用于 Solana 程序、客户端、运行时和协议代码。',
        $skill_zh$
对 Solana 程序、验证节点、运行时和协议客户端进行审查时，使用此可选的外部技能参考。

重点：
- 跟踪交易、指令、账户、sysvars、签名、功能开关、验证节点输入、重放行为、Bank 状态，以及依赖或参考实现。
- 审查授权、签名者和账户约束、账户所有权、CPI、PDA 派生、序列化、算术运算、租金/手续费/奖励、预编译程序、系统调用，以及影响共识的运行时行为。
- 对客户端或运行时代码，在有提供的参考实现时进行对比，并且仅报告可从外部触发的行为差异。

来源与许可证：
- 上游来源为 Trail of Bits 的 Solana vulnerability scanner 技能。
- Trail of Bits 技能采用 CC-BY-SA-4.0 许可证。本条目仅为简短衔接说明。若另行导入完整上游技能正文，须保留署名并遵守相同方式共享（ShareAlike）义务。
$skill_zh$,
        '参考 Trail of Bits skills 元数据；此处仅为简短衔接说明。'
    ),
    (
        'sentry-security-review',
        'Sentry security review',
        'Optional external Sentry security-review skill reference for high-confidence vulnerability review across application code.',
        '86e1b7aab4d945d7a12e2c2d73538103',
        'https://github.com/getsentry/skills/blob/main/skills/security-review/SKILL.md',
        'Apache-2.0',
        'References Sentry getsentry/skills metadata, concise bridge text only.',
        'Sentry 安全审查',
        '可选的外部 Sentry 安全审查技能参考，用于对应用代码开展高置信度漏洞审查。',
        $skill_zh$
当扫描需要广泛且高置信度的应用安全审查时，使用此可选的外部技能参考。

重点：
- 在针对文件、差异或候选漏洞提交报告前，研究整个代码库。
- 确认攻击者可控输入、可达的危险操作、框架防护缺口和安全影响。
- 优先关注注入、XSS、身份认证、授权、密码学实现、SSRF、反序列化、文件处理和供应链风险。
- 避免仅凭模式匹配报告问题；排除仅用于测试的代码、常量、由服务端控制的配置，以及框架默认行为已缓解的问题。

来源与许可证：
- 上游来源为 Sentry 的 security-review 技能。
- 采用 Apache-2.0 许可证。若另行导入完整上游技能正文，须保留上游署名。
$skill_zh$,
        '参考 Sentry getsentry/skills 元数据；此处仅为简短衔接说明。'
    ),
    (
        'sentry-github-actions-security-review',
        'Sentry GitHub Actions security review',
        'Optional external Sentry GHA security-review skill reference for exploitable workflow and CI/CD attack paths.',
        '6f2240275618b716ece4d1fbd28cd430',
        'https://github.com/getsentry/skills/blob/main/skills/gha-security-review/SKILL.md',
        'Apache-2.0',
        'References Sentry getsentry/skills metadata, concise bridge text only.',
        'Sentry GitHub Actions 安全审查',
        '可选的外部 Sentry GHA 安全审查技能参考，用于发现可被利用的工作流和 CI/CD 攻击路径。',
        $skill_zh$
当扫描需要审查 GitHub Actions 工作流中现实可行的利用方式时，使用此可选的外部技能参考。

重点：
- 审查工作流触发器、权限、秘密信息、代码检出行为、本地 Action、可复用工作流、缓存、构建产物和自托管运行器。
- 建模的外部攻击者能够从 Fork 发起 PR、创建议题或发表评论，但不能向受保护分支推送。
- 优先关注 pull_request_target 滥用、表达式注入、命令解析、凭据提权、未固定版本的 Action、通过 CI 进行的 AI 提示词注入，以及供应链入侵。
- 高置信度漏洞必须具备具体的入口点、攻击载荷、执行机制、影响和概念验证概要。

来源与许可证：
- 上游来源为 Sentry 的 gha-security-review 技能。
- 采用 Apache-2.0 许可证。若另行导入完整上游技能正文，须保留上游署名。
$skill_zh$,
        '参考 Sentry getsentry/skills 元数据；此处仅为简短衔接说明。'
    ),
    (
        'sentry-django-access-review',
        'Sentry Django access review',
        'Optional external Sentry Django access-control skill reference for IDOR, authorization, and tenant-isolation review.',
        '0d8d768d24dfadfcb7fb69c7c17ce1e6',
        'https://github.com/getsentry/skills/blob/main/skills/django-access-review/SKILL.md',
        'Apache-2.0',
        'References Sentry getsentry/skills metadata, concise bridge text only.',
        'Sentry Django 访问控制审查',
        '可选的外部 Sentry Django 访问控制技能参考，用于审查 IDOR、授权和租户隔离。',
        $skill_zh$
当扫描针对 Django 或 Django REST Framework 的授权机制时，使用此可选的外部技能参考。

重点：
- 在寻找漏洞前，建立适用于当前代码库的授权模型。
- 跟踪视图、序列化器、权限类、装饰器、中间件、基类、自定义管理器，以及 get_queryset 重写实现。
- 检查某个用户、角色、租户或组织是否能够访问或修改其他用户的资源。
- 仅报告已确认的授权绕过，并给出可达端点、所需身份、缺失的对象访问范围限制和预期修复措施。

来源与许可证：
- 上游来源为 Sentry 的 django-access-review 技能。
- 采用 Apache-2.0 许可证。若另行导入完整上游技能正文，须保留上游署名。
$skill_zh$,
        '参考 Sentry getsentry/skills 元数据；此处仅为简短衔接说明。'
    ),
    (
        'factory-security-review',
        'Factory security review',
        'Optional external Factory AI security-review skill reference for STRIDE-based repository and PR vulnerability review.',
        '0e28a65d2401fc2ca40167cc99a31758',
        'https://github.com/Factory-AI/skills/blob/main/skills/security-review/SKILL.md',
        'MIT',
        'References Factory AI Factory-AI/skills metadata, concise bridge text only.',
        'Factory 安全审查',
        '可选的外部 Factory AI 安全审查技能参考，用于基于 STRIDE 的代码库和 PR 漏洞审查。',
        $skill_zh$
当扫描需要结合威胁建模与代码库或 PR 安全审查时，使用此可选的外部技能参考。

重点：
- 在扫描具体漏洞前，建立或查阅威胁模型。
- 结合 STRIDE 类别和已知漏洞模式，审查变更文件与完整代码库上下文。
- 在生成后续报告或补丁前，验证候选漏洞的可利用性。
- 优先使用结构化漏洞记录，包含受影响组件、攻击路径、严重性、证据和建议修复方案。

来源与许可证：
- 上游来源为 Factory AI 的 security-review 技能。
- 采用 MIT 许可证。若另行导入完整上游技能正文，须保留上游署名。
$skill_zh$,
        '参考 Factory AI Factory-AI/skills 元数据；此处仅为简短衔接说明。'
    ),
    (
        'factory-threat-model-generation',
        'Factory threat model generation',
        'Optional external Factory AI threat-model skill reference for STRIDE architecture and trust-boundary mapping.',
        'b62a4f0e517b7560750e8bf785239c36',
        'https://github.com/Factory-AI/skills/blob/main/skills/threat-model-generation/SKILL.md',
        'MIT',
        'References Factory AI Factory-AI/skills metadata, concise bridge text only.',
        'Factory 威胁模型生成',
        '可选的外部 Factory AI 威胁建模技能参考，用于基于 STRIDE 梳理架构和信任边界。',
        $skill_zh$
当扫描需要在寻找漏洞前建立威胁模型时，使用此可选的外部技能参考。

重点：
- 识别语言、框架、服务、入口点、数据存储、外部接口和后台任务。
- 梳理公开区域、需认证区域、内部区域、管理区域和第三方区域之间的信任边界。
- 跟踪敏感数据流，以及身份认证、授权、校验、加密、日志和部署相关的安全控制。
- 将架构认识转化为具体审查目标和可复用的扫描上下文。

来源与许可证：
- 上游来源为 Factory AI 的 threat-model-generation 技能。
- 采用 MIT 许可证。若另行导入完整上游技能正文，须保留上游署名。
$skill_zh$,
        '参考 Factory AI Factory-AI/skills 元数据；此处仅为简短衔接说明。'
    ),
    (
        'factory-vulnerability-validation',
        'Factory vulnerability validation',
        'Optional external Factory AI vulnerability-validation skill reference for exploitability checks and false-positive reduction.',
        '8d11929e1e4f3a27e8235cd6bfeacbb9',
        'https://github.com/Factory-AI/skills/blob/main/skills/vulnerability-validation/SKILL.md',
        'MIT',
        'References Factory AI Factory-AI/skills metadata, concise bridge text only.',
        'Factory 漏洞验证',
        '可选的外部 Factory AI 漏洞验证技能参考，用于检查可利用性并减少误报。',
        $skill_zh$
当扫描需要在报告或修复前验证疑似漏洞时，使用此可选的外部技能参考。

重点：
- 将入口点按外部可达、需认证、内部可达或不可达分类。
- 沿数据转换、校验器、框架中间件和防护条件，跟踪从输入源到危险操作的攻击者控制能力。
- 在适当情况下，构建最小化的利用过程说明或概念验证概要。
- 当前提条件、数据控制能力或影响不成立时，明确标记为误报。

来源与许可证：
- 上游来源为 Factory AI 的 vulnerability-validation 技能。
- 采用 MIT 许可证。若另行导入完整上游技能正文，须保留上游署名。
$skill_zh$,
        '参考 Factory AI Factory-AI/skills 元数据；此处仅为简短衔接说明。'
    ),
    (
        'factory-commit-security-scan',
        'Factory commit security scan',
        'Optional external Factory AI commit-security-scan skill reference for PR, staged, and commit-range vulnerability review.',
        'f625f0a1ea08af0f0268291db2b96277',
        'https://github.com/Factory-AI/skills/blob/main/skills/commit-security-scan/SKILL.md',
        'MIT',
        'References Factory AI Factory-AI/skills metadata, concise bridge text only.',
        'Factory 提交安全扫描',
        '可选的外部 Factory AI 提交安全扫描技能参考，用于对 PR、暂存变更和提交范围开展漏洞审查。',
        $skill_zh$
当扫描需要聚焦变更代码而非整个代码库时，使用此可选的外部技能参考。

重点：
- 根据 PR、暂存区差异、提交、分支比较或近期提交范围确定审查范围。
- 在判断安全影响前，阅读变更行所在文件的完整上下文。
- 将变更与现有威胁模型进行对比；如无威胁模型，则生成扫描上下文。
- 仅报告变更代码中的漏洞，并明确其与差异的关联、可利用性和修复路径。

来源与许可证：
- 上游来源为 Factory AI 的 commit-security-scan 技能。
- 采用 MIT 许可证。若另行导入完整上游技能正文，须保留上游署名。
$skill_zh$,
        '参考 Factory AI Factory-AI/skills 元数据；此处仅为简短衔接说明。'
    ),
    (
        'netresearch-security-audit',
        'Netresearch security audit',
        'Optional external Netresearch security-audit skill reference for OWASP, CWE, CVSS, cloud, IaC, API, frontend, LLM, PHP, and TYPO3 review.',
        'e4c9ea20c114f7c2376db057d144c8a1',
        'https://github.com/netresearch/security-audit-skill/blob/main/skills/security-audit/SKILL.md',
        'MIT AND CC-BY-SA-4.0',
        'References Netresearch security-audit-skill metadata, concise bridge text only.',
        'Netresearch 安全审计',
        '可选的外部 Netresearch 安全审计技能参考，涵盖 OWASP、CWE、CVSS、云、IaC、API、前端、LLM、PHP 和 TYPO3 审查。',
        $skill_zh$
当扫描需要广泛覆盖应用与基础设施代码的安全审计时，使用此可选的外部技能参考。

重点：
- 审查 OWASP Top 10、API、LLM、CWE Top 25、CVSS 评分、安全编码和现代攻击类别。
- 覆盖注入、XXE、XSS、CSRF、命令注入、路径遍历、文件上传、反序列化、SSRF、SSTI、JWT、宽松类型转换（type juggling）和身份认证或授权缺陷。
- 纳入 AWS、Azure、GCP、Terraform、Kubernetes、Docker、Helm、GitHub Actions 和依赖供应链等云与基础设施攻击面。
- 当项目采用相关技术栈时，深入检查 PHP、TYPO3、Symfony、Laravel、API、前端和 AI 智能体配置。

来源与许可证：
- 上游来源为 Netresearch 的 security-audit 技能。
- 上游声明采用 MIT AND CC-BY-SA-4.0 许可证。若另行导入完整上游技能正文，须保留署名并遵守相同方式共享（ShareAlike）义务。
$skill_zh$,
        '参考 Netresearch security-audit-skill 元数据；此处仅为简短衔接说明。'
    ),
    (
        'trail-of-bits-agentic-actions-auditor',
        'Trail of Bits agentic actions auditor',
        'Optional external Trail of Bits skill reference for GitHub Actions workflows that invoke AI coding agents.',
        '16485d0dcdcd309c6351174c15834a1a',
        'https://github.com/trailofbits/skills/blob/main/plugins/agentic-actions-auditor/skills/agentic-actions-auditor/SKILL.md',
        'CC-BY-SA-4.0',
        'References Trail of Bits skills metadata, concise bridge text only.',
        'Trail of Bits 智能体 Action 审计',
        '可选的外部 Trail of Bits 技能参考，用于审查调用 AI 编码智能体的 GitHub Actions 工作流。',
        $skill_zh$
当扫描需要审计运行 AI 编码智能体的 CI 工作流时，使用此可选的外部技能参考。

重点：
- 查找调用 Claude Code Action、Gemini CLI、OpenAI Codex、GitHub AI Inference 或类似智能体步骤的工作流。
- 沿 env 配置块、提示词、Action 输入、复合 Action 和可复用工作流，跟踪攻击者可控的 GitHub 事件数据。
- 审查沙箱配置、工具权限、通配符允许列表、提示词构建和外部输入触发器。
- 仅报告具备现实触发条件、数据流、智能体能力和影响的 CI 智能体攻击路径。

来源与许可证：
- 上游来源为 Trail of Bits 的 agentic-actions-auditor 技能。
- Trail of Bits 技能采用 CC-BY-SA-4.0 许可证。本条目仅为简短衔接说明。若另行导入完整上游技能正文，须保留署名并遵守相同方式共享（ShareAlike）义务。
$skill_zh$,
        '参考 Trail of Bits skills 元数据；此处仅为简短衔接说明。'
    ),
    (
        'trail-of-bits-audit-context-building',
        'Trail of Bits audit context building',
        'Optional external Trail of Bits skill reference for deep line-by-line audit context before vulnerability hunting.',
        'd24f70942a5ad8d91b5873a1d791f75e',
        'https://github.com/trailofbits/skills/blob/main/plugins/audit-context-building/skills/audit-context-building/SKILL.md',
        'CC-BY-SA-4.0',
        'References Trail of Bits skills metadata, concise bridge text only.',
        'Trail of Bits 审计上下文构建',
        '可选的外部 Trail of Bits 技能参考，用于在寻找漏洞前逐行深入建立审计上下文。',
        $skill_zh$
当扫描需要在报告漏洞前更深入地理解架构时，使用此可选的外部技能参考。

重点：
- 在判断漏洞可能性前，自底向上分析重要函数、模块和流程。
- 记录不变量、假设、信任边界、数据所有权、状态转换和推理陷阱。
- 将底层观察与系统整体的安全属性关联起来。
- 使用形成的上下文减少臆测的漏洞报告，并指导后续漏洞挖掘。

来源与许可证：
- 上游来源为 Trail of Bits 的 audit-context-building 技能。
- Trail of Bits 技能采用 CC-BY-SA-4.0 许可证。本条目仅为简短衔接说明。若另行导入完整上游技能正文，须保留署名并遵守相同方式共享（ShareAlike）义务。
$skill_zh$,
        '参考 Trail of Bits skills 元数据；此处仅为简短衔接说明。'
    ),
    (
        'trail-of-bits-burpsuite-project-parser',
        'Trail of Bits Burp Suite project parser',
        'Optional external Trail of Bits skill reference for extracting HTTP traffic and findings from Burp Suite project files.',
        'ddd6fe94e1cf2025d2ec553d66e0a8bc',
        'https://github.com/trailofbits/skills/blob/main/plugins/burpsuite-project-parser/skills/burpsuite-project-parser/SKILL.md',
        'CC-BY-SA-4.0',
        'References Trail of Bits skills metadata, concise bridge text only.',
        'Trail of Bits Burp Suite 项目解析',
        '可选的外部 Trail of Bits 技能参考，用于从 Burp Suite 项目文件中提取 HTTP 流量和审计发现。',
        $skill_zh$
当扫描有可用的 Burp Suite 项目证据时，使用此可选的外部技能参考。

重点：
- 在捕获的代理历史、站点地图、请求体、响应体和标头中搜索与安全相关的模式。
- 当所需工具可用时，从 Burp 项目文件中提取审计发现和 HTTP 证据。
- 将捕获的请求与源代码入口点、身份认证状态和观察到的应用行为关联起来。
- 将流量作为可达性和可利用性的证据，不能用它替代代码审查。

来源与许可证：
- 上游来源为 Trail of Bits 的 burpsuite-project-parser 技能。
- Trail of Bits 技能采用 CC-BY-SA-4.0 许可证。本条目仅为简短衔接说明。若另行导入完整上游技能正文，须保留署名并遵守相同方式共享（ShareAlike）义务。
$skill_zh$,
        '参考 Trail of Bits skills 元数据；此处仅为简短衔接说明。'
    ),
    (
        'trail-of-bits-c-review',
        'Trail of Bits C/C++ review',
        'Optional external Trail of Bits skill reference for native userspace C and C++ security review.',
        '51ced36228770b56b495b2df76e0cb6b',
        'https://github.com/trailofbits/skills/blob/main/plugins/c-review/skills/c-review/SKILL.md',
        'CC-BY-SA-4.0',
        'References Trail of Bits skills metadata, concise bridge text only.',
        'Trail of Bits C/C++ 安全审查',
        '可选的外部 Trail of Bits 技能参考，用于原生用户态 C 和 C++ 代码的安全审查。',
        $skill_zh$
当扫描针对原生 C 或 C++ 用户态代码时，使用此可选的外部技能参考。

重点：
- 审查内存破坏、整数溢出、类型混淆、释放后使用、生命周期缺陷、解析错误、竞态条件和平台特有的安全错误。
- 优先关注守护进程、服务、解析器、网络输入、文件格式、IPC、权限边界和攻击者可控的缓冲区。
- 具体说明导致崩溃、数据破坏、信息泄露或控制流影响的过程。
- 排除内核和嵌入式目标，除非扫描明确要求纳入该范围。

来源与许可证：
- 上游来源为 Trail of Bits 的 c-review 技能。
- Trail of Bits 技能采用 CC-BY-SA-4.0 许可证。本条目仅为简短衔接说明。若另行导入完整上游技能正文，须保留署名并遵守相同方式共享（ShareAlike）义务。
$skill_zh$,
        '参考 Trail of Bits skills 元数据；此处仅为简短衔接说明。'
    ),
    (
        'trail-of-bits-constant-time-analysis',
        'Trail of Bits constant-time analysis',
        'Optional external Trail of Bits skill reference for timing side-channel review in cryptographic and secret-handling code.',
        '7821539e297f7ccd957c26645b9f8c24',
        'https://github.com/trailofbits/skills/blob/main/plugins/constant-time-analysis/skills/constant-time-analysis/SKILL.md',
        'CC-BY-SA-4.0',
        'References Trail of Bits skills metadata, concise bridge text only.',
        'Trail of Bits 恒定时间分析',
        '可选的外部 Trail of Bits 技能参考，用于审查密码学代码和敏感信息处理代码中的计时侧信道。',
        $skill_zh$
当扫描需要审查代码中依赖秘密值的计时泄露时，使用此可选的外部技能参考。

重点：
- 识别依赖秘密值的分支、查表、除法、内存访问模式、提前退出、解析捷径，以及敏感值日志记录。
- 审查 C、C++、Go、Rust、Swift、Java、Kotlin、C#、PHP、JavaScript、TypeScript、Python 和 Ruby 中与密码学相关的代码。
- 在报告前区分公开输入与秘密值。
- 仅当泄露路径可达且与安全相关时，才建议使用恒定时间原语或重新设计。

来源与许可证：
- 上游来源为 Trail of Bits 的 constant-time-analysis 技能。
- Trail of Bits 技能采用 CC-BY-SA-4.0 许可证。本条目仅为简短衔接说明。若另行导入完整上游技能正文，须保留署名并遵守相同方式共享（ShareAlike）义务。
$skill_zh$,
        '参考 Trail of Bits skills 元数据；此处仅为简短衔接说明。'
    ),
    (
        'trail-of-bits-fp-check',
        'Trail of Bits false-positive check',
        'Optional external Trail of Bits skill reference for validating suspected security findings and eliminating false positives.',
        '1c844963e9d4f4688c01293c4cd7fd1c',
        'https://github.com/trailofbits/skills/blob/main/plugins/fp-check/skills/fp-check/SKILL.md',
        'CC-BY-SA-4.0',
        'References Trail of Bits skills metadata, concise bridge text only.',
        'Trail of Bits 误报检查',
        '可选的外部 Trail of Bits 技能参考，用于验证疑似安全问题并排除误报。',
        $skill_zh$
当扫描需要判断某个具体的疑似漏洞是否真实存在时，使用此可选的外部技能参考。

重点：
- 对每个疑似漏洞核实可达性、攻击者控制能力、前提条件、缓解措施和影响。
- 给出明确的真实漏洞或误报结论，并附上支持证据。
- 在可用时，使用代码、配置、框架行为、测试和运行时证据。
- 此模式仅用于验证候选问题，不用于广泛寻找漏洞。

来源与许可证：
- 上游来源为 Trail of Bits 的 fp-check 技能。
- Trail of Bits 技能采用 CC-BY-SA-4.0 许可证。本条目仅为简短衔接说明。若另行导入完整上游技能正文，须保留署名并遵守相同方式共享（ShareAlike）义务。
$skill_zh$,
        '参考 Trail of Bits skills 元数据；此处仅为简短衔接说明。'
    ),
    (
        'trail-of-bits-insecure-defaults',
        'Trail of Bits insecure defaults',
        'Optional external Trail of Bits skill reference for fail-open defaults, hardcoded secrets, weak auth, and permissive production configuration.',
        '7c2fbdbbb172746822c4a6cb7f63dc49',
        'https://github.com/trailofbits/skills/blob/main/plugins/insecure-defaults/skills/insecure-defaults/SKILL.md',
        'CC-BY-SA-4.0',
        'References Trail of Bits skills metadata, concise bridge text only.',
        'Trail of Bits 不安全默认配置',
        '可选的外部 Trail of Bits 技能参考，用于检查默认放行、硬编码秘密信息、薄弱的认证机制和过于宽松的生产配置。',
        $skill_zh$
当扫描需要审查配置与环境变量处理在生产环境中是否会在失败时放行时，使用此可选的外部技能参考。

重点：
- 查找在缺少秘密信息、密钥、URL、认证开关或策略设置时，仍允许应用以不安全方式运行的默认配置。
- 区分失败时放行的行为、保持安全的崩溃退出，以及明确仅供本地开发使用的测试配置。
- 审查应用配置、Docker、Compose、Helm、Terraform、Kubernetes、部署清单和 CI 变量。
- 报告可被利用的生产路径，排除示例、测试、样例和文档片段。

来源与许可证：
- 上游来源为 Trail of Bits 的 insecure-defaults 技能。
- Trail of Bits 技能采用 CC-BY-SA-4.0 许可证。本条目仅为简短衔接说明。若另行导入完整上游技能正文，须保留署名并遵守相同方式共享（ShareAlike）义务。
$skill_zh$,
        '参考 Trail of Bits skills 元数据；此处仅为简短衔接说明。'
    ),
    (
        'trail-of-bits-semgrep-rule-creator',
        'Trail of Bits Semgrep rule creator',
        'Optional external Trail of Bits skill reference for creating custom Semgrep security rules and taint analyses.',
        '1cb4a56c8627f2316678f5a6e284172b',
        'https://github.com/trailofbits/skills/blob/main/plugins/semgrep-rule-creator/skills/semgrep-rule-creator/SKILL.md',
        'CC-BY-SA-4.0',
        'References Trail of Bits skills metadata, concise bridge text only.',
        'Trail of Bits Semgrep 规则编写',
        '可选的外部 Trail of Bits 技能参考，用于创建自定义 Semgrep 安全规则和污点分析。',
        $skill_zh$
当扫描需要生成或改进自定义静态分析检测规则时，使用此可选的外部技能参考。

重点：
- 将具体漏洞模式转化为经过测试的 Semgrep 规则。
- 对输入源到危险操作之间的数据流缺陷使用污点模式，对 API 误用或不安全配置使用结构匹配模式。
- 创建正例与反例测试，证明规则能捕获真实变体且不会产生大量误报。
- 将生成的规则视为检测辅助工具，在报告漏洞前仍需人工验证。

来源与许可证：
- 上游来源为 Trail of Bits 的 semgrep-rule-creator 技能。
- Trail of Bits 技能采用 CC-BY-SA-4.0 许可证。本条目仅为简短衔接说明。若另行导入完整上游技能正文，须保留署名并遵守相同方式共享（ShareAlike）义务。
$skill_zh$,
        '参考 Trail of Bits skills 元数据；此处仅为简短衔接说明。'
    ),
    (
        'trail-of-bits-fuzzing-harness-writing',
        'Trail of Bits fuzzing harness writing',
        'Optional external Trail of Bits skill reference for designing effective fuzzing harnesses across languages and targets.',
        '981f6c850271fc4c131a872bac7b9638',
        'https://github.com/trailofbits/skills/blob/main/plugins/testing-handbook-skills/skills/harness-writing/SKILL.md',
        'CC-BY-SA-4.0',
        'References Trail of Bits skills metadata, concise bridge text only.',
        'Trail of Bits 模糊测试驱动程序编写',
        '可选的外部 Trail of Bits 技能参考，用于为不同语言和目标设计有效的模糊测试驱动程序。',
        $skill_zh$
当扫描需要分析或提出模糊测试驱动程序时，使用此可选的外部技能参考。

重点：
- 识别高价值的解析器、解码器、协议处理程序、状态机、导入器和边界 API。
- 设计行为确定的测试驱动程序，将模糊测试器的原始输入转化为对被测系统的有意义调用。
- 避免吞掉错误、跳过重要状态、依赖网络或时间，或仅覆盖浅层解析的测试驱动程序。
- 使用模糊测试验证具体漏洞假设，或提高高风险代码的覆盖率。

来源与许可证：
- 上游来源为 Trail of Bits 的 harness-writing 技能。
- Trail of Bits 技能采用 CC-BY-SA-4.0 许可证。本条目仅为简短衔接说明。若另行导入完整上游技能正文，须保留署名并遵守相同方式共享（ShareAlike）义务。
$skill_zh$,
        '参考 Trail of Bits skills 元数据；此处仅为简短衔接说明。'
    ),
    (
        'trail-of-bits-libfuzzer',
        'Trail of Bits libFuzzer',
        'Optional external Trail of Bits skill reference for LLVM libFuzzer setup and C/C++ coverage-guided fuzzing.',
        '4d274622324e1d6c89fe6514c9bc046f',
        'https://github.com/trailofbits/skills/blob/main/plugins/testing-handbook-skills/skills/libfuzzer/SKILL.md',
        'CC-BY-SA-4.0',
        'References Trail of Bits skills metadata, concise bridge text only.',
        'Trail of Bits libFuzzer 模糊测试',
        '可选的外部 Trail of Bits 技能参考，用于配置 LLVM libFuzzer 并开展覆盖率引导的 C/C++ 模糊测试。',
        $skill_zh$
当扫描针对可用 Clang 编译并开展覆盖率引导模糊测试的 C 或 C++ 代码时，使用此可选的外部技能参考。

重点：
- 推荐使用 libFuzzer，对解析器、编解码器和库 API 快速开展进程内模糊测试。
- 明确编译器、Sanitizer、语料库、字典、超时、可复现性和崩溃输入最小化方面的注意事项。
- 当需要开展更大规模的模糊测试时，优先采用便于迁移到 AFL++ 的测试驱动程序。
- 将模糊测试输出视为线索，仍需分析根本原因和可利用性。

来源与许可证：
- 上游来源为 Trail of Bits 的 libFuzzer 技能。
- Trail of Bits 技能采用 CC-BY-SA-4.0 许可证。本条目仅为简短衔接说明。若另行导入完整上游技能正文，须保留署名并遵守相同方式共享（ShareAlike）义务。
$skill_zh$,
        '参考 Trail of Bits skills 元数据；此处仅为简短衔接说明。'
    ),
    (
        'trail-of-bits-yara-rule-authoring',
        'Trail of Bits YARA rule authoring',
        'Optional external Trail of Bits skill reference for malware-detection and threat-hunting YARA-X rule authoring.',
        '3539782fbadb7820661528ca22cf053e',
        'https://github.com/trailofbits/skills/blob/main/plugins/yara-authoring/skills/yara-rule-authoring/SKILL.md',
        'CC-BY-SA-4.0',
        'References Trail of Bits skills metadata, concise bridge text only.',
        'Trail of Bits YARA 规则编写',
        '可选的外部 Trail of Bits 技能参考，用于编写恶意软件检测和威胁狩猎所需的 YARA-X 规则。',
        $skill_zh$
当扫描需要生成或审查 YARA 检测逻辑时，使用此可选的外部技能参考。

重点：
- 面向具体恶意软件家族、行为、文件格式或特征指标，而非宽泛类别。
- 选择兼顾准确性、性能和抑制误报能力的字符串与 atom。
- 将开销较低的文件检查安排在高开销的模块调用或大规模字符串集合匹配之前。
- 提供元数据和验证指引，使后续研究人员能够理解并维护规则。

来源与许可证：
- 上游来源为 Trail of Bits 的 yara-rule-authoring 技能。
- Trail of Bits 技能采用 CC-BY-SA-4.0 许可证。本条目仅为简短衔接说明。若另行导入完整上游技能正文，须保留署名并遵守相同方式共享（ShareAlike）义务。
$skill_zh$,
        '参考 Trail of Bits skills 元数据；此处仅为简短衔接说明。'
    ),
    (
        'trail-of-bits-zeroize-audit',
        'Trail of Bits zeroize audit',
        'Optional external Trail of Bits skill reference for missing or optimized-away secret zeroization in source code.',
        '6d045021a13be87e59178dc9e3719747',
        'https://github.com/trailofbits/skills/blob/main/plugins/zeroize-audit/skills/zeroize-audit/SKILL.md',
        'CC-BY-SA-4.0',
        'References Trail of Bits skills metadata, concise bridge text only.',
        'Trail of Bits 敏感信息清零审计',
        '可选的外部 Trail of Bits 技能参考，用于检查源代码中缺失或被编译优化消除的敏感信息清零操作。',
        $skill_zh$
当扫描审查处理密钥、密码、令牌、种子或其他敏感材料的代码时，使用此可选的外部技能参考。

重点：
- 跟踪秘密信息在栈、堆、寄存器、结构体、缓冲区、序列化、日志和错误路径中的副本。
- 识别缺失的清理操作，或被编译器优化移除的清理操作。
- 在可用时，优先使用控制流、编译器 IR、汇编或 Sanitizer 类观测结果作为证据。
- 仅报告敏感信息存留时间造成现实泄露风险或违反安全不变量的情况。

来源与许可证：
- 上游来源为 Trail of Bits 的 zeroize-audit 技能。
- Trail of Bits 技能采用 CC-BY-SA-4.0 许可证。本条目仅为简短衔接说明。若另行导入完整上游技能正文，须保留署名并遵守相同方式共享（ShareAlike）义务。
$skill_zh$,
        '参考 Trail of Bits skills 元数据；此处仅为简短衔接说明。'
    )
)
UPDATE public.agent_skills AS skill
SET name = translations.name,
    description = translations.description,
    content = translations.content,
    attribution = translations.attribution,
    updated_at = now()
FROM translations
WHERE skill.slug = translations.slug
  AND skill.name = translations.old_name
  AND skill.description = translations.old_description
  AND md5(skill.content) = translations.old_content_md5
  AND skill.source_url = translations.source_url
  AND skill.license_spdx = translations.license_spdx
  AND skill.attribution = translations.old_attribution;
