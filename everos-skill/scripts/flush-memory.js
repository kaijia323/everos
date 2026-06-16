#!/usr/bin/env node
/**
 * flush-memory.js — 刷新 EverOS 记忆（触发提取）
 *
 * 用法:
 *   node flush-memory.js --session-id <id> \
 *     [--project-id <id>] [--app-id default] [--server http://localhost:18000]
 *
 * 环境变量:
 *     EVEROS_SERVER    — 替代 --server
 *     EVEROS_PROJECT   — 替代 --project-id
 */

const SERVER = process.env.EVEROS_SERVER || 'http://localhost:18000';
const API_PATH = '/api/v1/memory/flush';

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
用法: node flush-memory.js [选项]

选项:
  --server, -s       EverOS 服务器地址 (默认: ${SERVER})
  --session-id       会话 ID (必填)
  --project-id       项目 ID (默认: 当前目录 basename)
  --app-id           App ID (默认: "default")
  --help, -h         显示帮助

环境变量:
  EVEROS_SERVER      — 替代 --server
  EVEROS_PROJECT     — 替代 --project-id

示例:
  node flush-memory.js --session-id demo --project-id myapp
`);
}

async function main() {
  const opts = parseArgs();

  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  const sessionId = opts['session-id'] || opts['session_id'];
  if (!sessionId) {
    console.error('错误: --session-id 是必填参数');
    process.exit(1);
  }

  const projectId = opts['project-id'] || opts['project_id'] || process.env.EVEROS_PROJECT || getCwdBasename();
  const appId = opts['app-id'] || opts['app_id'] || 'default';
  const server = opts.server || SERVER;

  const url = `${server.replace(/\/+$/, '')}${API_PATH}`;
  const body = {
    session_id: sessionId,
    app_id: appId,
    project_id: projectId
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
