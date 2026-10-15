# 为 open·kritt 贡献

感谢你帮助改进 open·kritt。参与项目时请遵守[行为准则](CODE_OF_CONDUCT.md)。

## 开始之前

- 报告缺陷或请求功能前，请先搜索[现有议题](https://github.com/Kritt-ai/open-kritt/issues)。
- 问题、想法和较大的提案请发布到 [Discussions](https://github.com/Kritt-ai/open-kritt/discussions)，先行讨论有助于避免重复工作。
- 请勿公开报告漏洞。请按照 [SECURITY.md](SECURITY.md) 的说明私下提交。

## 配置项目

你需要安装 Git、带 Docker Compose 的 Docker，以及 Node.js 20 或更高版本。请先 fork 此代码库，然后：

```bash
# 1. 获取代码
#    外部贡献者：先在 GitHub 上 fork，再克隆自己的 fork：
git clone https://github.com/<you>/open-kritt && cd open-kritt

# 2. 配置模型访问并启动整个服务栈
./kritt setup
./kritt start

# 3. 在分支上修改，并使用 Conventional Commits 格式
git checkout -b feat/my-change
git commit -m "feat(frontend): add X"

# 4. 推送并向 main 分支提交 PR。CI 通过后才能合并。
```

这些命令会配置环境并启动完整服务栈。详细信息请参阅[安装指南](https://docs.kritt.ai/getting-started/installation-and-setup)。

## 实施并验证更改

每项更改应保持聚焦。行为发生变化时，请新增或更新测试和文档，然后运行所有涉及区域的检查：

| 区域 | 检查命令 |
| --- | --- |
| 前端 | `cd frontend && npm install && npm run lint && npm run format:check && npm test && npm run build` |
| 后端 | `cd backend && npm install && npx prisma generate && npx prisma validate && npm run lint && npm run format:check && npm test` |
| 引擎 | `cd engine && pip install -r requirements.txt && ruff check . && ruff format --check . && pytest` |
| 命令行工具 | `node --test scripts/kritt.test.mjs scripts/kritt-ui.test.mjs scripts/kritt-headless.test.mjs` |
| 文档 | `cd docs-site && npm run check-links` |

引擎测试目前可在本地运行，但尚未纳入 CI。若更改跨越多个组件，建议运行完整服务栈进行冒烟测试：

```bash
docker compose up --build
```

## 项目规则

- 请勿提交凭据、令牌、`.env` 文件或本地扫描数据。
- 数据库更改必须新增编号 SQL 文件至 `database/init/`。迁移必须采用增量、只向前且可重复运行的方式；更新 `backend/prisma/schema.prisma` 以保持一致，并将 `npm run migrate` 连续运行两次。
- `VERSION` 是产品版本的唯一事实来源。常规贡献不应更新版本。如确需更改，请编辑 `VERSION` 并运行 `node scripts/sync-version.mjs`。
- Docker 镜像标签必须固定版本。
- 修改依赖锁文件、Prisma 配置、结果字段或 Markdown 渲染前，请阅读[仓库专属的智能体与贡献注意事项](AGENTS.md)。

## 提交更改

每次提交都必须使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```bash
git commit -m "fix(frontend): describe the change"
```

常见类型包括 `feat`、`fix`、`docs`、`refactor`、`test`、`chore` 和 `ci`。作用域可选；可以使用 `feat:` 或 `feat(frontend):`，不可使用 `feat():`。

## 贡献条款

主动提交 PR、commit、补丁或其他贡献，即表示你同意[贡献条款](CONTRIBUTION_TERMS.md)，包括将该贡献中可转让的权利共同转让给 [Harel Rom 和 Gabriel Balko](OWNERSHIP.md)。请勿提交雇主、客户、大学或其他方拥有或限制使用的内容。

无需单独签名、贡献者协议、表单、复选框、登记或特殊提交格式。提交贡献本身即表示同意。

## 创建 Pull Request

请推送分支，并向 `main` 提交 Pull Request。在 PR 中：

- 说明更改内容和原因，并关联相关议题。
- 列出运行过的检查。
- 对可见界面更改附上截图。
- 不要混入无关更改。
- 填写完整 PR 模板，并确认 CI 通过。

项目根据仓库的 [GNU AGPL v3.0 许可证](LICENSE)分发贡献内容。
