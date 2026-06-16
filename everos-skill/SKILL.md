---
name: everos
description: |
  将当前 AI 会话与本地 EverOS 记忆服务器集成，实现持久化、跨会话的记忆能力。
  当用户提到记忆、记住过去的上下文、用户偏好、持久化存储、"everos"、"evermind"，
  或者当代理处于长期/重复对话中需要记住之前的交互时，请使用此 skill。
  这个 skill 对跨多轮的助手会话尤其重要 — 它确保助手能记住用户是谁、
  讨论过什么、做了什么决定，即使是在完全不同的会话之间。
---

# EverOS 记忆 Skill

本 skill 将当前代理会话与本地 **EverOS** (EverMind) 记忆服务器集成。它在每一轮对话中执行
EverOS 文档推荐的标准代理循环：**搜索 → 生成回复 → 添加 → 刷新**，让代理拥有跨会话的
持久化结构化记忆。

## 工作原理

EverOS 是一个面向 AI Agent 的记忆操作系统。它将对话存储为结构化的 **MemCells**（情景摘要 +
原子事实 + 用户画像属性），并使用混合搜索智能检索。这个 skill 让代理能够记住用户、
过去的决策、偏好和上下文 — 即使在完全不同的会话之间也能做到。

### 每轮循环（每轮对话都执行）

1. **搜索** — 回复之前，先在 EverOS 中搜索与当前用户消息相关的记忆信息。
   将搜索到的摘要和画像属性作为生成回复的上下文。
2. **生成回复** — 使用记忆上下文（如果有的话）生成你的回复。
3. **添加** — 回复之后，将用户消息和你的回复保存到 EverOS。
4. **刷新** — 触发记忆提取，使新信息被处理并在下次可用。

> **为什么需要刷新？** EverOS 默认异步处理消息。调用 `/flush` 可以立即触发提取，
> 保证搜索结果是最新的。不调用的线，新记忆可能要等到服务器的后台调度才能被检索到。

## 配置

### 服务器地址

EverOS OSS 服务运行在本地。所有 API 调用使用以下地址：

```
http://localhost:18000
```

### 项目 ID (project_id)

`project_id` 参数用于隔离不同项目的记忆空间。

**默认值：** 使用当前工作目录的 basename 作为 `project_id`。
Node.js 脚本会自动从 `process.cwd()` 派生此值，无需手动指定。

### 应用 ID (app_id)

默认使用 `"default"`，除非用户指定其他值。可通过 `--app-id` 参数或 `EVEROS_APP` 环境变量覆盖。

### 会话 ID (session_id)

使用一致的 `session_id` 来标识当前对话会话。这有助于将相关交互分组在一起。
合理的默认做法是使用工作区或聊天标识符。如果没有可用的，可以生成一个并在整个会话中复用。

## Node.js 脚本工具

本 skill 提供了四个 Node.js 脚本，封装了 EverOS 的 API 调用。这些脚本使用 Node.js 内置的
`fetch`（无需额外依赖），输出 JSON 供代理解析使用。

脚本位于本 skill 目录下的 `scripts/` 子目录中。为方便引用，定义变量：

```
SCRIPTS_DIR=/home/kaijia/.reasonix/skills/everos/scripts
```

> 你也可以将 `$SCRIPTS_DIR` 添加到 `PATH` 中，或从项目根目录使用相对路径
> `everos-skill/scripts/<script>.js`。

### 脚本一览

| 脚本 | 功能 | 对应 API |
|------|------|----------|
| `add-memory.js` | 添加消息到记忆 | `POST /api/v1/memory/add` |
| `search-memory.js` | 搜索相关记忆 | `POST /api/v1/memory/search` |
| `flush-memory.js` | 强制提取记忆 | `POST /api/v1/memory/flush` |
| `get-memory.js` | 获取详细记忆 | `POST /api/v1/memory/get` |

所有脚本支持 `--help` 查看详细用法，支持以下环境变量覆盖默认值：

- `EVEROS_SERVER` — 替代 `--server`（默认 `http://localhost:18000`）
- `EVEROS_PROJECT` — 替代 `--project-id`（默认当前目录 basename）
- `EVEROS_APP` — 替代 `--app-id`（默认 `"default"`）

## API 接口

所有接口都在 `http://localhost:18000` 下。OSS API 使用 `/api/v1/memory/`（单数形式）路径前缀。

### 1. 搜索记忆 — 生成回复前

**目的：** 在回复用户之前，检索相关的历史上下文。

**脚本：** `node $SCRIPTS_DIR/search-memory.js`

```
POST http://localhost:18000/api/v1/memory/search
Content-Type: application/json

{
  "user_id": "<当前用户的 sender_id>",
  "app_id": "default",
  "project_id": "<从当前目录派生>",
  "query": "<用户当前的消息或关键主题>",
  "method": "hybrid",
  "top_k": 5
}
```

**响应包含：**
- `episodes[]` — 每项包含 `.episode`（完整叙述）和 `.summary`（简短摘要）
- `profiles[]` — 每项包含 `.profile_data`（用户属性和偏好）
- `agent_cases[]`, `agent_skills[]`

> **如果 hybrid 搜索失败**（某些 OSS 配置可能没有配置嵌入模型），回退到
> `method: "keyword"` 使用 BM25 搜索。

**如何使用搜索结果：** 如果 `episodes` 或 `profiles` 不为空，将相关信息注入到回复生成
的上下文中。

> **为什么这很重要：** 没有这一步，每次会话都从白板开始，用户不得不重复自己说过的话。
> 有了这一步，你可以像人类一样，从上次停下的地方无缝继续。

### 2. 添加消息 — 生成回复后

**目的：** 保存当前对话轮次，以便未来检索。

**脚本：** `node $SCRIPTS_DIR/add-memory.js`

```
POST http://localhost:18000/api/v1/memory/add
Content-Type: application/json

{
  "session_id": "<当前会话 ID>",
  "app_id": "default",
  "project_id": "<从当前目录派生>",
  "messages": [
    {
      "sender_id": "<用户标识符>",
      "role": "user",
      "timestamp": <当前 Unix 毫秒时间戳>,
      "content": "<用户的消息>"
    },
    {
      "sender_id": "assistant",
      "role": "assistant",
      "timestamp": <当前 Unix 毫秒时间戳 + 1>,
      "content": "<你的回复>"
    }
  ]
}
```

**重要字段说明：**
- `sender_id` — 标识谁发送了消息。用户消息用用户的标识符，AI 回复用 `"assistant"`。
- `role` — `"user"` 或 `"assistant"`。
- `timestamp` — Unix 毫秒时间戳。使用当前时间。
- `content` — 消息文本。

### 3. 刷新 — 添加消息后

**目的：** 强制 EverOS 处理并提取已累积消息中的记忆。

**脚本：** `node $SCRIPTS_DIR/flush-memory.js`

```
POST http://localhost:18000/api/v1/memory/flush
Content-Type: application/json

{
  "session_id": "<当前会话 ID>",
  "app_id": "default",
  "project_id": "<从当前目录派生>"
}
```

**响应状态值：**
- `"extracted"` — 记忆提取已触发并完成
- `"no_extraction"` — 未检测到语义边界（未创建新 episode）

> **何时可以跳过刷新：** 如果对话非常快速（每秒多轮），可以累积多次 Add 后再调用一次
> Flush。但在正常对话中，建议每轮都刷新。

### 4. 获取记忆 — 深度检索

**目的：** 当你需要比搜索更详细的上下文时，检索指定用户的详细记忆。

**脚本：** `node $SCRIPTS_DIR/get-memory.js`

```
POST http://localhost:18000/api/v1/memory/get
Content-Type: application/json

{
  "user_id": "<sender_id>",
  "app_id": "default",
  "project_id": "<从当前目录派生>",
  "memory_type": "episode",
  "page": 1,
  "page_size": 10
}
```

**有效的 memory_type 值：** `"episode"`, `"profile"`, `"agent_case"`, `"agent_skill"`

## 使用流程

### 每次用户交互时，执行以下步骤：

```
1. 确定 project_id：  当前工作目录的 basename（脚本自动派生）
2. 确定 session_id：  一个一致的会话标识符
3. 确定 user_id：     用户的标识符（未知时默认用 "user"）
4. 搜索 → node search-memory.js --user-id <id> --query "<用户消息>"
5. 如果找到记忆，将其作为回复的上下文
6. 生成回复
7. 添加 → node add-memory.js --session-id <id> --user-msg "..." --assistant-msg "..."
8. 刷新 → node flush-memory.js --session-id <id>
```

### 首次使用（无历史上下文）：

如果是新用户或新项目，搜索会返回空结果。这没关系 — 直接在没有记忆上下文的情况下正常回复。
第一次 Add + Flush 会创建初始记忆。

### 错误处理：

- **服务器不可达**（`Connection refused`）：优雅地跳过所有记忆步骤，正常进行对话。
  记录一条 EverOS 不可用的日志。
- **API 错误**（非 2xx 状态码）：记录错误后继续。记忆操作失败永远不应阻塞对话。
- **Hybrid 搜索失败**：重试时使用 `method: "keyword"`（`--method keyword`）。

## 完整示例

**用户说：** "还记得我上次说的项目计划吗？"

**你的内部步骤：**

```bash
# 1. 搜索相关记忆
node /home/kaijia/.reasonix/skills/everos/scripts/search-memory.js \
  --user-id user \
  --project-id my-app \
  --query "项目计划" \
  --method hybrid \
  --top-k 5
```

```json
// 响应示例：
{
  "data": {
    "episodes": [
      {
        "episode": "用户和我讨论了Q3营销活动的计划，重点放在社交媒体渠道上。用户是市场经理，预算审批需要在周五前完成。",
        "summary": "Q3营销活动计划讨论"
      }
    ],
    "profiles": [
      {
        "profile_data": {
          "explicit_info": {"role": "Marketing Manager"},
          "implicit_traits": ["prefers detailed planning", "deadline-conscious"]
        }
      }
    ]
  }
}
```

```bash
# 2. 使用记忆上下文生成回复
#（将 episode 摘要和 profile 信息融入你的思考）

# 3. 添加对话轮次
node /home/kaijia/.reasonix/skills/everos/scripts/add-memory.js \
  --session-id current-session \
  --project-id my-app \
  --user-id user \
  --user-msg "还记得我上次说的项目计划吗？" \
  --assistant-msg "当然！我们上次讨论了Q3营销活动计划，重点放在社交媒体渠道上。作为市场经理，你的预算审批需要在周五前完成。这次我们可以继续深入讨论具体执行方案。"

# 4. 刷新
node /home/kaijia/.reasonix/skills/everos/scripts/flush-memory.js \
  --session-id current-session \
  --project-id my-app
```

## 脚本详细用法速查

### add-memory.js

```bash
# 简单双消息（用户+AI）
node $SCRIPTS_DIR/add-memory.js \
  --session-id "session-123" \
  --project-id "my-app" \
  --user-msg "你好" \
  --assistant-msg "你好！有什么可以帮你的？"

# 使用完整 JSON（支持 tool_calls 等复杂场景）
node $SCRIPTS_DIR/add-memory.js \
  --session-id "session-123" \
  --project-id "my-app" \
  --messages '[...]'

# 通过环境变量配置服务器
EVEROS_SERVER=http://localhost:18000 \
  node $SCRIPTS_DIR/add-memory.js \
  --session-id "session-123" \
  --user-msg "test" --assistant-msg "ok"
```

### search-memory.js

```bash
# 混合搜索（默认）
node $SCRIPTS_DIR/search-memory.js \
  --user-id "user" \
  --query "项目计划" \
  --project-id "my-app" \
  --method hybrid \
  --top-k 5

# 关键词搜索回退（当 hybrid 失败时）
node $SCRIPTS_DIR/search-memory.js \
  --user-id "user" \
  --query "项目计划" \
  --method keyword
```

### flush-memory.js

```bash
node $SCRIPTS_DIR/flush-memory.js \
  --session-id "session-123" \
  --project-id "my-app"
```

### get-memory.js

```bash
# 获取情景记忆
node $SCRIPTS_DIR/get-memory.js \
  --user-id "user" \
  --project-id "my-app" \
  --memory-type episode \
  --page 1 --page-size 10

# 获取用户画像
node $SCRIPTS_DIR/get-memory.js \
  --user-id "user" \
  --memory-type profile
```

## 重要提示

- **永远不要让记忆操作阻塞对话。** 如果 EverOS 宕机，直接跳过，正常回复。
- **动态派生 project_id**，在会话开始时从工作目录获取（脚本默认行为）。
- **在整个会话中使用一致的 user_id 和 session_id**，以保证记忆分组的连贯性。
- **优先使用 profile 信息** — 当可用时，用户画像比情景摘要更有实用价值，
  因为它直接告诉你用户的偏好。
- **如果你不确定用户的标识符**，使用 `"user"` 作为合理的默认值。
- **脚本输出 JSON**，如果你需要提取特定字段，可以用 `node script.js ... | jq '.data'` 或
  在代码中解析。脚本退出码非零表示出错。
