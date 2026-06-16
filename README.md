# EverOS

**md-first Memory Extraction Framework** — 基于 LLM 的记忆提取与知识管理框架。

EverOS 以 Markdown 文件为核心存储格式，通过 LLM 自动从对话、文档等内容中提取结构化记忆，支持语义搜索和召回。

## 特性

- **Markdown 原生** — 记忆以 `.md` 文件存储，人类可读、可直接编辑
- **LLM 驱动的提取** — 自动从对话和文档中提取关键信息，构建结构化记忆
- **多模态支持** — 处理图片、PDF、音频等多模态内容
- **语义搜索** — 基于 Embedding + Rerank 的精准召回
- **REST API** — 提供 HTTP API，方便集成到任何应用
- **Docker 一键部署** — 本仓库即开即用

## 快速开始

```bash
# 1. 复制环境变量模板并编辑
cp .env.example .env
# 编辑 .env，填入你的 LLM API Key 等配置（openai/openrouter 等均可）

# 2. 启动服务
docker compose up -d

# 3. 查看日志
docker compose logs -f
```

服务启动后，访问 `http://localhost:18000`。

## 配置说明

编辑 `.env` 文件（**不要提交到版本控制**），主要配置项：

| 配置 | 说明 | 默认值 |
|---|---|---|
| `EVEROS_LLM__MODEL` | 对话模型 | `openai/gpt-4.1-mini` |
| `EVEROS_LLM__API_KEY` | API Key | — |
| `EVEROS_LLM__BASE_URL` | API 地址 | `https://openrouter.ai/api/v1` |
| `EVEROS_EMBEDDING__MODEL` | 嵌入模型 | `Qwen/Qwen3-Embedding-4B` |
| `EVEROS_RERANK__MODEL` | 重排序模型 | `Qwen/Qwen3-Reranker-4B` |
| `EVEROS_MEMORY__ROOT` | 数据存储路径 | `/app/.everos` |

完整配置项参考 `.env.example`。

## 常用命令

```bash
docker compose up -d          # 启动
docker compose down           # 停止
docker compose restart        # 重启
docker compose logs -f        # 查看实时日志
docker compose up -d --build  # 重新构建并启动
```

## 数据持久化

数据存储在 `./data/` 目录，对应容器内 `EVEROS_MEMORY__ROOT` 路径（默认 `/app/.everos`）。包含 Markdown 记忆文件、LanceDB 索引和 SQLite 数据库。删除容器不会丢失数据。

## 辅助脚本

`everos-skill/scripts/` 目录提供了一些 Node.js 工具脚本，方便与 EverOS API 交互：

| 脚本 | 功能 |
|---|---|
| `add-memory.js` | 向会话添加记忆 |
| `search-memory.js` | 搜索记忆 |
| `get-memory.js` | 获取指定记忆 |
| `flush-memory.js` | 刷新/持久化记忆 |

## 升级

```bash
docker compose pull           # 拉取最新镜像
docker compose up -d --build  # 重建容器
```
