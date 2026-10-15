# 定位 Kritt 实例

- 项目：以用户实际克隆的 `open-kritt` 目录为准；可用 `git rev-parse --show-toplevel` 确认。
- CLI：项目的 `./kritt-headless api`；Node.js 20+，无需新 npm 依赖。
- 默认 API：`http://127.0.0.1:3002/api`
- 网页：`http://127.0.0.1:5173`
- 部署：以项目现有的 Docker Compose 配置和运行中的服务为准；本机覆盖配置可能位于已忽略的 `.data/` 目录。

上述端口是默认值。以实时 health、settings 和资源列表为准；不把已有 scan 或 provider ID 当作新任务输入。

```sh
cd /path/to/open-kritt
./kritt-headless api GET /health --api-url http://127.0.0.1:3002
./kritt-headless api GET '/scans?page=1&pageSize=6' --api-url http://127.0.0.1:3002
./kritt-headless api GET /model-catalog --api-url http://127.0.0.1:3002
```

显式 API 地址（flag 或 OPEN_KRITT_API_URL）会跳过项目.env读取。未指定地址时才从项目端口定位服务，不用于提取模型密钥。
