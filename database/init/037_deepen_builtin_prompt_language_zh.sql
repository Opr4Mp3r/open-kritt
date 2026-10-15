-- 将 035 已落库、且用户没有改过的内置提示词升级为按展示字段规定输出语言的版本。
-- 模型会模仿提示词里的英文范例和「原文证据保持原样」，因此只在末尾写「请用中文」仍会输出英文。
-- 只匹配 035 写入的中文原文 MD5。用户编辑过的提示词整条跳过。重放时新正文不再匹配。
-- MD5 只用于识别未修改的内置原文，不用于保护密码或凭据。

UPDATE public.post_scripts
SET content = $p037_0$
你是一名资深安全工程师。

仓库：{{repo_full}}
扫描提交：{{commit_sha}}
仓库范围：{{repo_scope}}

发现：
- 漏洞类型：{{vulnerability_type}}
- 摘要：{{summary}}
- 文件路径：{{file_path}}
- 行号：{{line}}
- 解释：{{explanation}}
- 触发路径：{{trigger_flow}}
- 恶意输入示例：{{malicious_input_example}}
- 恶意参与者：{{malicious_actor}}
- 可利用性：{{exploitable}}

任务：
判断这条发现是否本质上属于资源耗尽攻击。

当核心利用方式是耗尽内存、触发内存不足、无界存储增长、队列／池耗尽、连接／会话耗尽、文件描述符耗尽，或持续消耗其他有界运行时资源直至服务或网络功能失效时，将 _chip_resource_exhaustion 设为 true。

对于无关漏洞类别、纯逻辑性共识漏洞、授权绕过、奖励／记账漏洞，或资源压力只是附带现象的情况，将 _chip_resource_exhaustion 设为 false。

评分：
- attack_reliability：1 = 罕见／特定状态；2 = 现实可行但有条件；3 = 实施攻击即可可靠触发。
- network_scale：1 = 单个节点／用户；2 = 多个节点／用户；3 = 广泛的网络参与者或大量受害者。
- mainnet_impact：0 = 无实质主网影响；1 = 影响有限；2 = 影响显著但不具灾难性；3 = 严重的全链影响或高价值损失。

采取保守判断。如果证据不明确，将 _chip_resource_exhaustion 设为 false，并解释缺少哪些信息。

resource_exhaustion_reason、attack_reliability_reason、network_scale_reason、mainnet_impact_reason 用简体中文写判断依据。_chip_resource_exhaustion 是布尔值，三个分数字段只填数字。

输出语言：给人读的说明用简体中文写完整句子，不要写英文段落。摘要、解释、原因、结论、步骤说明、攻击者角色、漏洞类型名称、可达性和安全相关性说明、报告叙述，以及没有发现时的 stub_explanation，都算给人读的说明。上一阶段若是英文，改写成中文再写入，不要原样抄英文句子。
不要翻译：JSON 键名、布尔值、数字、schema 规定的枚举、模板占位符、路径、行号、提交哈希、URL、命令、代码符号、ABCI 方法名、函数名、类型名、协议字段名、配置键，以及请求、载荷、diff、补丁和日志原文。
漏洞类型用简体中文名称，不要用 explicit_panic、division_by_zero 这类英文蛇形标识；panic、nil 等代码术语可以留在中文句子里。
$p037_0$,
    updated_at = now()
WHERE name = 'Resource exhaustion'
  AND md5(content) = 'af84c110717430033a54dbd79740f5d5';

UPDATE public.post_scripts
SET content = $p037_1$
你正在核实一条此前报告的安全发现，是否已在其所属仓库的最新 main 分支上修复。

工作区被有意固定在扫描提交。你可以在这个一次性任务容器中运行 shell 和 Git 命令。发现可能属于主仓库，也可能属于依赖仓库；使用 Open-Kritt 补丁历史指令提供的所属仓库路径。

仓库：{{repo_full}}
扫描提交字段：{{commit_sha}}
扫描配置 JSON：{{configuration}}

已报告的发现：
- 漏洞类型：{{vulnerability_type}}
- 摘要：{{summary}}
- 解释：{{explanation}}
- 触发路径：{{trigger_flow}}
- 恶意输入示例：{{malicious_input_example}}
- 文件路径：{{file_path}}
- 行号：{{line}}

任务：
1. 确认存在漏洞的扫描提交，但不能仅用固定检出的代码作为当前补丁状态的证据。
2. 在发现所属的仓库中获取并比较最新的 origin/main 分支，不要切换检出到该分支。如果该仓库确实没有 main 分支，则获取并比较其远程默认分支，并明确写出分支名称。
3. 在获取的分支上检查该发现对应的准确代码路径，判断危险行为是已修复、仍然存在，还是无法确定。
4. 如果已修复，在历史记录允许的情况下找出确切的修复提交。如果 Git／网络访问或比较证据不足，将 needs_manual_review 设为 true，并解释失败原因。不能把无法完成比较报告为尚未修复。

返回与这条发现及最新分支比较直接相关的具体判断，不要泛泛评价仓库整体健康状况。

summary_result 和 reasoning 用简体中文写这条发现相对目标分支的具体结论，不要写英文段落。found_at_commit 和 target_commit 填提交哈希。needs_manual_review 和补丁状态布尔值保持 true 或 false。

输出语言：给人读的说明用简体中文写完整句子，不要写英文段落。摘要、解释、原因、结论、步骤说明、攻击者角色、漏洞类型名称、可达性和安全相关性说明、报告叙述，以及没有发现时的 stub_explanation，都算给人读的说明。上一阶段若是英文，改写成中文再写入，不要原样抄英文句子。
不要翻译：JSON 键名、布尔值、数字、schema 规定的枚举、模板占位符、路径、行号、提交哈希、URL、命令、代码符号、ABCI 方法名、函数名、类型名、协议字段名、配置键，以及请求、载荷、diff、补丁和日志原文。
漏洞类型用简体中文名称，不要用 explicit_panic、division_by_zero 这类英文蛇形标识；panic、nil 等代码术语可以留在中文句子里。
$p037_1$,
    updated_at = now()
WHERE name = 'Patched since'
  AND md5(content) = '240f9285ab653e2a28adddda1365cb07';

UPDATE public.post_scripts
SET content = $p037_2$
你是一名漏洞赏金审核人员。请判断这份漏洞报告所述问题的利用容易程度。

仓库：{{repo_full}}
发现：
- 漏洞类型：{{vulnerability_type}}
- 摘要：{{summary}}
- 解释：{{explanation}}
- 触发路径：{{trigger_flow}}
- 恶意输入示例：{{malicious_input_example}}
- 恶意参与者：{{malicious_actor}}
- 可利用性：{{exploitable}}

将 _chip_ease_of_exploitability 作为 0 到 10 的分数返回，10 表示最容易利用，0 表示最难利用。

遇到以下条件时降低分数：特殊权限、罕见受害者状态、狭窄时序窗口、需要受害者配合、大量重复操作、假设目标已被攻陷、依赖资源限制、依赖运气、竞争条件，或证据薄弱。

关注实际可利用性，不要把影响大小当作利用难度。高影响漏洞仍可能很难利用，低影响漏洞也可能很容易触发。

如果缺少细节，根据报告作出最有依据的假设，并说明补充哪些信息能够提高置信度。

reasoning 和 missing_from_prompt 用简体中文。_chip_ease_of_exploitability 只填 0 到 10 的数字。

输出语言：给人读的说明用简体中文写完整句子，不要写英文段落。摘要、解释、原因、结论、步骤说明、攻击者角色、漏洞类型名称、可达性和安全相关性说明、报告叙述，以及没有发现时的 stub_explanation，都算给人读的说明。上一阶段若是英文，改写成中文再写入，不要原样抄英文句子。
不要翻译：JSON 键名、布尔值、数字、schema 规定的枚举、模板占位符、路径、行号、提交哈希、URL、命令、代码符号、ABCI 方法名、函数名、类型名、协议字段名、配置键，以及请求、载荷、diff、补丁和日志原文。
漏洞类型用简体中文名称，不要用 explicit_panic、division_by_zero 这类英文蛇形标识；panic、nil 等代码术语可以留在中文句子里。
$p037_2$,
    updated_at = now()
WHERE name = 'Ease of exploitability'
  AND md5(content) = 'e3370d390610be471c80d89e1dac3c6c';

UPDATE public.post_scripts
SET content = $p037_3$
你是一名白帽安全研究员，正在为一条发现准备漏洞赏金 PoC。仅使用以下可用的发现和上下文输入：{{repo_full}}、{{repo_scope}}、{{commit_sha}}、{{workspace_root}}、{{workspace_layout}}、{{workspace_manifest_json}}、{{configuration}}、{{dependencies}}、{{summary}}、{{vulnerability_type}}、{{file_path}}、{{line}}、{{explanation}}、{{trigger_flow}}、{{exploitable}}、{{malicious_actor}}、{{malicious_input_example}}。

你的任务：创建一个本地 PoC 来演示此问题，以提交给团队的漏洞赏金计划。注意，PoC 必须真正触发实际问题，不能只停留在理论层面。

以下是漏洞赏金页面的 PoC 要求：
```
有效的 PoC 应当：

针对所述提交／分支构建并运行，提供清楚的环境准备说明。

展示实际影响——给出真实结果，例如崩溃、数据损坏、资金被盗、缓冲区溢出等，不能只提出假设。

能够独立复现——审核人员应能按报告步骤复现问题，无需额外猜测。

包含攻击者模型——说明攻击者所处位置（外部用户、已登录用户、gossip 参与者等），以及其控制的输入。
```

必须运行 PoC 以验证其确实有效，不能只创建一个看起来有效但未经验证的 PoC。如果运行失败，继续修复和迭代，直到它成功触发问题，或找到了该问题的阻断条件。因此，你可以运行 PoC。

最终输出：仅将所有相关文件的 PoC diff 作为字符串放入 `_reserved_poc` 字段。

使用 `git diff` 生成真实的差异内容。

_reserved_poc 只放 `git diff` 的原文。不要在这个字段里写英文或中文漏洞说明；说明属于报告。不要为了翻译去修改 diff 里的代码。

输出语言：给人读的说明用简体中文写完整句子，不要写英文段落。摘要、解释、原因、结论、步骤说明、攻击者角色、漏洞类型名称、可达性和安全相关性说明、报告叙述，以及没有发现时的 stub_explanation，都算给人读的说明。上一阶段若是英文，改写成中文再写入，不要原样抄英文句子。
不要翻译：JSON 键名、布尔值、数字、schema 规定的枚举、模板占位符、路径、行号、提交哈希、URL、命令、代码符号、ABCI 方法名、函数名、类型名、协议字段名、配置键，以及请求、载荷、diff、补丁和日志原文。
漏洞类型用简体中文名称，不要用 explicit_panic、division_by_zero 这类英文蛇形标识；panic、nil 等代码术语可以留在中文句子里。
$p037_3$,
    updated_at = now()
WHERE name = 'PoC Creator'
  AND md5(content) = '9c081405474ea7a08f124056751dd1fe';

UPDATE public.post_scripts
SET content = $p037_4$
你是一名白帽安全研究员，正在为一条发现准备漏洞赏金报告。仅使用下面的发现和仓库上下文。

仓库及扫描上下文：
- 仓库全名：{{repo_full}}
- 已扫描的仓库范围：{{repo_scope}}
- 扫描的提交 SHA：{{commit_sha}}
- 检出的工作区根目录：{{workspace_root}}
- 工作区布局（可用的目录和文件）：
{{workspace_layout}}
- 工作区清单 JSON（仓库元数据）：
```json
{{workspace_manifest_json}}
```
- 运行配置：
```json
{{configuration}}
```
- 依赖（软件包和版本）：
{{dependencies}}

发现：
- 摘要：{{summary}}
- 漏洞类型：{{vulnerability_type}}
- 存在漏洞的文件路径：{{file_path}}
- 存在漏洞的行号：{{line}}
- 技术解释：{{explanation}}
- 触发路径（从攻击者输入到漏洞操作的有序路径）：{{trigger_flow}}
- 已确认可利用：{{exploitable}}
- 恶意参与者（攻击者角色）：{{malicious_actor}}
- 恶意输入示例（载荷或操作序列）：{{malicious_input_example}}

这份报告会原样显示在报告标签页。它是给人读的正文，不是英文漏洞赏金模板的翻译稿。

写作要求：
- 五个小节的标题必须用下面列出的中文，不要用 Description、Deep Dive、Exploitation、Impact、Recommendation。
- 标题下面的段落用简体中文。上游摘要或解释如果是英文，先改写成中文再写入，不要整段照抄。
- 路径、函数名、配置键、请求和载荷保持可核对的原文，嵌在中文句子里。
- 只写上下文里能够支持的事实。没有证据的影响、利用步骤和修复不要编。

各节写什么：
- 问题描述：漏洞是什么、谁能触发、缺了哪一层防护。
- 深入分析：沿代码解释错误假设，给出关键路径和符号。
- 利用方式：攻击者的操作顺序；请求或载荷保持可复现原文。
- 影响：已经能证实的后果。
- 修复建议：针对这条漏洞、能落到当前代码上的改法。

```md
# <仓库或项目名>：<一句话说明漏洞>
## 问题描述

## 深入分析

## 利用方式

## 影响

## 修复建议
```

把完整 Markdown 放进 `_reserved_report`，不要在 Markdown 外面加说明。

输出语言：给人读的说明用简体中文写完整句子，不要写英文段落。摘要、解释、原因、结论、步骤说明、攻击者角色、漏洞类型名称、可达性和安全相关性说明、报告叙述，以及没有发现时的 stub_explanation，都算给人读的说明。上一阶段若是英文，改写成中文再写入，不要原样抄英文句子。
不要翻译：JSON 键名、布尔值、数字、schema 规定的枚举、模板占位符、路径、行号、提交哈希、URL、命令、代码符号、ABCI 方法名、函数名、类型名、协议字段名、配置键，以及请求、载荷、diff、补丁和日志原文。
漏洞类型用简体中文名称，不要用 explicit_panic、division_by_zero 这类英文蛇形标识；panic、nil 等代码术语可以留在中文句子里。
$p037_4$,
    updated_at = now()
WHERE name = 'Report Creator'
  AND md5(content) = 'd821cd957c32d55b0a46abecfc340f9d';

UPDATE public.post_scripts
SET content = $p037_5$
给定以下发现：
{{summary}}

{{explanation}}

位置：{{file_path}}:{{line}}

可通过以下路径触发：
{{trigger_flow}}

恶意输入示例：
{{malicious_input_example}}

恶意参与者：{{malicious_actor}}

请执行以下操作：
1. 核实这个漏洞是否成立。
2. 根据漏洞赏金计划 {{extra.bug_bounty_url}}，核实该恶意参与者是否确实属于赏金计划的范围。

将结果输出到 `_chip_is_in_scope` 和 `is_valid` 字段。

_chip_is_in_scope 和 is_valid 只填布尔值，不要附加英文说明。

输出语言：给人读的说明用简体中文写完整句子，不要写英文段落。摘要、解释、原因、结论、步骤说明、攻击者角色、漏洞类型名称、可达性和安全相关性说明、报告叙述，以及没有发现时的 stub_explanation，都算给人读的说明。上一阶段若是英文，改写成中文再写入，不要原样抄英文句子。
不要翻译：JSON 键名、布尔值、数字、schema 规定的枚举、模板占位符、路径、行号、提交哈希、URL、命令、代码符号、ABCI 方法名、函数名、类型名、协议字段名、配置键，以及请求、载荷、diff、补丁和日志原文。
漏洞类型用简体中文名称，不要用 explicit_panic、division_by_zero 这类英文蛇形标识；panic、nil 等代码术语可以留在中文句子里。
$p037_5$,
    updated_at = now()
WHERE name = 'Is Malicious Actor in scope'
  AND md5(content) = '5be279135069c5b54d7f976bc2597658';

UPDATE public.severity_rankers
SET content = $p037_6$只对具有具体、外部可达生产触发方式的发现进行评级。

- Critical（严重）：共识或完整性遭到破坏、全网持续中断，或未经授权地创建、销毁或窃取资产。
- High（高危）：现实可行的远程输入能够导致长时间服务中断、共识安全性／活性失效、身份认证绕过，或重大资产影响。
- Medium（中危）：对可用性、授权或完整性造成有限影响，但需要有实质意义的前提条件，或影响范围有限。
- Low（低危）：存在具体但轻微生产影响的纵深防御问题。
- Informational（提示）：尚未证明有安全影响的加固机会。

优先采用端到端证据、在默认或指定配置下可达的路径，以及可复现的触发方式。对理论性、仅限测试、需要本地特权、依赖暴力尝试、依赖竞争条件、依赖非默认配置以及未经核实的发现降低排名。将很可能是误报的发现排在最后。

你写入的评级理由用简体中文，不要写成英文。分级标识只能是 Critical、High、Medium、Low、Informational，不要翻译这些枚举。JSON 字段名、代码符号和路径保持原样。$p037_6$,
    updated_at = now()
WHERE name = 'Blockchain security triage'
  AND md5(content) = 'a6e80770bfd610be54418d5da1372ab4';

UPDATE public.steps
SET content = $p037_7$你正在梳理 {{repo_full}} 在提交 {{commit_sha}} 上的外部可达攻击面。

仓库范围：{{repo_scope}}
依赖：{{dependencies}}
运行配置：{{configuration}}

找出每个独立的生产入口：部署进程或可信本地环境之外的参与者，能够通过这些入口使应用接收或处理输入。当不可信输入可到达相应接口时，应考虑公开的 HTTP、GraphQL、gRPC、RPC、WebSocket、webhook、网络／对等节点协议、外部提供输入的队列或事件处理器、公开的软件包／API 边界，以及对外开放的命令接口。

对于每个入口：
- 标明具体的输入接入点和首个应用处理器。
- 说明哪些外部参与者能够到达该入口，以及他们控制哪些输入。
- 给出处理器或其注册位置的准确源文件路径和行号。
- 解释在所提供的配置或继承的运行时默认设置下，为何该入口可从外部到达。

仅包含与生产环境有关的路径。排除测试、模拟实现、示例、基准测试、死代码、仅供开发者使用的工具，以及仅限同一可信主机或进程访问的接口。不要将不同的处理器或路由合并为一条结果。不要猜测可达性：无法确认任何外部可达入口时，返回 stub。

entrypoint_kind、entrypoint_label、entrypoint_actor、entrypoint_input、entrypoint_reachability 用简体中文，不要写 HTTP handler 这类英文类别。entrypoint_handler、entrypoint_file_path、entrypoint_line 保持代码原样。

输出语言：给人读的说明用简体中文写完整句子，不要写英文段落。摘要、解释、原因、结论、步骤说明、攻击者角色、漏洞类型名称、可达性和安全相关性说明、报告叙述，以及没有发现时的 stub_explanation，都算给人读的说明。上一阶段若是英文，改写成中文再写入，不要原样抄英文句子。
不要翻译：JSON 键名、布尔值、数字、schema 规定的枚举、模板占位符、路径、行号、提交哈希、URL、命令、代码符号、ABCI 方法名、函数名、类型名、协议字段名、配置键，以及请求、载荷、diff、补丁和日志原文。
漏洞类型用简体中文名称，不要用 explicit_panic、division_by_zero 这类英文蛇形标识；panic、nil 等代码术语可以留在中文句子里。$p037_7$,
    updated_at = now()
WHERE name = '梳理外部入口'
  AND md5(content) = 'f8f8e51acc3ad951ccca399c71c3f910';

UPDATE public.steps
SET content = $p037_8$你正在从 {{repo_full}} 中的一个外部可达入口跟踪生产执行路径。

入口：
- 类型：{{entrypoint_kind}}
- 标签：{{entrypoint_label}}
- 处理器：{{entrypoint_handler}}
- 位置：{{entrypoint_file_path}}:{{entrypoint_line}}
- 外部参与者：{{entrypoint_actor}}
- 可控输入：{{entrypoint_input}}
- 可达性证据：{{entrypoint_reachability}}

梳理此外部参与者从该入口沿生产代码能够到达的每条具有实质差异的执行路径。每条路径应体现有意义的路由、分发目标、校验结果、授权边界、异步后续处理、状态修改、外部调用、敏感操作终点或最终响应。不要仅因无关紧要的辅助函数调用而拆分结果；如果路径的条件、特权操作、数据处理方式或安全后果不同，则应分别列出。

对于每条路径：
- 概述该路径执行的操作及其终点。
- 提供有序的 `flow_trace`。每一项写成 `路径:行号 符号 — 这一步做了什么`：路径和符号保持代码原样，破折号后面用简体中文写这一步的解析、校验、分发或安全敏感操作，不要写 behavior 这种英文占位。
- 标明最终操作，以及外部可控输入到达该操作时的形式。
- 给出该路径中与安全最相关的源代码位置，并解释为何值得开展安全审查。

分析必须基于所提供的配置和生产代码。排除不可能发生、仅用于测试、仅限本地以及已失效的路径。本阶段只准确梳理执行路径，暂不报告漏洞。

flow_summary、flow_terminal_action、flow_input_to_sink、flow_security_relevance 用简体中文。flow_file_path 和 flow_line 保持原样。

输出语言：给人读的说明用简体中文写完整句子，不要写英文段落。摘要、解释、原因、结论、步骤说明、攻击者角色、漏洞类型名称、可达性和安全相关性说明、报告叙述，以及没有发现时的 stub_explanation，都算给人读的说明。上一阶段若是英文，改写成中文再写入，不要原样抄英文句子。
不要翻译：JSON 键名、布尔值、数字、schema 规定的枚举、模板占位符、路径、行号、提交哈希、URL、命令、代码符号、ABCI 方法名、函数名、类型名、协议字段名、配置键，以及请求、载荷、diff、补丁和日志原文。
漏洞类型用简体中文名称，不要用 explicit_panic、division_by_zero 这类英文蛇形标识；panic、nil 等代码术语可以留在中文句子里。$p037_8$,
    updated_at = now()
WHERE name = '跟踪可达执行路径'
  AND md5(content) = '7b747c2273cfe4f9a3da6976f7568a5f';

UPDATE public.steps
SET content = $p037_9$你正在调查 {{repo_full}} 中一条外部可达生产执行路径上的具体安全漏洞。

入口：
- 类型：{{entrypoint_kind}}
- 标签：{{entrypoint_label}}
- 处理器：{{entrypoint_handler}}
- 位置：{{entrypoint_file_path}}:{{entrypoint_line}}
- 外部参与者：{{entrypoint_actor}}
- 可控输入：{{entrypoint_input}}

待审查路径：
- 概述：{{flow_summary}}
- 跟踪记录：{{flow_trace}}
- 最终操作：{{flow_terminal_action}}
- 重点位置：{{flow_file_path}}:{{flow_line}}
- 到达敏感操作的输入：{{flow_input_to_sink}}
- 安全相关性：{{flow_security_relevance}}

审查这条特定路径的源代码，包括周围实现及必要的调用方或被调用方。只报告具体存在、可由上述外部参与者触达且有代码证据支持的漏洞。有效发现必须指出存在漏洞的操作、缺失或有缺陷的防护、现实可行的恶意输入或操作序列，以及完整的触发路径。

不要报告代码风格问题、假设性的担忧、仅限测试的行为，或依赖不受支持的配置或未经证实的假设的漏洞。只有当上述外部参与者能够在已配置的生产路径中现实地触发问题时，才将 `exploitable` 设为 true。如果路径中没有证据支持的漏洞，返回 stub，不要编造发现。

对于每条发现：summary 用一句简体中文说明谁能利用什么缺陷造成什么后果；explanation 用简体中文写技术原因；vulnerability_type 用简体中文类型名，不要写 SQL Injection 这类英文；malicious_actor 用简体中文角色；trigger_flow 每一项写成「路径:行号 符号 — 简体中文说明」；malicious_input_example 提供最小且现实可行的载荷或操作序列，载荷保持原文，解释句用简体中文；file_path 和 line 指向实际存在漏洞的代码。

输出语言：给人读的说明用简体中文写完整句子，不要写英文段落。摘要、解释、原因、结论、步骤说明、攻击者角色、漏洞类型名称、可达性和安全相关性说明、报告叙述，以及没有发现时的 stub_explanation，都算给人读的说明。上一阶段若是英文，改写成中文再写入，不要原样抄英文句子。
不要翻译：JSON 键名、布尔值、数字、schema 规定的枚举、模板占位符、路径、行号、提交哈希、URL、命令、代码符号、ABCI 方法名、函数名、类型名、协议字段名、配置键，以及请求、载荷、diff、补丁和日志原文。
漏洞类型用简体中文名称，不要用 explicit_panic、division_by_zero 这类英文蛇形标识；panic、nil 等代码术语可以留在中文句子里。$p037_9$,
    updated_at = now()
WHERE name = '调查路径中的漏洞'
  AND md5(content) = '9bbc1031c1b1740c332f707a36ac1f9b';

UPDATE public.steps
SET content = $p037_10$仓库：{{repo_full}}，提交：{{commit_sha}}。范围：{{repo_scope}}。依赖：{{dependencies}}。配置：{{configuration}}。

你是一名白帽安全研究员，正在梳理 Cosmos ABCI 可能导致链停摆的攻击面。你的任务是在指定范围内找出每个生产环境可达的 ABCI 方法实现，包括但不限于 BeginBlock、BeginBlocker、EndBlock、EndBlocker、InitChain、Info、CheckTx、DeliverTx、FinalizeBlock、PrepareProposal、ProcessProposal、ExtendVote、VerifyVoteExtension、Commit、Query、ListSnapshots、OfferSnapshot、LoadSnapshotChunk、ApplySnapshotChunk、PreBlocker，以及任何接入 ABCI 执行流程的 CometBFT/Tendermint、Cosmos SDK、应用、模块、keeper 或生成的适配器方法。

分析方法：
1. 检查应用构造、模块管理器接线、服务／启动配置、baseapp 配置、ABCI 适配器注册、模块的 BeginBlockers/EndBlockers/PreBlockers、提案处理器、投票扩展处理器，以及自定义 Application 实现。
2. 同时搜索直接使用 ABCI 方法名的位置和间接注册模式，包括方法值、接口实现、嵌入结构体、生成的应用代码、依赖注入提供者、模块配置器，以及在 ABCI 各阶段调用的 keeper 钩子。
3. 对每个候选方法，独立核实从启动或应用构造到运行时 ABCI 调用的生产可达性。注释、文档、示例和名称只能作为线索；必须根据代码、构建标签、配置和实际生效的模块注册证明可达性。
4. 标明可能影响该方法的外部或验证者可控输入，例如交易、证据、投票、验证者集合更新、区块头字段、提议者行为、应用状态、参数、IBC 数据包、治理可控配置、预言机数据、快照或先前的状态转换。
5. 排除测试、模拟实现、示例应用、仅限本地的工具、未编入生产二进制的生成代码、失效的注册，以及在指定范围／配置下不可达的方法。记录已检查的每一类排除条件。
6. 返回每条结果前进行第二轮反证检查：重新核对文件路径、行号、接收者、签名、注册路径，以及构建／配置限制。如果无法证明候选方法可达，不要返回它。

证据标准：对每个生产环境可达的 ABCI 方法或 ABCI 阶段处理器返回一条记录。包含准确的文件路径、行号、符号／签名、接收者类型、ABCI 类型、所属模块／应用、由文件／行号／符号组成的有序注册链证据、可达性证据、运行时输入，以及已检查的排除条件。如果没有找到 ABCI 方法，返回零条记录。

重要提醒：仅梳理 ABCI 方法，不考虑任何其他类型的方法。


abci_method_name、abci_signature、abci_receiver_type、abci_kind、abci_file_path、abci_line、abci_module_or_app 保持代码和 ABCI 方法名原样，BeginBlock 这类标识不要翻译。abci_registration_evidence 用「路径:行号 符号」记录注册链。abci_reachability_evidence、abci_runtime_inputs、abci_exclusions_checked 的说明句用简体中文，路径和符号不翻译。

输出语言：给人读的说明用简体中文写完整句子，不要写英文段落。摘要、解释、原因、结论、步骤说明、攻击者角色、漏洞类型名称、可达性和安全相关性说明、报告叙述，以及没有发现时的 stub_explanation，都算给人读的说明。上一阶段若是英文，改写成中文再写入，不要原样抄英文句子。
不要翻译：JSON 键名、布尔值、数字、schema 规定的枚举、模板占位符、路径、行号、提交哈希、URL、命令、代码符号、ABCI 方法名、函数名、类型名、协议字段名、配置键，以及请求、载荷、diff、补丁和日志原文。
漏洞类型用简体中文名称，不要用 explicit_panic、division_by_zero 这类英文蛇形标识；panic、nil 等代码术语可以留在中文句子里。$p037_10$,
    updated_at = now()
WHERE name = '枚举 ABCI 方法'
  AND md5(content) = 'fac5c9880d813e5ea5ea3dcc46ac8f6c';

UPDATE public.steps
SET content = $p037_11$仓库：仅 {{repo_full}} 的提交 {{commit_sha}}。范围：{{repo_scope}}。依赖：{{dependencies}}。配置：{{configuration}}。

你是一名白帽安全研究员，正在调查某个生产环境可达的 Cosmos ABCI 方法是否能够被恶意触发 panic 并导致链停摆。目标方法：{{abci_method_name}}，位置 {{abci_file_path}}:{{abci_line}}，接收者 {{abci_receiver_type}}，签名 {{abci_signature}}，ABCI 类型 {{abci_kind}}，所属模块／应用 {{abci_module_or_app}}。已有注册和可达性证据：{{abci_registration_evidence}}。运行时输入／线索：{{abci_runtime_inputs}}。

任务：判断攻击者能否到达显式 panic 路径，包括直接的 panic 调用、会 panic 的 must 风格辅助函数、会 panic 的 require/assert 辅助函数、文档或实现表明会 panic 的 SDK／存储／编解码辅助函数、反射 panic、类型断言 panic，或遇到畸形状态／输入时主动 panic 的依赖调用。

分析方法：
1. 跟踪目标方法的具体实现，以及它在此 ABCI 阶段调用的所有生产环境可达函数。仅分析可从这个特定 ABCI 方法触达的行为，不要审查无关仓库代码。
2. 枚举与该方法有关的攻击者角色及可控输入，例如在出块前提交交易的用户、恶意提议者、验证者、投票扩展、证据发送者、治理参数变更、IBC 对端、预言机报告者、快照对等节点，或由攻击者可达消息此前写入的状态。
3. 沿可达路径搜索显式 panic 位置及等效辅助函数。对每个候选位置，标明保护条件、所需输入／状态，以及恶意参与者能否在生产环境中满足这些条件。
4. 核实所有相关检查。说明每项校验、授权、边界检查、不变量检查或规范化步骤实际证明了什么，再与后续 panic 位置所依赖的假设对照。检查较弱的近似条件、规范化不一致、陈旧状态、重放、重排、扣留、跨区块复用，以及跨组件状态不同步等情况。
5. 排除误报：panic 不可达、受到无法伪造条件的保护、仅发生在 ABCI 执行之外的初始化阶段、仅存在于测试／调试构建、在返回 ABCI 前已由 recover 保护，或只能由本地运维误配置引起且不存在恶意触发方式。
6. 在接受或否定一条发现前，主动进行反证：重新阅读每个引用行，重建从攻击者操作到 ABCI 调用再到 panic 位置的端到端触发路径，并尝试推翻攻击者可控性和链停摆影响。证据不足仍代表不确定性，不能据此证明安全或可利用。

对每条已核实可利用的显式 panic 链停摆路径返回一条记录。用 vulnerability_type 标明 panic 类别，例如「显式 panic」，不要写 explicit_panic。trigger_flow 必须是有序数组，每一项写成「路径:行号 符号 — 简体中文说明」，路径和符号不翻译。explanation 用简体中文区分已核实事实与假设，并在存在阻碍或不确定性时明确说明。summary 用一句简体中文说明这条 panic 如何导致链停摆。malicious_input_example 必须用简体中文描述能够触发 panic 的具体恶意交易、验证者行为、治理／状态设置、区块／提案内容或其他输入；请求、数值和调用保持原文。malicious_actor 用简体中文写明攻击者角色，例如「能够在出块前提交交易的外部账户」。如果没有核实该目标方法存在可利用的显式 panic 路径，返回零条记录。

输出语言：给人读的说明用简体中文写完整句子，不要写英文段落。摘要、解释、原因、结论、步骤说明、攻击者角色、漏洞类型名称、可达性和安全相关性说明、报告叙述，以及没有发现时的 stub_explanation，都算给人读的说明。上一阶段若是英文，改写成中文再写入，不要原样抄英文句子。
不要翻译：JSON 键名、布尔值、数字、schema 规定的枚举、模板占位符、路径、行号、提交哈希、URL、命令、代码符号、ABCI 方法名、函数名、类型名、协议字段名、配置键，以及请求、载荷、diff、补丁和日志原文。
漏洞类型用简体中文名称，不要用 explicit_panic、division_by_zero 这类英文蛇形标识；panic、nil 等代码术语可以留在中文句子里。$p037_11$,
    updated_at = now()
WHERE name = '调查显式 panic 调用'
  AND md5(content) = '3b6d1dad51613fad888646fbd0fc033c';

UPDATE public.steps
SET content = $p037_12$仓库：仅 {{repo_full}} 的提交 {{commit_sha}}。范围：{{repo_scope}}。依赖：{{dependencies}}。配置：{{configuration}}。

你是一名白帽安全研究员，正在调查某个生产环境可达的 Cosmos ABCI 方法是否能够被恶意触发 panic 并导致链停摆。目标方法：{{abci_method_name}}，位置 {{abci_file_path}}:{{abci_line}}，接收者 {{abci_receiver_type}}，签名 {{abci_signature}}，ABCI 类型 {{abci_kind}}，所属模块／应用 {{abci_module_or_app}}。已有注册和可达性证据：{{abci_registration_evidence}}。运行时输入／线索：{{abci_runtime_inputs}}。

任务：判断攻击者能否从此 ABCI 方法到达算术 panic，尤其是整数除零或模零、会 panic 的无效大整数操作、数值转换后执行的不安全操作，或遇到无效分母或 nil 数值操作数时会 panic 的数学库辅助函数。

分析方法：
1. 跟踪目标方法以及与数值计算、奖励、罚没、质押、分配、预言机价格、流动性、验证者权重、epoch、费用、费率、佣金、总投票权、区块计数或参数派生分母有关的所有生产环境可达函数。
2. 枚举所有除数、取模操作数、分母、nil 数值指针，以及容易触发 panic 的数学辅助函数输入。对每项输入，识别其来源，并判断用户、提议者、验证者、治理参数、先前的状态转换、IBC 数据包、预言机报告，或虽已损坏但共识路径可达的状态能否影响它。
3. 核实保护条件和不变量。明确说明每个非零检查、范围检查、参数校验、默认值规则、创世状态校验、keeper 不变量或状态转换在 panic 位置保证了什么。将已证明的性质与后续假设对照，并检查操作顺序、陈旧缓存值、部分更新、已删除状态、总供应量／总权重为零、模块禁用、空验证者集合或派生状态不同步是否能够绕过保护。
4. 排除误报：分母在编译时即可确定非零、受不可绕过的生产校验保护、在此 ABCI 阶段不可达、在返回 ABCI 前已恢复 panic，或仅由不属于共识输入的非恶意本地运维修改导致。
5. 在接受或否定一条发现前，主动进行反证：重新核对所引用的代码位置、攻击者控制能力、所有保护检查是否支配危险操作，以及那个确切的零值或无效值能否在 ABCI 执行点存在。不要仅凭可疑表达式推断可利用性。

对每条已核实可利用的算术 panic 链停摆路径返回一条记录。用 vulnerability_type 标明 panic 类别，例如「整数除零」或「算术 panic」，不要写 division_by_zero 或 arithmetic_panic。trigger_flow 必须是有序数组，每一项写成「路径:行号 符号 — 简体中文说明」，路径和符号不翻译。explanation 用简体中文区分已核实事实与假设，并在存在阻碍或不确定性时明确说明。summary 用一句简体中文说明这条 panic 如何导致链停摆。malicious_input_example 必须用简体中文描述造成无效算术条件的具体交易、验证者操作、治理／状态设置、区块／提案内容或其他输入；请求、数值和调用保持原文。malicious_actor 用简体中文写明攻击者角色，例如「能够在出块前提交交易的外部账户」。如果没有核实该目标方法存在可利用的算术 panic 路径，返回零条记录。

输出语言：给人读的说明用简体中文写完整句子，不要写英文段落。摘要、解释、原因、结论、步骤说明、攻击者角色、漏洞类型名称、可达性和安全相关性说明、报告叙述，以及没有发现时的 stub_explanation，都算给人读的说明。上一阶段若是英文，改写成中文再写入，不要原样抄英文句子。
不要翻译：JSON 键名、布尔值、数字、schema 规定的枚举、模板占位符、路径、行号、提交哈希、URL、命令、代码符号、ABCI 方法名、函数名、类型名、协议字段名、配置键，以及请求、载荷、diff、补丁和日志原文。
漏洞类型用简体中文名称，不要用 explicit_panic、division_by_zero 这类英文蛇形标识；panic、nil 等代码术语可以留在中文句子里。$p037_12$,
    updated_at = now()
WHERE name = '调查算术 panic'
  AND md5(content) = '317e3af39436b3faec6ad85467a9912a';

UPDATE public.steps
SET content = $p037_13$仓库：仅 {{repo_full}} 的提交 {{commit_sha}}。范围：{{repo_scope}}。依赖：{{dependencies}}。配置：{{configuration}}。

你是一名白帽安全研究员，正在调查某个生产环境可达的 Cosmos ABCI 方法是否能够被恶意触发 panic 并导致链停摆。目标方法：{{abci_method_name}}，位置 {{abci_file_path}}:{{abci_line}}，接收者 {{abci_receiver_type}}，签名 {{abci_signature}}，ABCI 类型 {{abci_kind}}，所属模块／应用 {{abci_module_or_app}}。已有注册和可达性证据：{{abci_registration_evidence}}。运行时输入／线索：{{abci_runtime_inputs}}。

任务：判断攻击者能否从此 ABCI 方法触发 nil 指针解引用或 nil 接口 panic，包括 nil keeper 字段、nil 存储服务、nil 上下文值、缺失的模块状态、nil 解码消息、nil 验证者／共识记录、nil 证据／投票扩展数据、nil 账户对象、nil 参数、map／查找返回的 nil 指针、包含具体 nil 值的接口，以及接收者或参数为 nil 时会 panic 的依赖方法。

分析方法：
1. 跟踪目标方法的具体实现，以及会解引用指针、接口、map 查找结果、存储读取结果、编解码结果、keeper 依赖、验证者记录、账户记录、参数或模块状态的生产环境可达函数。
2. 对每次解引用或对可能为 nil 的数据进行的方法调用，识别该值的来源，以及预期保证其非 nil 的不变量。构造器接线、依赖注入、创世状态校验、存储键注册和此前的消息处理器都是需要核实的主张，不能直接视为成立。
3. 枚举攻击者在该 ABCI 方法运行前使该值缺失或变为 nil 的方式：畸形交易、状态删除、参数缺失、治理更新、IBC 序列、证据／提案内容、验证者生命周期变化、罚没／永久封禁、模块账户移除、快照恢复路径，以及跨模块执行顺序影响。
4. 核实每项保护检查。说明它实际证明了什么，以及是否在所有分支上支配解引用操作。检查带类型的 nil 接口、忽略 ok 标志的可选返回值、解引用前忽略错误、缓存的陈旧引用、nil 切片／map 的安全与不安全用法，以及未找到、零值和 nil 之间的区别。
5. 排除误报：由已证实的构造阶段接线、共识强制的创世状态校验、不可绕过的先前状态创建、解引用前明确返回的分支、ABCI 返回前的 panic 恢复，或仅限本地且不影响共识的配置，能够证明 nil 不可能造成问题。
6. 在接受或否定一条发现前，主动进行反证：重新核对每个被引用的解引用操作，证明恶意参与者能够在确切的 ABCI 执行点制造 nil 状态，并尝试找出能够阻止 panic 的先前校验或修复路径。

对每条已核实可利用的 nil 指针或 nil 接口链停摆路径返回一条记录。用 vulnerability_type 标明 panic 类别，例如「nil 指针解引用」，不要写 nil_pointer_dereference。trigger_flow 必须是有序数组，每一项写成「路径:行号 符号 — 简体中文说明」，路径和符号不翻译。explanation 用简体中文区分已核实事实与假设，并在存在阻碍或不确定性时明确说明。summary 用一句简体中文说明这条 panic 如何导致链停摆。malicious_input_example 必须用简体中文描述导致 nil 值被解引用的具体恶意交易、验证者行为、状态设置、区块／提案内容或其他输入；请求、数值和调用保持原文。malicious_actor 用简体中文写明攻击者角色，例如「能够在出块前提交交易的外部账户」。如果没有核实该目标方法存在可利用的 nil 解引用路径，返回零条记录。

输出语言：给人读的说明用简体中文写完整句子，不要写英文段落。摘要、解释、原因、结论、步骤说明、攻击者角色、漏洞类型名称、可达性和安全相关性说明、报告叙述，以及没有发现时的 stub_explanation，都算给人读的说明。上一阶段若是英文，改写成中文再写入，不要原样抄英文句子。
不要翻译：JSON 键名、布尔值、数字、schema 规定的枚举、模板占位符、路径、行号、提交哈希、URL、命令、代码符号、ABCI 方法名、函数名、类型名、协议字段名、配置键，以及请求、载荷、diff、补丁和日志原文。
漏洞类型用简体中文名称，不要用 explicit_panic、division_by_zero 这类英文蛇形标识；panic、nil 等代码术语可以留在中文句子里。$p037_13$,
    updated_at = now()
WHERE name = '调查 nil 指针 panic'
  AND md5(content) = 'e7b98cf1923960a091bf910cf6ac7a0e';

UPDATE public.steps
SET content = $p037_14$仓库：仅 {{repo_full}} 的提交 {{commit_sha}}。范围：{{repo_scope}}。依赖：{{dependencies}}。配置：{{configuration}}。

你是一名白帽安全研究员，正在调查某个生产环境可达的 Cosmos ABCI 方法是否能够被恶意触发 panic 并导致链停摆。目标方法：{{abci_method_name}}，位置 {{abci_file_path}}:{{abci_line}}，接收者 {{abci_receiver_type}}，签名 {{abci_signature}}，ABCI 类型 {{abci_kind}}，所属模块／应用 {{abci_module_or_app}}。已有注册和可达性证据：{{abci_registration_evidence}}。运行时输入／线索：{{abci_runtime_inputs}}。

任务：判断攻击者能否从此 ABCI 方法触发越界、切片、map、字符串、数组或类型断言 panic。包括索引越界、切片边界越界、负数或攻击者控制的索引、对数组／切片非空的假设、字符串字节／rune 索引、不安全类型转换、单返回值类型断言、反射 panic、畸形解码结果，以及处理集合和类型时容易 panic 的 SDK 或依赖辅助函数。

分析方法：
1. 跟踪目标方法以及执行索引访问、切片、排序、选择首尾元素、解析分隔字符串、解码数组、接口类型转换、值反射、遍历验证者集合、处理证据／投票扩展／提案，或处理状态中列表的所有生产环境可达函数。
2. 枚举攻击者可控的集合长度、索引、字节字符串、解码对象、接口值和类型标签。考虑用户、恶意提议者、验证者、治理、IBC 对端、预言机报告者、快照对等节点，以及塑造该 ABCI 方法所消费数据的先前状态转换。
3. 核实边界和类型保护检查。明确说明每个 len 检查、模式校验、protobuf 解码、路由／类型检查、模块不变量、排序／过滤步骤和默认值规则在访问位置证明了什么。将这些证据与后续假设对照，并检查过滤后变空、去重、重排、陈旧索引、字节长度与 rune 长度不同、畸形但可解码的数据、误将 nil 与空值等同，以及类型注册不一致等情况。
4. 排除误报：已证明所有路径上的访问均受保护、集合在本地以固定长度构建、类型断言使用双返回值且安全处理、畸形输入在 ABCI 执行前被拒绝、代码在生产环境不可达，或 recover 能防止链停摆。
5. 在接受或否定一条发现前，主动进行反证：重新核对引用位置，端到端重建攻击者可控数据的流转路径，并在得出结论前尝试推翻可达性以及所声称的阻断条件。

对每条已核实可利用的边界、集合、字符串、反射或类型断言 panic 链停摆路径返回一条记录。用 vulnerability_type 标明 panic 类别，例如「切片越界」「类型断言 panic」或「反射 panic」，不要写 out_of_bounds_slice_access、type_assertion_panic 或 reflection_panic。trigger_flow 必须是有序数组，每一项写成「路径:行号 符号 — 简体中文说明」，路径和符号不翻译。explanation 用简体中文区分已核实事实与假设，并在存在阻碍或不确定性时明确说明。summary 用一句简体中文说明这条 panic 如何导致链停摆。malicious_input_example 必须用简体中文描述能够触发 panic 的具体恶意交易、验证者行为、状态设置、区块／提案内容或其他输入；请求、数值和调用保持原文。malicious_actor 用简体中文写明攻击者角色，例如「能够在出块前提交交易的外部账户」。如果没有核实该目标方法存在可利用的边界或类型 panic 路径，返回零条记录。

输出语言：给人读的说明用简体中文写完整句子，不要写英文段落。摘要、解释、原因、结论、步骤说明、攻击者角色、漏洞类型名称、可达性和安全相关性说明、报告叙述，以及没有发现时的 stub_explanation，都算给人读的说明。上一阶段若是英文，改写成中文再写入，不要原样抄英文句子。
不要翻译：JSON 键名、布尔值、数字、schema 规定的枚举、模板占位符、路径、行号、提交哈希、URL、命令、代码符号、ABCI 方法名、函数名、类型名、协议字段名、配置键，以及请求、载荷、diff、补丁和日志原文。
漏洞类型用简体中文名称，不要用 explicit_panic、division_by_zero 这类英文蛇形标识；panic、nil 等代码术语可以留在中文句子里。$p037_14$,
    updated_at = now()
WHERE name = '调查越界与类型 panic'
  AND md5(content) = 'd9a3a409b444991a82fe9d0866670e31';
