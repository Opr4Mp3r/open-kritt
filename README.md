<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/images/logo-dark.png" />
  <img alt="open·kritt" src="docs/images/logo-light.png" width="96" height="96" />
</picture>

# open·kritt

**编排 AI 智能体，发现代码中的真实漏洞。**

这是一个开源、自托管的安全与漏洞研究平台，可将有针对性的 AI 分析整理为去重、分级的发现结果，并支持按需验证和补充信息。

[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/Kritt-ai/open-kritt?sort=semver)](https://github.com/Kritt-ai/open-kritt/releases)

[官方网站](https://kritt.ai) ·
[文档](https://docs.kritt.ai) ·
[快速开始](https://docs.kritt.ai/getting-started/installation-and-setup) ·
[参与贡献](CONTRIBUTING.md) ·
[项目所有者](OWNERSHIP.md) ·
[研究论文](https://kritt.ai/open-kritt-launch)

<a href="https://t.co/WzXMUKWxcR"><img alt="加入 open·kritt Discord 社区" src="https://img.shields.io/badge/Discord-5865F2?logo=discord&amp;logoColor=white" /></a>
<a href="https://x.com/Kritt_AI"><img alt="在 X 关注 Kritt" src="https://img.shields.io/badge/X-000000?logo=x&amp;logoColor=white" /></a>

</div>

![open·kritt 工作流构建器](assets/workflow_screen.png)

## open·kritt 是什么？

让模型直接分析整个代码库并寻找漏洞，通常效果不佳。open·kritt 采用聚焦式方法：将研究拆分为边界清晰的小任务，由多个 AI 智能体并行执行，再汇总结果，供你验证和排序。

它面向希望掌控提示词、工作流、模型提供商和基础设施的安全研究人员与重视安全的开发者。

### 功能

- **构建工作流** — 将聚焦的提示词串联为可复用的安全研究流程。
- **执行扫描** — 使用 Codex、Claude Code 或 Grok Build 分析远程或本地代码库及其依赖项。
- **验证发现结果** — 使用后处理脚本验证问题、构建概念验证并生成报告。
- **导出扫描结果** — 将标准发现结果、结构化数据、后处理输出、报告和概念验证打包到 ZIP 文件，并附带适合分享的清单。已完成的扫描会完整导出；已停止或失败但包含发现结果的扫描会生成明确标记的部分导出。受攻击者影响的报告和 PoC 源内容将以纯文本保存。
- **确定结果优先级** — 使用自定义严重性排序规则、统一的发现结果结构和自动去重。
- **自备模型访问方式** — 使用 Codex 登录，或连接 OpenAI、Anthropic、DeepSeek、OpenRouter 或 xAI。

> **源自真实安全研究。** Kritt 团队以研究者 **Blockian** 的名义获得了超过 **1,500,000 美元的漏洞赏金**
> ([Immunefi](https://immunefi.com/profile/Blockian/) ·
> [HackenProof](https://hackenproof.com/hackers/Blockian) ·
> [blockian.xyz](https://blockian.xyz) · [@Kritt_AI](https://x.com/Kritt_AI)).
> open·kritt 是支撑这些工作的内部项目开源精简版。

## 快速开始

你需要安装 Git、带 Docker Compose 的 Docker，以及 Node.js 20 或更高版本。仓库自带的命令行工具无需单独安装。

```bash
git clone https://github.com/Kritt-ai/open-kritt
cd open-kritt
./kritt setup
./kritt start
```

服务启动后，打开 [http://localhost:5173](http://localhost:5173)。只需配置一种模型访问方式；`./kritt setup` 会引导你完成可用的登录或 API 密钥配置。`GITHUB_TOKEN` 为可选项，仅在访问私有 GitHub 仓库时需要。

如果服务器没有浏览器或桌面环境，请保持服务运行，并另开一个终端执行：

```bash
./kritt-headless
```

无界面命令行工具支持导入可移植的工作流、后处理脚本、技能和排序规则 JSON；创建扫描时使用与网页表单相同的后端校验；显示扫描状态、阶段和失败原因；编辑非机密运行时设置；并导出发现结果包。它不会在终端显示发现内容。详见[无界面命令行指南](docs-site/getting-started/headless-cli.mdx)。

默认端口仅绑定到 `127.0.0.1`，后端不提供应用层身份验证。请勿将此服务公开到不可信网络。

可调用工具的智能体会以 root 身份在一次性任务容器中运行，并拥有可写的仓库副本和直接互联网访问权限，以便安装工具、编译目标、运行测试和构建概念验证。请在专用 Docker 主机或虚拟机上运行 open·kritt；扫描不可信代码前，请阅读[威胁模型](docs/threat-model.md)。

有关前置条件、手动 Docker 配置和各模型提供商的说明，请阅读[安装指南](docs-site/getting-started/installation-and-setup.mdx)和 [AI 提供商配置](docs-site/ai-provider-setup/overview.mdx)。

在**账户**页面中，使用会保存状态的**启用**开关，选择哪些账户可以接收新任务，同时保留其他已保存的凭据。详见[启用模型提供商账户](docs/account-activity.md)。

## 文档

使用 Mint 在本地预览文档：

```bash
npm install -g mint
cd docs-site
npm run dev
```

打开 [http://localhost:3001](http://localhost:3001) 查看文档站点。

- [产品概览](docs-site/getting-started/welcome.mdx)
- [在无图形界面环境中使用 open·kritt](docs-site/getting-started/headless-cli.mdx)
- [执行首次扫描](docs-site/first-scan/workflow.mdx)
- [工作流与提示词步骤](docs-site/workflows/steps.mdx)
- [安全与威胁模型](docs/threat-model.md)

## 社区与贡献

open·kritt 由
[Harel Rom (`@harel-coffee`)](https://github.com/harel-coffee) 和
[Gabriel Balko (`@GabiCtrlZ`)](https://github.com/GabiCtrlZ) 共同拥有并维护。详情请参阅[项目所有权和版权](OWNERSHIP.md)。

问题和想法请发布到 [GitHub Discussions](https://github.com/Kritt-ai/open-kritt/discussions)。缺陷和功能请求请提交到 [GitHub Issues](https://github.com/Kritt-ai/open-kritt/issues)。

欢迎参与贡献。开发环境、检查命令和 Conventional Commits 规范请参阅[贡献指南](CONTRIBUTING.md)。

请按照 [SECURITY.md](SECURITY.md) 的说明私下报告安全漏洞，不要通过公开 issue 披露。

## 许可证

open·kritt 采用 [GNU Affero 通用公共许可证第 3 版](LICENSE)授权。
