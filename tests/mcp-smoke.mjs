import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';

const repo = path.resolve(import.meta.dirname, '..');
const server = path.join(repo, 'plugins/life-agent/server/server.mjs');

function startServer() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'life-agent-test-'));
  const child = spawn(process.execPath, [server], { env: { ...process.env, PLUGIN_DATA: dataDir }, stdio: ['pipe', 'pipe', 'pipe'] });
  const rl = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
  const pending = new Map();
  const errors = [];
  child.stderr.on('data', chunk => errors.push(String(chunk)));
  rl.on('line', line => {
    const message = JSON.parse(line);
    const resolve = pending.get(message.id);
    if (resolve) { pending.delete(message.id); resolve(message); }
  });
  let nextId = 1;
  function request(method, params = {}) {
    const id = nextId++;
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
    return new Promise(resolve => pending.set(id, resolve));
  }
  return { child, dataDir, errors, request, close: () => { child.kill('SIGTERM'); fs.rmSync(dataDir, { recursive: true, force: true }); } };
}

const resourceUris = [
  'ui://life-agent/choices-v2.html',
  'ui://life-agent/commitment-v2.html',
  'ui://life-agent/handoff-v2.html',
  'ui://life-agent/execution-v2.html',
  'ui://life-agent/outcome-v2.html',
  'ui://life-agent/settings-v2.html',
  'ui://life-agent/capability-route-v2.html',
];
const uiToolNames = [
  'life_show_choices', 'life_show_commitment', 'life_show_handoff', 'life_show_execution',
  'life_show_outcome', 'life_show_settings', 'life_show_capability_route',
];

const legacy = startServer();
try {
  const init = await legacy.request('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'smoke', version: '1' } });
  assert.equal(init.result.protocolVersion, '2025-11-25');
  assert.equal(init.result.serverInfo.name, 'life-agent-ui');

  const list = await legacy.request('tools/list');
  const names = list.result.tools.map(tool => tool.name);
  assert.equal(list.result.tools.filter(tool => tool._meta?.ui?.resourceUri).length, 7);
  for (const expected of [...uiToolNames, 'life_state_read', 'life_state_update', 'life_asset_resolve']) assert.ok(names.includes(expected));
  assert.equal(names.includes('life_asset_cache_status'), false);
  assert.equal(names.includes('life_asset_cache_clear_stale'), false);
  assert.equal(names.includes('life_asset_status'), false);
  assert.equal(names.includes('life_asset_clear'), false);
  assert.equal(new Set(uiToolNames.map(name => list.result.tools.find(tool => tool.name === name)._meta.ui.resourceUri)).size, 7);

  const resources = await legacy.request('resources/list');
  assert.deepEqual(resources.result.resources.map(resource => resource.uri), resourceUris);
  for (const resource of resources.result.resources) {
    const read = await legacy.request('resources/read', { uri: resource.uri });
    const html = read.result.contents[0].text;
    assert.equal(read.result.contents[0].mimeType, 'text/html;profile=mcp-app');
    assert.match(html, /text\/html;profile=mcp-app/);
    assert.match(html, /ui\/initialize/);
    assert.match(html, /ui\/update-model-context/);
    assert.match(html, /ui\/message/);
    assert.match(html, /ui\/teardown/);
    assert.match(html, /2026-01-26/);
    assert.doesNotMatch(html, /toolInput/);
    assert.doesNotMatch(html, /https?:\/\//);
    assert.doesNotMatch(html, /\bfetch\s*\(/);
    assert.doesNotMatch(html, /\bWebSocket\b|localStorage|document\.cookie|<base\b/i);
  }

  const read = await legacy.request('tools/call', { name: 'life_state_read', arguments: {} });
  assert.match(read.result.content[0].text, /# Life Agent State/);
  const updated = await legacy.request('tools/call', { name: 'life_state_update', arguments: { content: '# Life Agent State\n\n- Prefer nonstop flights.\n', reason: 'smoke' } });
  assert.equal(updated.result.structuredContent.updated, true);
  assert.match(fs.readFileSync(path.join(legacy.dataDir, 'LIFE.md'), 'utf8'), /Prefer nonstop flights/);
  assert.equal(fs.existsSync(path.join(legacy.dataDir, 'assets')), false);

  const choices = await legacy.request('tools/call', { name: 'life_show_choices', arguments: { title: 'Flights', options: [{ id: 'as421', title: 'Alaska 421', provider: 'Alaska', recommended: true }] } });
  assert.equal(choices.result.structuredContent.surface, 'choices');
  assert.equal(choices.result.structuredContent.options[0].title, 'Alaska 421');
  const commitment = await legacy.request('tools/call', { name: 'life_show_commitment', arguments: { title: 'Ready to book', selected: { label: 'Alaska 421' }, consequences: [{ label: 'Calendar', detail: 'Add the itinerary' }], approval: { label: 'Payment confirmation only' } } });
  assert.equal(commitment.result.structuredContent.surface, 'commitment');
  assert.equal(commitment.result.structuredContent.selected.label, 'Alaska 421');
  const outcome = await legacy.request('tools/call', { name: 'life_show_outcome', arguments: { title: 'Booked', status: 'completed', receipt: { label: 'Verified booking', detail: 'Confirmation received' } } });
  assert.equal(outcome.result.structuredContent.surface, 'outcome');
  assert.equal(outcome.result._meta.ui.resourceUri, 'ui://life-agent/outcome-v2.html');
  const unsafe = await legacy.request('tools/call', { name: 'life_show_choices', arguments: { title: 'No leak', options: [{ id: 'x', title: 'x' }], access_token: 'never' } });
  assert.equal(unsafe.error.code, -32000);
  const asset = await legacy.request('tools/call', { name: 'life_asset_resolve', arguments: { kind: 'brand', brandName: 'North & Pine' } });
  assert.equal(asset.result.structuredContent.status, 'fallback');
  assert.equal(asset.result.structuredContent.fallback, 'NP');
  const assetSchema = list.result.tools.find(tool => tool.name === 'life_asset_resolve').inputSchema;
  assert.equal(Object.hasOwn(assetSchema.properties, 'url'), false);
  assert.equal(Object.hasOwn(assetSchema.properties, 'domain'), false);
  const method = await legacy.request('prompts/list');
  assert.equal(method.error.code, -32601);
} finally {
  legacy.close();
}

const modern = startServer();
try {
  const init = await modern.request('initialize', { protocolVersion: '2026-07-28', capabilities: {}, clientInfo: { name: 'modern-smoke', version: '1' } });
  assert.equal(init.result.protocolVersion, '2026-07-28');
  assert.equal(init.result.resultType, 'initialize');
  assert.equal(init.result.ttlMs, 0);
  assert.equal(init.result.cacheScope, 'private');
  const discovery = await modern.request('server/discover');
  assert.equal(discovery.result.resultType, 'server-discover');
  assert.deepEqual(discovery.result.supportedVersions, ['2026-07-28', '2025-11-25']);
  assert.equal(discovery.result.apps.protocolVersion, '2026-01-26');
  const tools = await modern.request('tools/list');
  assert.equal(tools.result.resultType, 'tools-list');
  assert.equal(tools.result.ttlMs, 0);
  const resources = await modern.request('resources/list');
  assert.equal(resources.result.resultType, 'resources-list');
  const read = await modern.request('resources/read', { uri: resourceUris[1] });
  assert.equal(read.result.resultType, 'resource-read');
  const call = await modern.request('tools/call', { name: 'life_show_outcome', arguments: { title: 'Done', status: 'completed', receipt: { label: 'Verified' } } });
  assert.equal(call.result.resultType, 'tool-call');
  assert.equal(call.result.ttlMs, 0);
  assert.equal(call.result.cacheScope, 'none');
} finally {
  modern.close();
}

console.log('Life Agent MCP Apps and dual-protocol smoke tests passed.');
