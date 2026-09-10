#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { AssetCache } from './assets/asset-cache.mjs';
import { assetPathForKey } from './assets/asset-route.mjs';
import { resolveAssetCacheDirectory } from './assets/asset-storage.mjs';
import { AssetResolver } from './assets/asset-resolver.mjs';
import { assertAllowedKeys, validateStructuredContent } from './security/structured-content.mjs';
import {
  CURRENT_MCP_PROTOCOL_VERSION,
  LEGACY_MCP_PROTOCOL_VERSION,
  MCP_APPS_PROTOCOL_VERSION,
  MCP_PROTOCOL_VERSIONS,
  isCurrentProtocol,
  negotiateProtocolVersion,
  resultEnvelope,
  toolResultEnvelope,
} from './mcp-protocol.mjs';
import { UI_MIME, UI_RESOURCE_URIS } from './ui/ui-base.mjs';
import { UI_RESOURCES } from './ui/ui-resources.mjs';

const VERSION = '0.1.0';
const MAX_EMBED_BYTES = 768 * 1024;
const LIFE_DIR = path.resolve(process.env.PLUGIN_DATA || path.join(process.env.HOME || process.cwd(), '.life-agent'));
const LIFE_FILE = path.join(LIFE_DIR, 'LIFE.md');
const assetStorage = resolveAssetCacheDirectory({
  pluginDataDir: LIFE_DIR,
  configuredPath: process.env.LIFE_AGENT_ASSET_CACHE_DIR,
});
const assetCache = new AssetCache({ rootDir: assetStorage.rootDir });
const assetResolver = new AssetResolver({ cache: assetCache });
process.once('exit', () => assetStorage.cleanup());

const initialLifeState = `# Life Agent State

> User-owned operating memory for Life Agent. Never store passwords, payment card data, authentication tokens, or secrets here.

## Preferences

- None learned yet.

## Standing Permissions

- None recorded yet.

## People and Channels

- None learned yet.

## Active Context

- None.

## Unresolved Commitments

- None.

## Learned Defaults

- None learned yet.
`;

function ensureLifeFile() {
  fs.mkdirSync(LIFE_DIR, { recursive: true, mode: 0o700 });
  if (!fs.existsSync(LIFE_FILE)) fs.writeFileSync(LIFE_FILE, initialLifeState, { encoding: 'utf8', mode: 0o600 });
}

function readLifeState() {
  ensureLifeFile();
  return fs.readFileSync(LIFE_FILE, 'utf8');
}

function assertSafeLifeState(content) {
  const secretField = /(?:^|\n)\s*(?:[-*]\s*)?(?:access[_ -]?token|refresh[_ -]?token|id[_ -]?token|mfa[_ -]?secret|session(?:[_ -]?token)?|cookie|password|authorization|raw[_ -]?headers)\s*:/im;
  if (secretField.test(content)) throw new Error('LIFE.md may not contain credential or session fields');
}

function writeLifeState(content) {
  if (typeof content !== 'string' || content.trim().length === 0) throw new Error('content must be non-empty markdown');
  if (content.length > 128 * 1024) throw new Error('content exceeds LIFE.md size limit');
  assertSafeLifeState(content);
  ensureLifeFile();
  const temp = `${LIFE_FILE}.tmp-${process.pid}`;
  fs.writeFileSync(temp, content.endsWith('\n') ? content : `${content}\n`, { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(temp, LIFE_FILE);
}

function safeText(value, fallback = '', maxLength = 2_000) {
  const text = String(value ?? fallback).trim();
  return text.slice(0, maxLength);
}

function safeStatus(value, fallback = 'pending') {
  const status = safeText(value, fallback, 48).toLowerCase().replace(/[^a-z_]/g, '_');
  return ['planning', 'acting', 'waiting_for_user', 'completed', 'blocked', 'pending', 'active', 'done', 'warn'].includes(status) ? status : fallback;
}

function safeOptions(options, limit = 8) {
  if (!Array.isArray(options)) return [];
  return options.slice(0, limit).map((option, index) => {
    if (typeof option === 'string') return { id: safeText(option, `option-${index + 1}`, 120), label: safeText(option, `Option ${index + 1}`, 240) };
    return {
      id: safeText(option?.id, `option-${index + 1}`, 120),
      label: safeText(option?.label || option?.title, `Option ${index + 1}`, 240),
      selected: option?.selected === true,
    };
  });
}

function safeItems(items, limit = 10) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, limit).map((item, index) => ({
    label: safeText(item?.label || item?.title, `Item ${index + 1}`),
    detail: safeText(item?.detail || item?.value || item?.provider),
    status: safeStatus(item?.status),
  }));
}

function uiModel(name, input) {
  if (Object.hasOwn(input, 'assets') || Object.hasOwn(input, '_assets') || Object.hasOwn(input, 'url')) {
    throw new Error('server-owned UI fields may not be supplied by tool input');
  }

  switch (name) {
    case 'life_show_choices': {
      assertAllowedKeys(input, ['title', 'summary', 'options'], name);
      return {
        surface: 'choices', title: safeText(input.title, 'Choose an option'), summary: safeText(input.summary),
        options: (Array.isArray(input.options) ? input.options : []).slice(0, 8).map((option, index) => ({
          id: safeText(option?.id, `option-${index + 1}`, 120), title: safeText(option?.title, `Option ${index + 1}`), subtitle: safeText(option?.subtitle), price: safeText(option?.price),
          facts: Array.isArray(option?.facts) ? option.facts.slice(0, 6).map(item => safeText(item, '', 180)) : [], reason: safeText(option?.reason), provider: safeText(option?.provider), recommended: option?.recommended === true,
        })),
      };
    }
    case 'life_show_commitment': {
      assertAllowedKeys(input, ['title', 'summary', 'selected', 'consequences', 'conflicts', 'decisions', 'approval', 'primaryAction'], name);
      return {
        surface: 'commitment', title: safeText(input.title, 'Make the smallest decision'), summary: safeText(input.summary),
        selected: { label: safeText(input.selected?.label, 'Selected option'), detail: safeText(input.selected?.detail), provider: safeText(input.selected?.provider) },
        consequences: safeItems(input.consequences), conflicts: safeItems(input.conflicts, 6).map(item => ({ ...item, repair: item.detail })),
        decisions: (Array.isArray(input.decisions) ? input.decisions : []).slice(0, 6).map((decision, index) => ({ id: safeText(decision?.id, `decision-${index + 1}`, 120), label: safeText(decision?.label, `Decision ${index + 1}`), detail: safeText(decision?.detail), selected: safeText(decision?.selected), options: safeOptions(decision?.options, 6) })),
        approval: { label: safeText(input.approval?.label, 'Approval boundary'), detail: safeText(input.approval?.detail, 'Life Agent will handle the remaining reversible work.') },
        primaryAction: { id: safeText(input.primaryAction?.id, 'continue', 120), label: safeText(input.primaryAction?.label, 'Continue', 120) },
      };
    }
    case 'life_show_handoff': {
      assertAllowedKeys(input, ['title', 'summary', 'provider', 'reason', 'steps', 'action'], name);
      return { surface: 'handoff', title: safeText(input.title, 'A quick step for you'), summary: safeText(input.summary), provider: safeText(input.provider, 'Connected provider'), reason: safeText(input.reason), steps: safeItems(input.steps, 6), action: { label: safeText(input.action?.label, 'I am done', 120), message: safeText(input.action?.message, 'I am done', 240) } };
    }
    case 'life_show_execution': {
      assertAllowedKeys(input, ['title', 'outcome', 'summary', 'status', 'steps', 'handoff', 'followUps'], name);
      return { surface: 'execution', title: safeText(input.title || input.outcome, 'Working on it'), outcome: safeText(input.outcome), summary: safeText(input.summary), status: safeStatus(input.status, 'acting'), steps: safeItems(input.steps), handoff: input.handoff ? { label: safeText(input.handoff.label, 'Needs you'), reason: safeText(input.handoff.reason) } : null, followUps: safeItems(input.followUps, 8) };
    }
    case 'life_show_outcome': {
      assertAllowedKeys(input, ['title', 'summary', 'status', 'receipt', 'followUps', 'actions'], name);
      return { surface: 'outcome', title: safeText(input.title, 'Outcome complete'), summary: safeText(input.summary), status: safeStatus(input.status, 'completed'), receipt: { label: safeText(input.receipt?.label, 'Verified result'), detail: safeText(input.receipt?.detail) }, followUps: safeItems(input.followUps, 8), actions: (Array.isArray(input.actions) ? input.actions : []).slice(0, 4).map(action => ({ label: safeText(action?.label, 'Continue', 120), message: safeText(action?.message || action?.label, 'Continue', 240), primary: action?.primary === true })) };
    }
    case 'life_show_settings': {
      assertAllowedKeys(input, ['title', 'summary', 'preferences', 'permissions', 'identityLinks'], name);
      return { surface: 'settings', title: safeText(input.title, 'Settings'), summary: safeText(input.summary), preferences: safeItems(input.preferences, 10), permissions: safeItems(input.permissions, 10), identityLinks: (Array.isArray(input.identityLinks) ? input.identityLinks : []).slice(0, 6).map(identity => ({ provider: safeText(identity?.provider, 'Provider', 80), displayName: safeText(identity?.displayName, '', 160), emailHint: safeText(identity?.emailHint, '', 240) })) };
    }
    case 'life_show_capability_route': {
      assertAllowedKeys(input, ['intent', 'outcome', 'route'], name);
      return { surface: 'capability-route', intent: safeText(input.intent, 'Capability route'), outcome: safeText(input.outcome), route: (Array.isArray(input.route) ? input.route : []).slice(0, 8).map(node => ({ capability: safeText(node?.capability, 'Capability'), provider: safeText(node?.provider, 'Host capability'), action: safeText(node?.action), reason: safeText(node?.reason) })) };
    }
    default: throw new Error(`unknown UI tool: ${name}`);
  }
}

function serializeAsset(result, embed = false) {
  const contentType = String(result.metadata?.contentType || '').toLowerCase();
  const output = { kind: result.kind, status: result.status, key: result.key || null, assetPath: result.key ? assetPathForKey(result.key) : null, fallback: result.fallback || null, theme: result.theme || null, fresh: result.fresh ?? null, contentType: contentType || null, size: result.metadata?.size || 0, expiresAt: result.metadata?.expiresAt || null, error: result.error || null };
  if (embed && result.bytes && result.bytes.length <= MAX_EMBED_BYTES && /^image\/(?:png|jpeg|webp|gif|x-icon|vnd\.microsoft\.icon)$/.test(contentType)) output.dataUri = `data:${contentType};base64,${result.bytes.toString('base64')}`;
  return output;
}

const textSchema = { type: 'string', maxLength: 8_192 };
const itemSchema = { type: 'object', additionalProperties: false, properties: { label: textSchema, title: textSchema, detail: textSchema, value: textSchema, provider: textSchema, status: textSchema }, required: ['label'] };
const uiTool = (name, resourceUri, properties, required) => ({ name, description: `Render the server-sanitized Life Agent ${name.replace('life_show_', '').replaceAll('_', ' ')} surface. This UI reports orchestration state; it does not perform provider mutations.`, inputSchema: { type: 'object', additionalProperties: false, properties, required }, _meta: { ui: { resourceUri } }, annotations: { readOnlyHint: true } });

const UI_TOOLS = [
  uiTool('life_show_choices', UI_RESOURCE_URIS.CHOICES, { title: textSchema, summary: textSchema, options: { type: 'array', minItems: 1, maxItems: 8, items: { type: 'object', additionalProperties: false, properties: { id: textSchema, title: textSchema, subtitle: textSchema, price: textSchema, facts: { type: 'array', maxItems: 6, items: textSchema }, reason: textSchema, provider: textSchema, recommended: { type: 'boolean' } }, required: ['id', 'title'] } } }, ['title', 'options']),
  uiTool('life_show_commitment', UI_RESOURCE_URIS.COMMITMENT, { title: textSchema, summary: textSchema, selected: { type: 'object', additionalProperties: false, properties: { label: textSchema, detail: textSchema, provider: textSchema }, required: ['label'] }, consequences: { type: 'array', maxItems: 10, items: itemSchema }, conflicts: { type: 'array', maxItems: 6, items: itemSchema }, decisions: { type: 'array', maxItems: 6, items: { type: 'object', additionalProperties: false, properties: { id: textSchema, label: textSchema, detail: textSchema, selected: textSchema, options: { type: 'array', maxItems: 6, items: { type: 'object', additionalProperties: false, properties: { id: textSchema, label: textSchema, selected: { type: 'boolean' } } } } }, required: ['id', 'label'] } }, approval: { type: 'object', additionalProperties: false, properties: { label: textSchema, detail: textSchema } }, primaryAction: { type: 'object', additionalProperties: false, properties: { id: textSchema, label: textSchema } } }, ['title', 'selected']),
  uiTool('life_show_handoff', UI_RESOURCE_URIS.HANDOFF, { title: textSchema, summary: textSchema, provider: textSchema, reason: textSchema, steps: { type: 'array', maxItems: 6, items: itemSchema }, action: { type: 'object', additionalProperties: false, properties: { label: textSchema, message: textSchema } } }, ['title', 'provider', 'reason']),
  uiTool('life_show_execution', UI_RESOURCE_URIS.EXECUTION, { title: textSchema, outcome: textSchema, summary: textSchema, status: { type: 'string', enum: ['planning', 'acting', 'waiting_for_user', 'completed', 'blocked'] }, steps: { type: 'array', maxItems: 10, items: itemSchema }, handoff: { type: 'object', additionalProperties: false, properties: { label: textSchema, reason: textSchema } }, followUps: { type: 'array', maxItems: 8, items: itemSchema } }, ['title', 'status']),
  uiTool('life_show_outcome', UI_RESOURCE_URIS.OUTCOME, { title: textSchema, summary: textSchema, status: { type: 'string', enum: ['completed', 'blocked', 'waiting_for_user'] }, receipt: { type: 'object', additionalProperties: false, properties: { label: textSchema, detail: textSchema }, required: ['label'] }, followUps: { type: 'array', maxItems: 8, items: itemSchema }, actions: { type: 'array', maxItems: 4, items: { type: 'object', additionalProperties: false, properties: { label: textSchema, message: textSchema, primary: { type: 'boolean' } }, required: ['label'] } } }, ['title', 'status', 'receipt']),
  uiTool('life_show_settings', UI_RESOURCE_URIS.SETTINGS, { title: textSchema, summary: textSchema, preferences: { type: 'array', maxItems: 10, items: itemSchema }, permissions: { type: 'array', maxItems: 10, items: itemSchema }, identityLinks: { type: 'array', maxItems: 6, items: { type: 'object', additionalProperties: false, properties: { provider: textSchema, displayName: textSchema, emailHint: textSchema }, required: ['provider'] } } }, ['title']),
  uiTool('life_show_capability_route', UI_RESOURCE_URIS.CAPABILITY_ROUTE, { intent: textSchema, outcome: textSchema, route: { type: 'array', minItems: 1, maxItems: 8, items: { type: 'object', additionalProperties: false, properties: { capability: textSchema, provider: textSchema, action: textSchema, reason: textSchema }, required: ['capability', 'provider'] } } }, ['intent', 'route']),
];

const tools = Object.freeze([
  ...UI_TOOLS,
  { name: 'life_state_read', description: 'Read the user-owned Life Agent durable operating memory when it could materially affect the task.', inputSchema: { type: 'object', additionalProperties: false, properties: {} }, annotations: { readOnlyHint: true } },
  { name: 'life_state_update', description: 'Replace user-owned Life Agent durable operating memory. Never store credentials, secrets, payment data, or reusable session material.', inputSchema: { type: 'object', additionalProperties: false, properties: { content: { type: 'string', minLength: 1, maxLength: 131_072 }, reason: { type: 'string', minLength: 1, maxLength: 2_000 } }, required: ['content', 'reason'] }, annotations: { idempotentHint: true, destructiveHint: false } },
  { name: 'life_asset_resolve', description: 'Resolve a trusted brand icon or curated contextual background through the endpoint-owned bounded asset cache. The model may select only a known brand or curated theme; it cannot supply a URL or domain target.', inputSchema: { type: 'object', additionalProperties: false, properties: { kind: { type: 'string', enum: ['brand', 'background'] }, brandId: textSchema, brandName: textSchema, theme: textSchema, embed: { type: 'boolean' } }, required: ['kind'] }, annotations: { readOnlyHint: true } },
]);

function publicResources() { return [...UI_RESOURCES.keys()].map(uri => ({ uri, name: uri.split('/').pop(), mimeType: UI_MIME })); }
function publicTools() { return tools.map(tool => JSON.parse(JSON.stringify(tool))); }

async function resultForTool(name, argumentsValue) {
  const input = validateStructuredContent(argumentsValue || {});
  if (!input || Array.isArray(input) || typeof input !== 'object') throw new Error('tool arguments must be an object');
  if (name === 'life_state_read') {
    assertAllowedKeys(input, [], name);
    return { content: [{ type: 'text', text: readLifeState() }], structuredContent: validateStructuredContent({ content: readLifeState() }) };
  }
  if (name === 'life_state_update') {
    assertAllowedKeys(input, ['content', 'reason'], name);
    writeLifeState(input.content);
    return { content: [{ type: 'text', text: 'Life Agent state updated.' }], structuredContent: validateStructuredContent({ updated: true, reason: safeText(input.reason) }) };
  }
  if (name === 'life_asset_resolve') {
    assertAllowedKeys(input, ['kind', 'brandId', 'brandName', 'theme', 'embed'], name);
    let resolved;
    if (input.kind === 'brand') resolved = await assetResolver.resolveBrand({ brandId: input.brandId, brandName: input.brandName });
    else if (input.kind === 'background') resolved = await assetResolver.resolveBackground({ theme: input.theme });
    else throw new Error('kind must be brand or background');
    return { content: [{ type: 'text', text: `Life Agent ${input.kind} asset: ${resolved.status}` }], structuredContent: validateStructuredContent(serializeAsset(resolved, input.embed === true)) };
  }
  const tool = UI_TOOLS.find(candidate => candidate.name === name);
  if (!tool) throw new Error(`unknown tool: ${name}`);
  const structuredContent = validateStructuredContent(uiModel(name, input));
  return { content: [{ type: 'text', text: 'Rendered server-sanitized Life Agent UI.' }], structuredContent, _meta: { ui: { resourceUri: tool._meta.ui.resourceUri } } };
}

let protocolVersion = LEGACY_MCP_PROTOCOL_VERSION;
function response(id, result) { process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, result })}\n`); }
function failure(id, code, message) { process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } })}\n`); }
function initializeResult() { return { protocolVersion, capabilities: { tools: { listChanged: false }, resources: { subscribe: false, listChanged: false } }, serverInfo: { name: 'life-agent-ui', version: VERSION }, instructions: 'Life Agent is outcome-first and capability-first. UI resources report server-sanitized orchestration state; connected providers own authentication, payment, and consequential mutations.' }; }

async function handle(message) {
  if (!message || message.jsonrpc !== '2.0') return;
  const { id, method, params = {} } = message;
  if (id === undefined || id === null) return;
  try {
    if (method === 'initialize') {
      protocolVersion = negotiateProtocolVersion(params.protocolVersion);
      return response(id, resultEnvelope(initializeResult(), { version: protocolVersion, resultType: 'initialize', ttlMs: 0, cacheScope: 'private' }));
    }
    if (method === 'server/discover') {
      if (!isCurrentProtocol(protocolVersion)) return failure(id, -32601, 'server/discover requires the current MCP protocol');
      return response(id, resultEnvelope({ protocolVersion: CURRENT_MCP_PROTOCOL_VERSION, supportedVersions: [...MCP_PROTOCOL_VERSIONS], serverInfo: { name: 'life-agent-ui', version: VERSION }, capabilities: initializeResult().capabilities, apps: { protocolVersion: MCP_APPS_PROTOCOL_VERSION, resources: Object.values(UI_RESOURCE_URIS) } }, { version: protocolVersion, resultType: 'server-discover', ttlMs: 0, cacheScope: 'private' }));
    }
    if (method === 'ping') return response(id, resultEnvelope({}, { version: protocolVersion, resultType: 'ping', ttlMs: 0, cacheScope: 'private' }));
    if (method === 'tools/list') return response(id, resultEnvelope({ tools: publicTools() }, { version: protocolVersion, resultType: 'tools-list', ttlMs: 0, cacheScope: 'private' }));
    if (method === 'resources/list') return response(id, resultEnvelope({ resources: publicResources() }, { version: protocolVersion, resultType: 'resources-list', ttlMs: 0, cacheScope: 'private' }));
    if (method === 'resources/read') {
      if (!UI_RESOURCES.has(params.uri)) return failure(id, -32002, 'Resource not found');
      return response(id, resultEnvelope({ contents: [{ uri: params.uri, mimeType: UI_MIME, text: UI_RESOURCES.get(params.uri) }] }, { version: protocolVersion, resultType: 'resource-read', ttlMs: 0, cacheScope: 'private' }));
    }
    if (method === 'tools/call') return response(id, toolResultEnvelope(await resultForTool(params.name, params.arguments || {}), protocolVersion));
    if (method === 'prompts/list' || method === 'prompts/get') return failure(id, -32601, `Method not found: ${method}`);
    return failure(id, -32601, `Method not found: ${method}`);
  } catch (error) {
    return failure(id, -32000, error?.message || String(error));
  }
}

ensureLifeFile();
const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
input.on('line', line => {
  if (!line.trim()) return;
  try { void handle(JSON.parse(line)); } catch { /* Keep stdio alive after malformed input. */ }
});
