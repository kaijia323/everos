#!/usr/bin/env node
/**
 * get-memory.js — 获取 EverOS 详细记忆
 *
 * 用法:
 *   node get-memory.js --user-id <id> \
 *     [--project-id <id>] [--app-id default] [--server http://localhost:18000] \
 *     [--memory-type episode|profile|agent_case|agent_skill] [--page 1] [--page-size 10]
 *
 * 环境变量:
 *     EVEROS_SERVER    — 替代 --server
 *     EVEROS_PROJECT   — 替代 --project-id
 */

const SERVER = process.env.EVEROS_SERVER || 'http://localhost:18000';
const API_PATH = '/api/v1/memory/get';

function getCwdBasename() {
  try {
    return require('path').basename(process.cwd());
  } catch {
    return 'default';
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (key === '--help' || key === '-h') {
      opts.help = true;
      continue;
    }
    if (key.startsWith('--') || key.startsWith('-')) {
      const cleanKey = key.replace(/^--?/, '');
      const next = args[i + 1];
      if (next && !next.startsWith('-')) {
        opts[cleanKey] = next;
        i++;
      } else {
        opts[cleanKey] = true;
      }
    }
  }
  return opts;
}

function printHelp() {
  console.log(`
用法: node get-memory.js [选项]

选项:
  --server, -s        EverOS 服务器地址 (默认: ${SERVER})
  --user-id, -u       用户 ID (必填)
  --project-id        项目 ID (默认: 当前目录 basename)
  --app-id            App ID (默认: "default")
  --memory-type        记忆类型: episode, profile, agent_case, agent_skill (默认: "episode")
  --page              页码 (默认: 1)
  --page-size         每页条数 (默认: 10)
  --help, -h          显示帮助

环境变量:
  EVEROS_SERVER       — 替代 --server
  EVEROS_PROJECT      — 替代 --project-id

示例:
  node get-memory.js --user-id user --project-id myapp --memory-type episode --page 1 --page-size 10
`);
}

async function main() {
  const opts = parseArgs();

  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  const userId = opts['user-id'] || opts['user_id'] || opts.u;
  if (!userId) {
    console.error('错误: --user-id 是必填参数');
    process.exit(1);
  }

  const projectId = opts['project-id'] || opts['project_id'] || process.env.EVEROS_PROJECT || getCwdBasename();
  const appId = opts['app-id'] || opts['app_id'] || 'default';
  const server = opts.server || SERVER;
  const memoryType = opts['memory-type'] || opts['memory_type'] || 'episode';
  const page = parseInt(opts.page || '1', 10);
  const pageSize = parseInt(opts['page-size'] || opts['page_size'] || '10', 10);

  const validTypes = ['episode', 'profile', 'agent_case', 'agent_skill'];
  if (!validTypes.includes(memoryType)) {
    console.error(`错误: 无效的 memory-type "${memoryType}"。有效值: ${validTypes.join(', ')}`);
    process.exit(1);
  }

  const url = `${server.replace(/\/+$/, '')}${API_PATH}`;
  const body = {
    user_id: userId,
    app_id: appId,
    project_id: projectId,
    memory_type: memoryType,
    page,
    page_size: pageSize
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`错误: HTTP ${response.status}`);
      console.error(JSON.stringify(data, null, 2));
      process.exit(1);
    }

    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`错误: 请求失败 — ${err.message}`);
    process.exit(1);
  }
}

main();
