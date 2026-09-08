#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { AssetCache } from './assets/asset-cache.mjs';
import { AssetResolver } from './assets/asset-resolver.mjs';

const VERSION = '0.1.0';
const LIFE_DIR = process.env.PLUGIN_DATA || path.join(process.env.HOME || process.cwd(), '.life-agent');
const LIFE_FILE = path.join(LIFE_DIR, 'LIFE.md');
const ASSET_DIR = path.join(LIFE_DIR, 'assets');
const EXECUTION_URI = 'ui://life-agent/execution.html';
const CHOICES_URI = 'ui://life-agent/choices.html';
const ROUTE_URI = 'ui://life-agent/capability-route.html';
const MIME = 'text/html;profile=mcp-app';
const MAX_EMBED_BYTES = 768 * 1024;

const assetCache = new AssetCache({ rootDir: ASSET_DIR });
const assetResolver = new AssetResolver({ cache: assetCache });

const initialLifeState = `# Life Agent State\n\n> User-owned operational memory for Life Agent. Do not store passwords, payment card data, authentication tokens, or secrets here.\n\n## Preferences\n\n- None learned yet.\n\n## Standing Permissions\n\n- None recorded yet.\n\n## People and Channels\n\n- None learned yet.\n\n## Active Context\n\n- None.\n\n## Unresolved Commitments\n\n- None.\n\n## Learned Defaults\n\n- None learned yet.\n`;

function ensureLifeFile() {
  fs.mkdirSync(LIFE_DIR, { recursive: true });
  if (!fs.existsSync(LIFE_FILE)) fs.writeFileSync(LIFE_FILE, initialLifeState, 'utf8');
}

function readLifeState() {
  ensureLifeFile();
  return fs.readFileSync(LIFE_FILE, 'utf8');
}

function writeLifeState(content) {
  if (typeof content !== 'string' || content.trim().length === 0) throw new Error('content must be non-empty markdown');
  ensureLifeFile();
  const temp = `${LIFE_FILE}.tmp-${process.pid}`;
  fs.writeFileSync(temp, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
  fs.renameSync(temp, LIFE_FILE);
}

function styles() {
  return `:root{color-scheme:light dark;--bg:#fff;--panel:#f7f7f5;--line:#e5e5df;--text:#171714;--muted:#6c6b64;--soft:#eeeee8;--accent:#11110f;--good:#16794a;--warn:#9b5b00;--bad:#a62b2b}@media(prefers-color-scheme:dark){:root{--bg:#181817;--panel:#222220;--line:#383834;--text:#f5f5ef;--muted:#aaa99f;--soft:#2d2d29;--accent:#f5f5ef;--good:#67c896;--warn:#e4aa52;--bad:#ef8383}}*{box-sizing:border-box}body{margin:0;background:transparent;color:var(--text);font:14px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.shell{border:1px solid var(--line);border-radius:18px;background:var(--bg);overflow:hidden}.head{padding:18px 18px 14px;display:flex;gap:14px;align-items:flex-start;justify-content:space-between;border-bottom:1px solid var(--line)}.eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.11em;color:var(--muted);font-weight:750}.title{font-size:18px;line-height:1.2;font-weight:760;margin-top:4px}.sub{color:var(--muted);margin-top:5px;max-width:62ch}.badge{font-size:11px;font-weight:730;padding:6px 9px;border-radius:999px;background:var(--soft);white-space:nowrap}.body{padding:14px 18px 18px}.section{margin-top:14px}.section:first-child{margin-top:0}.section-title{font-size:11px;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);font-weight:750;margin-bottom:8px}.row{display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-top:1px solid var(--line)}.row:first-child{border-top:0}.dot{width:9px;height:9px;border-radius:99px;margin-top:5px;background:var(--muted);flex:0 0 auto}.dot.done{background:var(--good)}.dot.active{background:var(--accent);box-shadow:0 0 0 4px var(--soft)}.dot.waiting{background:var(--warn)}.dot.blocked{background:var(--bad)}.grow{min-width:0;flex:1}.label{font-weight:680}.meta{font-size:12px;color:var(--muted);margin-top:2px}.provider{font-size:11px;border:1px solid var(--line);border-radius:7px;padding:2px 6px;color:var(--muted);white-space:nowrap}.callout{border:1px solid var(--line);border-radius:13px;background:var(--panel);padding:12px 13px}.callout strong{display:block;margin-bottom:3px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:9px}.chip{border:1px solid var(--line);border-radius:12px;padding:10px}.chip b{display:block;font-size:13px}.chip span{font-size:12px;color:var(--muted)}a.action{border:0;border-radius:10px;background:var(--accent);color:var(--bg);padding:9px 11px;font-weight:720;text-decoration:none;display:inline-flex}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}`;
}

function bridge() {
  return `const getData=()=>window.openai?.toolOutput||window.openai?.toolInput||{};const rerender=()=>window.render(getData());if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',rerender);else rerender();window.addEventListener('message',()=>setTimeout(rerender,0));`;
}

const executionHtml = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${styles()}</style></head><body><div id="app"></div><script>const $=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!==undefined)e.textContent=String(x);return e};window.render=(d={})=>{const a=document.getElementById('app');a.replaceChildren();const s=$('div','shell'),h=$('div','head'),l=$('div');l.append($('div','eyebrow','Life Agent · execution'),$('div','title',d.title||d.outcome||'Working on it'));if(d.summary)l.append($('div','sub',d.summary));h.append(l,$('div','badge',String(d.status||'active').replaceAll('_',' ')));s.append(h);const b=$('div','body');if((d.steps||[]).length){const q=$('div','section');q.append($('div','section-title','Execution'));for(const x of d.steps){const r=$('div','row');r.append($('div','dot '+(x.status||'pending')));const g=$('div','grow');g.append($('div','label',x.label||'Step'));if(x.detail)g.append($('div','meta',x.detail));r.append(g);if(x.provider)r.append($('div','provider',x.provider));q.append(r)}b.append(q)}if(d.handoff){const q=$('div','section');q.append($('div','section-title','Needs you'));const c=$('div','callout');c.append($('strong','',d.handoff.label||'Continue'));if(d.handoff.reason)c.append($('div','meta',d.handoff.reason));if(d.handoff.url){const z=$('div','actions'),u=$('a','action','Open');u.href=d.handoff.url;u.target='_blank';u.rel='noreferrer';z.append(u);c.append(z)}q.append(c);b.append(q)}if((d.followUps||[]).length){const q=$('div','section'),g=$('div','grid');q.append($('div','section-title','What this created'));for(const x of d.followUps){const c=$('div','chip');c.append($('b','',x.label||'Follow-up'),$('span','',[x.status||'',x.provider||''].filter(Boolean).join(' · ')));g.append(c)}q.append(g);b.append(q)}s.append(b);a.append(s)};${bridge()}</script></body></html>`;

const choicesHtml = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${styles()}.deck{display:flex;gap:10px;overflow-x:auto;padding:14px 18px 18px}.option{min-width:220px;max-width:290px;flex:1 0 220px;border:1px solid var(--line);border-radius:15px;padding:14px}.option.recommended{box-shadow:inset 0 0 0 1px var(--accent)}.kicker{font-size:11px;color:var(--muted);font-weight:720}.price{font-size:20px;font-weight:780;margin-top:8px}.facts{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.fact{font-size:11px;background:var(--soft);padding:4px 7px;border-radius:8px}.reason{font-size:12px;color:var(--muted);margin-top:10px}</style></head><body><div id="app"></div><script>const $=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!==undefined)e.textContent=String(x);return e};window.render=(d={})=>{const a=document.getElementById('app');a.replaceChildren();const s=$('div','shell'),h=$('div','head'),l=$('div');l.append($('div','eyebrow','Life Agent · choice'),$('div','title',d.title||'Choose one'));if(d.summary)l.append($('div','sub',d.summary));h.append(l);s.append(h);const k=$('div','deck');for(const [i,o] of (d.options||[]).entries()){const c=$('div','option'+(o.recommended?' recommended':''));c.append($('div','kicker',o.recommended?'Recommended':'Option '+(i+1)),$('div','title',o.title||'Option'));if(o.subtitle)c.append($('div','meta',o.subtitle));if(o.price)c.append($('div','price',o.price));const f=$('div','facts');for(const x of o.facts||[])f.append($('span','fact',x));if(f.childNodes.length)c.append(f);if(o.reason)c.append($('div','reason',o.reason));k.append(c)}s.append(k);a.append(s)};${bridge()}</script></body></html>`;

const routeHtml = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${styles()}.route{display:flex;align-items:stretch;gap:8px;overflow-x:auto;padding:14px 18px 18px}.node{min-width:150px;flex:0 0 150px;border:1px solid var(--line);border-radius:14px;padding:12px}.arrow{align-self:center;color:var(--muted);font-size:18px}.cap{font-size:11px;text-transform:uppercase;color:var(--muted);letter-spacing:.07em}.node b{display:block;margin-top:5px}.why{font-size:12px;color:var(--muted);margin-top:5px}</style></head><body><div id="app"></div><script>const $=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!==undefined)e.textContent=String(x);return e};window.render=(d={})=>{const a=document.getElementById('app');a.replaceChildren();const s=$('div','shell'),h=$('div','head'),l=$('div');l.append($('div','eyebrow','Life Agent · route'),$('div','title',d.intent||'Capability route'));if(d.outcome)l.append($('div','sub',d.outcome));h.append(l);s.append(h);const r=$('div','route');(d.route||[]).forEach((n,i)=>{if(i)r.append($('div','arrow','→'));const c=$('div','node');c.append($('div','cap',n.capability||'capability'),$('b','',n.provider||'Host capability'));if(n.action)c.append($('div','meta',n.action));if(n.reason)c.append($('div','why',n.reason));r.append(c)});s.append(r);a.append(s)};${bridge()}</script></body></html>`;

const resources = new Map([
  [EXECUTION_URI, executionHtml],
  [CHOICES_URI, choicesHtml],
  [ROUTE_URI, routeHtml],
]);

const tools = [
  { name: 'life_show_execution', description: 'Render a compact Life Agent execution/status card after real connected tools have been selected or called.', inputSchema: { type: 'object', properties: { title: { type: 'string' }, outcome: { type: 'string' }, summary: { type: 'string' }, status: { type: 'string', enum: ['planning', 'acting', 'waiting_for_user', 'completed', 'blocked'] }, steps: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, status: { type: 'string' }, provider: { type: 'string' }, detail: { type: 'string' } }, required: ['label'] } }, handoff: { type: 'object', properties: { label: { type: 'string' }, reason: { type: 'string' }, url: { type: 'string' } } }, followUps: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, status: { type: 'string' }, provider: { type: 'string' } }, required: ['label'] } } }, required: ['title', 'status'] }, _meta: { ui: { resourceUri: EXECUTION_URI } }, annotations: { readOnlyHint: true } },
  { name: 'life_show_choices', description: 'Render a compact generic choice deck when no richer native host UI is available.', inputSchema: { type: 'object', properties: { title: { type: 'string' }, summary: { type: 'string' }, options: { type: 'array', minItems: 1, maxItems: 8, items: { type: 'object', properties: { id: { type: 'string' }, title: { type: 'string' }, subtitle: { type: 'string' }, price: { type: 'string' }, facts: { type: 'array', items: { type: 'string' } }, reason: { type: 'string' }, recommended: { type: 'boolean' } }, required: ['id', 'title'] } } }, required: ['title', 'options'] }, _meta: { ui: { resourceUri: CHOICES_URI } }, annotations: { readOnlyHint: true } },
  { name: 'life_show_capability_route', description: 'Render how Life Agent mapped an interpreted intent to available providers.', inputSchema: { type: 'object', properties: { intent: { type: 'string' }, outcome: { type: 'string' }, route: { type: 'array', minItems: 1, items: { type: 'object', properties: { capability: { type: 'string' }, provider: { type: 'string' }, action: { type: 'string' }, reason: { type: 'string' } }, required: ['capability', 'provider'] } } }, required: ['intent', 'route'] }, _meta: { ui: { resourceUri: ROUTE_URI } }, annotations: { readOnlyHint: true } },
  { name: 'life_state_read', description: 'Read the user-owned Life Agent durable operational memory when it could materially affect the task.', inputSchema: { type: 'object', properties: {} }, annotations: { readOnlyHint: true } },
  { name: 'life_state_update', description: 'Replace Life Agent durable operational memory after reading it. Never store credentials, secrets, payment data, or ephemeral trivia.', inputSchema: { type: 'object', properties: { content: { type: 'string' }, reason: { type: 'string' } }, required: ['content', 'reason'] }, annotations: { destructiveHint: false, idempotentHint: true } },
  { name: 'life_asset_resolve', description: 'Resolve a UI brand icon or curated contextual background through the bounded Life Agent asset cache. Cache is preferred, public retrieval is attempted only when needed, stale cache is used on origin failure, and brand fallback initials are returned when no image is available.', inputSchema: { type: 'object', properties: { kind: { type: 'string', enum: ['brand', 'background'] }, brandId: { type: 'string' }, brandName: { type: 'string' }, domain: { type: 'string' }, theme: { type: 'string' }, embed: { type: 'boolean' } }, required: ['kind'] }, annotations: { readOnlyHint: true } },
  { name: 'life_asset_cache_status', description: 'Read Life Agent UI asset-cache statistics.', inputSchema: { type: 'object', properties: {} }, annotations: { readOnlyHint: true } },
  { name: 'life_asset_cache_clear_stale', description: 'Remove expired UI asset cache entries.', inputSchema: { type: 'object', properties: { olderThanMs: { type: 'number', minimum: 0 } } }, annotations: { destructiveHint: true, idempotentHint: true } },
];

function serializeAsset(result, embed) {
  const serialized = {
    kind: result.kind,
    status: result.status,
    key: result.key || null,
    fallback: result.fallback || null,
    theme: result.theme || null,
    fresh: result.fresh ?? null,
    contentType: result.metadata?.contentType || null,
    sourceUrl: result.metadata?.sourceUrl || null,
    size: result.metadata?.size || 0,
    expiresAt: result.metadata?.expiresAt || null,
    error: result.error || null,
  };
  if (embed && result.bytes && result.bytes.length <= MAX_EMBED_BYTES) {
    serialized.dataUri = `data:${result.metadata.contentType};base64,${result.bytes.toString('base64')}`;
  }
  return serialized;
}

async function resultForTool(name, args) {
  if (name === 'life_state_read') {
    const content = readLifeState();
    return { content: [{ type: 'text', text: content }], structuredContent: { path: LIFE_FILE, content } };
  }
  if (name === 'life_state_update') {
    writeLifeState(args?.content);
    return { content: [{ type: 'text', text: `Life Agent state updated: ${args?.reason || 'durable context changed'}` }], structuredContent: { path: LIFE_FILE, updated: true, reason: args?.reason || '' } };
  }
  if (name === 'life_asset_resolve') {
    const resolved = args?.kind === 'background'
      ? await assetResolver.resolveBackground({ theme: args?.theme })
      : await assetResolver.resolveBrand({ brandId: args?.brandId, brandName: args?.brandName, domain: args?.domain });
    const structuredContent = serializeAsset(resolved, args?.embed === true);
    return { content: [{ type: 'text', text: `Life Agent ${args?.kind || 'asset'} asset: ${structuredContent.status}` }], structuredContent };
  }
  if (name === 'life_asset_cache_status') {
    const structuredContent = assetResolver.stats();
    return { content: [{ type: 'text', text: `Life Agent asset cache contains ${structuredContent.entries} entries.` }], structuredContent };
  }
  if (name === 'life_asset_cache_clear_stale') {
    const removed = assetResolver.clearStale({ olderThanMs: Number(args?.olderThanMs) || 0 });
    return { content: [{ type: 'text', text: `Removed ${removed} stale Life Agent UI asset entries.` }], structuredContent: { removed, stats: assetResolver.stats() } };
  }

  const tool = tools.find(candidate => candidate.name === name);
  if (!tool) throw new Error(`Unknown tool: ${name}`);
  return { content: [{ type: 'text', text: 'Rendered Life Agent UI.' }], structuredContent: args || {}, _meta: { ui: { resourceUri: tool._meta.ui.resourceUri } } };
}

function respond(id, result) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, result })}\n`);
}

function fail(id, code, message) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } })}\n`);
}

async function handle(message) {
  if (!message || message.jsonrpc !== '2.0') return;
  const { id, method, params = {} } = message;
  if (id === undefined || id === null) return;
  try {
    if (method === 'initialize') return respond(id, { protocolVersion: params.protocolVersion || '2025-11-25', capabilities: { tools: { listChanged: false }, resources: { subscribe: false, listChanged: false } }, serverInfo: { name: 'life-agent-ui', version: VERSION }, instructions: 'Life Agent UI, UI-asset cache, and durable state shim. Real-world actions remain owned by the host and connected providers.' });
    if (method === 'ping') return respond(id, {});
    if (method === 'tools/list') return respond(id, { tools });
    if (method === 'tools/call') return respond(id, await resultForTool(params.name, params.arguments || {}));
    if (method === 'resources/list') return respond(id, { resources: [...resources.keys()].map(uri => ({ uri, name: uri.split('/').pop(), mimeType: MIME })) });
    if (method === 'resources/read') {
      if (!resources.has(params.uri)) return fail(id, -32002, 'Resource not found');
      return respond(id, { contents: [{ uri: params.uri, mimeType: MIME, text: resources.get(params.uri) }] });
    }
    return fail(id, -32601, `Method not found: ${method}`);
  } catch (error) {
    return fail(id, -32000, error?.message || String(error));
  }
}

ensureLifeFile();
const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', line => {
  if (!line.trim()) return;
  try {
    void handle(JSON.parse(line));
  } catch {
    // Invalid JSON on stdin is ignored to keep the MCP process alive.
  }
});
