# open·kritt 文档站（Mintlify）

此目录是一个独立的 [Mintlify](https://mintlify.com) 文档项目。内容使用 Markdown/MDX 编写，便于在未来切换文档工具时继续使用。

## 本地预览

```bash
cd docs-site
npm i -g mint      # Mintlify 命令行工具
npm run dev        # 在 http://localhost:3001 提供文档
npm run check-links    # 检查内部路由和重定向，不依赖外部工具
npm run broken-links   # 使用 Mintlify 的链接检查器，包含重定向目标
```

仓库开发脚本会将文档站固定在 **3001** 端口。直接运行 `mint dev` 仍会使用 Mintlify 默认的 **3000** 端口；若需临时更换端口，请运行 `mint dev --port <n>`。

品牌资源位于 `logo/mark-accent.png`（导航栏图标，强调色 `#ff5c3d`）和 `favicon.svg`；`style.css` 通过 Mintlify 的 `nav-logo` 钩子放大导航栏图标。

## 连接并发布

1. 在 [mintlify.com](https://mintlify.com) 注册（**Starter/free** 方案即可，项目不使用 AI 助手）。
2. 在 `Kritt-ai/open-kritt` 上安装 **Mintlify GitHub 应用**，并将其指向 `docs-site/` 目录。每次推送到 `main` 后都会重新部署。

## 自定义域名 `docs.kritt.ai`

1. 在 Mintlify 控制面板中进入 **Settings → Custom domain**，添加 `docs.kritt.ai`。
2. 在 DNS 中将 `docs.kritt.ai` 的 `CNAME` 指向 Mintlify 提供的目标地址（`<your-subdomain>.mintlify.site`）。

如果要将文档托管在同一域名的 **`kritt.ai/docs`** 路径下，请在控制面板中启用 **“Host at /docs”**，并在主站配置反向代理规则（Mintlify 为 Cloudflare Workers / Vercel / nginx 提供现成配置）。普通 `/docs` 路径不需要 Enterprise 方案；自定义其他子路径（例如 `/help`）则需要 Enterprise 方案。

## 编辑文档

- 页面以 `.mdx` 文件保存在此处；导航和主题配置在 `docs.json` 中。
- 重命名页面时，必须在 `docs.json` 中保留永久重定向；CI 会检查过期的内部链接、导航缺失的页面和无效的重定向目标。
- 安全说明链接到仓库中的权威文档（`docs/threat-model.md`、`SECURITY.md`）。如果以后全面采用 Mintlify，应指定唯一事实来源以避免内容不一致。
