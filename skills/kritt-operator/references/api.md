# Kritt API 操作契约

路径以下省略 `/api`。以当前服务的响应及字段错误为准。数据库 bigint ID 在 JSON 中是字符串；保持原值，不转成可能失真的 Number。正文上限 8 MiB。

## JSON CLI

```sh
./kritt-headless api GET /health
./kritt-headless api GET '/scans?page=1&pageSize=6'
./kritt-headless api GET /scans/7
./kritt-headless api POST /scans --body draft.json --dry-run
./kritt-headless api POST /scans --body draft.json
./kritt-headless api PATCH /scans/7 --body status.json
```

`--body -` 从 stdin 读取对象 JSON，相对文件路径按 Kritt 项目根目录解析；临时文件位于项目外时使用绝对路径。可带 `--api-url http://127.0.0.1:5173/api` 和 `--timeout-ms 15000`。URL不得含用户名/密码；不跟随重定向；没有自动重试。成功 stdout 是响应 JSON；错误 stderr 是结构 JSON，`unknownOutcome` 表示非读取请求可能已生效，须先读回。

可执行写请求仅两类：`POST /scans` 且 `launchPolicy=draft`，以及 `PATCH /scans/:id` 且唯一字段 `status` 为 `paused/stopped/completed`。其他写请求只支持本地 `--dry-run`。配置管理用当前 HTTP API，遵循用户明确意图与主技能边界；不得绕过 CLI 限制去启动攻击/复现流程或把 scan 改为 pending。

## 发现与读取

| GET 路径                                 | 关键内容                                             |
| ---------------------------------------- | ---------------------------------------------------- |
| `/health`                                | 服务连通                                             |
| `/local-repos`                           | `{name,path,isGit,branch,commit}` 数组；name用于创建 |
| `/local-repos/:name/stats`               | 文件数、快照问题；目录变化可能409                    |
| `/model-providers`                       | 已配置provider ID列表                                |
| `/model-catalog`                         | `providers[]` 中的model ID、harness、effort、status  |
| `/settings`                              | `settings[name].value/source/valid/min/max/apply`    |
| `/workflows`、`/workflows/:id`、`/steps` | workflow及全部步骤正文                               |
| `/post-scripts`、`/post-scripts/:id`     | 后处理正文、outputFormat                             |
| `/agent-skills`、`/agent-skills/:id`     | 扫描内部提示资源                                     |
| `/severity-rankers`                      | 评级规则正文                                         |
| `/custom-llms`                           | provider元信息、`apiKeyConfigured`，不返回key        |
| `/scans`                                 | 不分页是数组；分页是`{items,page,totalItems,...}`    |
| `/scans/:id`                             | 状态、任务统计、主模型/后处理模型                    |

`status=running`只包含prewarming_cache/running/post_processing，不包含queued/pending/rate_limited。列表为空或runningCount=0不能证明没有待执行任务。

部分 GET 有维护副作用：workflows/rankers可能补默认模板，custom-llms会重新发布快照；都不等于启动扫描。

## 创建草稿

`POST /scans`，固定 `launchPolicy: "draft"`；成功201返回paused扫描，不进入执行队列。下面是字段形状，替换ID与模型，不直接照抄提交：

```json
{
  "workflowId": "已审核的工作流ID",
  "postScriptId": "只生成修复摘要的后处理ID",
  "repo_kind": "local",
  "repo_full": "local-repos列表中的name",
  "repo_scope": "用户要求的源码范围",
  "model_provider": "custom:实际UUID",
  "model": "catalog里的模型ID",
  "harness": "claude-code",
  "thinking_effort": "max",
  "post_processing_thinking_effort": "max",
  "severity_ranker": "只按静态证据评价风险和修复优先级，不生成利用载荷或执行复现。",
  "configuration": { "repeat_runs": 1, "include_tests": false },
  "agentSkillIds": [],
  "dependencies": [],
  "extra": {},
  "launchPolicy": "draft"
}
```

- 必选workflowId、postScriptId、repo_full、model、harness和非空severity_ranker正文。创建目标用`repo_full`，不能照搬GET的`repoFull`。
- local目标是已登记目录名，不能传任意绝对路径；commit自动规范化为LOCAL_SNAPSHOT。目录可能含ignored/untracked文件，范围说明不等于文件隔离。
- model_provider需明确；自定义provider用响应里的`custom:<uuid>`，harness以记录为准。Claude Code自定义协议anthropic，Codex自定义协议responses；chat不支持。
- effort按catalog与harness交集选择；max不是“自动取最高”。Codex可能支持ultra，其他harness不一定支持。
- 额外post-script用`configuration.post_script_ids`。必需`extra`是workflow与全部所选post-script引用键的并集，不传敏感值。
- `jobLimit`是总任务上限，null表示无总上限；不是并发。`model_overrides`以depth字符串为键，每项包含完整模型四元组，更新是整张替换。
- 后处理模型可通过`post_processing_model/model_provider/harness/thinking_effort`对应完整字段设置；不提供则继承主配置。
- 旧服务不认识draft会422；不要降级，也不要创建后再暂停。POST无幂等键，500/超时先核对是否已经存在。

## 状态与资源保护

- PATCH `/scans/:id`：暂停`paused`、停止`stopped`、手动完成`completed`；先读取当前状态。queued/pending/rate_limited不支持paused，可按用户意图停止或完成。
- completed请求会保存人工完成标识并保留结果；已运行任务可收尾。completed不能恢复。此技能不自动调用恢复/启动状态。
- PATCH不能任意替换目标、workflow、post-script、agentSkillIds或评级正文；这些变化需要新草稿。
- DELETE `/scans/:id`仅终态/paused且无运行中或补充队列任务时允许，204成功，否则409。只能按明确删除意图调用HTTP API。
- 导出是二进制ZIP，使用既有`./kritt-headless scan export ID DEST`；不要用JSON命令读取`/export`。

## 运行设置

GET `/settings` 后，PATCH `/settings` 只写明确字段，平面结构如`{"workerCount":3}`。不能回传整个settings描述结构或仅编辑.env。接口会持久化到runtime及项目配置文件。

- 并发由workerCount/maxWorkersPerScan/workersPerAccount及实际容量共同限制；仅在用户要求时同步相关上限，不承诺一定能跑满。
- workerCount=0暂停接收扫描任务，已运行任务继续；不等于停止全部线程。
- min/max是约束，recommendedMax是建议；boolean写JSON布尔。按动态apply处理live/restart，不为live项目擅自重启。
- 不提高cyberSafetyRetryCount或关闭安全边界来绕过拒绝。
- 配置JSON可用CLI dry-run脱敏预览；真正提交用HTTP API，例如无秘密设置文件：

```sh
curl --silent --show-error --fail-with-body   -X PATCH 'http://127.0.0.1:3002/api/settings'   -H 'Content-Type: application/json' --data-binary @settings.json
```

不增加curl重试参数；失败后先读回值。修改全局容量前核对其他排队/活跃任务范围。

## 模板管理

POST `/workflows` 请求是`{name,description,levels:[{depth,multiOutput,consumesAll,outputFormat,steps:[{name,content}]}]}`。GET是平面steps，不能原样PUT。最后一层必须含Kritt规定的8个输出字段；安全模板见assets。PUT会重建step ID，被历史scan引用时409，改为创建独立资源。

POST `/post-scripts` 为`{name,description,content,outputFormat}`。正文只能引用允许的scan/发现字段和extra；被引用后不可改删。只创建整理静态证据和修复建议的模板，不选PoC输出。

POST `/agent-skills` 为`{name,slug,description,content}`，中文名要显式ASCII slug；scan使用其数字ID。POST `/severity-rankers` 为`{name,content,description}`，scan保存content正文而非ranker ID。

这些创建请求使用当前HTTP API，JSON走文件/stdin，执行后按返回ID读回核对。模板POST也非幂等，不按名字猜测唯一，也不盲重试。

## 自定义模型提供商

GET `/custom-llms`返回`{providers,harnesses}`。POST请求包含`name,harness,baseUrl,wireApi,models,defaultModel,enabled,apiKey`；PATCH `/custom-llms/:id`局部更新，DELETE返回204。用API返回的完整ID。

- harness只有codex/claude-code；wireApi分别responses/anthropic。
- models支持ID数组或`{id,label}`数组，defaultModel要在其中。默认模型无效可能回退首项，必须读回确认。
- 更新元信息省略apiKey；null/空串也保留原key，不是删除。
- key只从私密输入转发；不放argv、URL、聊天或Git。不要读取secrets/runtime快照，runtime也含key。
- endpoint须从实际engine/runner容器可达；容器的127.0.0.1不是宿主机。没有`/:id/test`或模型发现接口，不自行猜路径。
- 被历史扫描/执行记录引用时，删除或改harness可能409；新建独立provider解决，不破坏历史引用。

## 错误与核对

400无效ID/请求，404资源不存在，409状态/引用冲突，413过大，422字段校验，500/断连/超时可能已经写入。只修正具体字段；保留用户要求的模型，不静默换provider/effort。未知结果先GET，返回实际状态而非“可能成功”。
