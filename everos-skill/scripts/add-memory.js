#!/usr/bin/env node
/**
 * add-memory.js — 将消息添加到 EverOS 记忆
 *
 * 用法:
 *   node add-memory.js --session-id <id> \
 *     --user-msg "用户消息" --assistant-msg "AI回复" \
 *     [--project-id <id>] [--app-id default] [--server http://localhost:18000]
 *
 *   或使用完整 messages JSON:
 *   node add-memory.js --session-id <id> --messages '[{"sender_id":"user","role":"user","content":"hi"}]'
 *
 *   环境变量:
 *     EVEROS_SERVER    — 替代 --server
 *     EVEROS_PROJECT   — 替代 --project-id
 *     EVEROS_APP       — 替代 --app-id
 */

const SERVER = process.env.EVEROS_SERVER || 'http://localhost:18000';
const API_PATH = '/api/v1/memory/add';

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
用法: node add-memory.js [选项]

选项:
  --server, -s       EverOS 服务器地址 (默认: ${SERVER})
  --session-id       会话 ID (必填)
  --project-id       项目 ID (默认: 当前目录 basename)
  --app-id           App ID (默认: "default")
  --messages, -m     完整的 messages JSON 数组字符串
  --user-msg         用户消息文本 (替代 --messages)
  --assistant-msg    AI 回复文本 (替代 --messages)
  --user-id          用户 sender_id (默认: "user")
  --help, -h         显示帮助

环境变量:
  EVEROS_SERVER      — 替代 --server
  EVEROS_PROJECT     — 替代 --project-id
  EVEROS_APP         — 替代 --app-id

示例:
  node add-memory.js --session-id demo --project-id myapp \\
    --user-msg "你好" --assistant-msg "你好！有什么可以帮你的？"
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
  const appId = opts['app-id'] || opts['app_id'] || process.env.EVEROS_APP || 'default';
  const server = opts.server || SERVER;
  const userId = opts['user-id'] || opts['user_id'] || 'user';

  let messages;
  if (opts.messages) {
    try {
      messages = JSON.parse(opts.messages);
    } catch (e) {
      console.error('错误: --messages 参数不是有效的 JSON:', e.message);
      process.exit(1);
    }
  } else if (opts['user-msg'] || opts['assistant-msg']) {
    const now = Date.now();
    messages = [];
    if (opts['user-msg']) {
      messages.push({
        sender_id: userId,
        role: 'user',
        timestamp: now,
        content: opts['user-msg']
      });
    }
    if (opts['assistant-msg']) {
      messages.push({
        sender_id: 'assistant',
        role: 'assistant',
        timestamp: now + 1,
        content: opts['assistant-msg']
      });
    }
  } else {
    console.error('错误: 请提供 --messages 或 --user-msg/--assistant-msg');
    process.exit(1);
  }

  const url = `${server.replace(/\/+$/, '')}${API_PATH}`;
  const body = {
    session_id: sessionId,
    app_id: appId,
    project_id: projectId,
    messages
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
