/**
 * Local MCP bridge / tool router.
 *
 * Usage:
 *   node scripts/mcp-bridge.mjs list
 *   node scripts/mcp-bridge.mjs tools hyper3d
 *   node scripts/mcp-bridge.mjs call tripo tripo_balance
 *   node scripts/mcp-bridge.mjs call hyper3d rodin_get_status '{"generation_id":"..."}'
 *
 * Stdio servers are spawned on demand. Hyper3D uses the OAuth token saved by
 * the Hyper3D CLI in ~/.hyper3d. Tokens and response secrets are never printed.
 */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = process.cwd();
const registryPath = path.join(root, 'tools', 'mcp-servers.json');
const registry = JSON.parse(await fs.readFile(registryPath, 'utf8'));
const command = process.argv[2] || 'list';
const serverName = process.argv[3];
const toolName = process.argv[4];
const argsJson = process.argv[5] || '{}';

function redact(value) {
  return JSON.parse(JSON.stringify(value, (key, val) => {
    if (/url/i.test(key) && typeof val === 'string' && /[?&](X-Tos|q-sign|sig|token|signature)/i.test(val)) {
      return '<redacted signed URL>';
    }
    if (/access_token|refresh_token|api[_-]?key|authorization|secret/i.test(key)) return '<redacted>';
    return val;
  }));
}

async function hyper3dToken() {
  const dir = path.join(os.homedir(), '.hyper3d');
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.json'));
  if (!files.length) throw new Error('No Hyper3D CLI credential found; run: hyper3d auth login');
  // Most recent credential file.
  let best = null;
  for (const file of files) {
    const full = path.join(dir, file);
    const stat = await fs.stat(full);
    if (!best || stat.mtimeMs > best.mtimeMs) best = { full, mtimeMs: stat.mtimeMs };
  }
  const auth = JSON.parse(await fs.readFile(best.full, 'utf8'));
  if (!auth?.tokens?.access_token) throw new Error('Hyper3D token missing');
  return auth.tokens.access_token;
}

function parseSseJson(text) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return JSON.parse(trimmed);
  for (const event of trimmed.split(/\r?\n\r?\n/)) {
    const data = event.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n');
    if (data) {
      try { return JSON.parse(data); } catch {}
    }
  }
  return null;
}

class StdioClient {
  constructor(config) {
    this.config = config;
    this.child = null;
    this.buffer = '';
    this.pending = new Map();
  }

  start() {
    const env = { ...process.env, ...(this.config.env || {}) };
    this.child = spawn(this.config.command, this.config.args || [], {
      cwd: root,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: Boolean(this.config.shell),
    });
    this.child.stdout.on('data', (chunk) => this.onData(chunk.toString()));
    this.child.stderr.on('data', () => {});
    this.child.on('error', (error) => this.rejectAll(error));
  }

  onData(text) {
    this.buffer += text;
    const lines = this.buffer.split(/\r?\n/);
    this.buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.trim()) continue;
      let message;
      try { message = JSON.parse(line); } catch { continue; }
      if (message.id !== undefined && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message || JSON.stringify(message.error)));
        else resolve(message.result);
      }
    }
  }

  request(payload, timeoutMs = 60000) {
    return new Promise((resolve, reject) => {
      const id = payload.id;
      this.pending.set(id, { resolve, reject });
      this.child.stdin.write(`${JSON.stringify(payload)}\n`);
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`MCP request timeout: ${payload.method}`));
        }
      }, timeoutMs).unref();
    });
  }

  rejectAll(error) {
    for (const { reject } of this.pending.values()) reject(error);
    this.pending.clear();
  }

  async initialize() {
    this.start();
    const result = await this.request({
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'dsh-mcp-bridge', version: '1.0' } },
    }, 30000);
    this.child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} })}\n`);
    return result;
  }

  async listTools() {
    const result = await this.request({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }, 30000);
    return result.tools || [];
  }

  async callTool(name, args) {
    return this.request({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name, arguments: args } }, 180000);
  }

  close() {
    try { this.child.kill(); } catch {}
  }
}

class HttpClient {
  constructor(config) {
    this.config = config;
    this.token = null;
  }

  async start() {
    if (this.config.auth === 'hyper3d-cli') this.token = await hyper3dToken();
    else if (process.env.MCP_HTTP_TOKEN) this.token = process.env.MCP_HTTP_TOKEN;
    else throw new Error('No HTTP MCP token configured');
  }

  async rpc(payload, timeoutMs = 180000) {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      Authorization: `Bearer ${this.token}`,
    };
    const res = await fetch(this.config.url, {
      method: 'POST', headers, body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`MCP HTTP ${res.status}: ${text.slice(0, 300)}`);
    return parseSseJson(text);
  }

  async initialize() {
    await this.start();
    const result = await this.rpc({
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'dsh-mcp-bridge', version: '1.0' } },
    }, 30000);
    await this.rpc({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }, 30000).catch(() => null);
    return result;
  }

  async listTools() {
    const result = await this.rpc({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }, 30000);
    return result?.result?.tools || [];
  }

  async callTool(name, args) {
    const result = await this.rpc({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name, arguments: args } }, 180000);
    return result?.result;
  }
}

async function createClient(name) {
  const config = registry.servers[name];
  if (!config) throw new Error(`Unknown MCP server: ${name}`);
  if (config.type === 'stdio') {
    const client = new StdioClient(config);
    await client.initialize();
    return client;
  }
  if (config.type === 'http') {
    const client = new HttpClient(config);
    await client.initialize();
    return client;
  }
  throw new Error(`Unsupported transport: ${config.type}`);
}

if (command === 'list') {
  console.log(JSON.stringify(Object.entries(registry.servers).map(([name, config]) => ({
    name,
    type: config.type,
    url: config.url || null,
    command: config.command || null,
  })), null, 2));
  process.exit(0);
}

if (command === 'tools') {
  if (!serverName) throw new Error('Usage: tools <server>');
  const client = await createClient(serverName);
  const tools = await client.listTools();
  console.log(JSON.stringify(tools.map((tool) => ({ name: tool.name, description: tool.description || '' })), null, 2));
  client.close?.();
  process.exit(0);
}

if (command === 'call') {
  if (!serverName || !toolName) throw new Error('Usage: call <server> <tool> [json]');
  const args = JSON.parse(argsJson);
  const client = await createClient(serverName);
  const result = await client.callTool(toolName, args);
  console.log(JSON.stringify(redact(result), null, 2));
  client.close?.();
  process.exit(0);
}

throw new Error(`Unknown command: ${command}. Use list, tools, call.`);
