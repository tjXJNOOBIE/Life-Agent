import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';

const repo = path.resolve(import.meta.dirname, '..');
const server = path.join(repo, 'plugins/life-agent/server/server.mjs');
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'life-agent-test-'));
const child = spawn(process.execPath, [server], { env: { ...process.env, PLUGIN_DATA: dataDir }, stdio: ['pipe', 'pipe', 'pipe'] });
const rl = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
const pending = new Map();
rl.on('line', line => { const msg = JSON.parse(line); const resolve = pending.get(msg.id); if (resolve) { pending.delete(msg.id); resolve(msg); } });
let nextId = 1;
function request(method, params = {}) {
  const id = nextId++;
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  return new Promise(resolve => pending.set(id, resolve));
}

try {
  const init = await request('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'smoke', version: '1' } });
  assert.equal(init.result.serverInfo.name, 'life-agent-ui');

  const list = await request('tools/list');
  const names = list.result.tools.map(tool => tool.name);
  for (const expected of [
    'life_show_execution',
    'life_show_choices',
    'life_show_capability_route',
    'life_state_read',
    'life_state_update',
    'life_asset_resolve',
    'life_asset_cache_status',
    'life_asset_cache_clear_stale',
  ]) assert.ok(names.includes(expected));

  const read = await request('tools/call', { name: 'life_state_read', arguments: {} });
  assert.match(read.result.content[0].text, /# Life Agent State/);

  const updated = read.result.content[0].text.replace('- None learned yet.', '- Prefer nonstop flights.');
  const write = await request('tools/call', { name: 'life_state_update', arguments: { content: updated, reason: 'smoke test' } });
  assert.equal(write.result.structuredContent.updated, true);
  assert.match(fs.readFileSync(path.join(dataDir, 'LIFE.md'), 'utf8'), /Prefer nonstop flights/);

  const fallbackAsset = await request('tools/call', {
    name: 'life_asset_resolve',
    arguments: { kind: 'brand', brandName: 'North & Pine' },
  });
  assert.equal(fallbackAsset.result.structuredContent.status, 'fallback');
  assert.equal(fallbackAsset.result.structuredContent.fallback, 'NP');

  const cacheStatus = await request('tools/call', { name: 'life_asset_cache_status', arguments: {} });
  assert.equal(cacheStatus.result.structuredContent.entries, 0);

  const resources = await request('resources/list');
  assert.equal(resources.result.resources.length, 3);
  for (const resource of resources.result.resources) {
    const resourceRead = await request('resources/read', { uri: resource.uri });
    assert.equal(resourceRead.result.contents[0].mimeType, 'text/html;profile=mcp-app');
    assert.match(resourceRead.result.contents[0].text, /Life Agent/);
  }

  const rendered = await request('tools/call', { name: 'life_show_execution', arguments: { title: 'Smoke test', status: 'completed', steps: [{ label: 'Run', status: 'done', provider: 'test' }] } });
  assert.equal(rendered.result.structuredContent.status, 'completed');

  console.log('Life Agent MCP smoke test passed.');
} finally {
  child.kill('SIGTERM');
  fs.rmSync(dataDir, { recursive: true, force: true });
}
