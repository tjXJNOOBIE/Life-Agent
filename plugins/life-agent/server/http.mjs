#!/usr/bin/env node
import http from 'node:http';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import readline from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AssetCache } from './assets/asset-cache.mjs';
import { readCachedAssetRoute } from './assets/asset-route.mjs';
import { resolveAssetCacheDirectory } from './assets/asset-storage.mjs';

const VERSION = '0.1.0';
const MAX_BODY_BYTES = 1_048_576;
const root = path.dirname(fileURLToPath(import.meta.url));
const pluginData = path.resolve(process.env.PLUGIN_DATA || path.join(process.cwd(), '.life-agent'));
const assetStorage = resolveAssetCacheDirectory({
  pluginDataDir: pluginData,
  configuredPath: process.env.LIFE_AGENT_ASSET_CACHE_DIR,
});
const assetCache = new AssetCache({ rootDir: assetStorage.rootDir });
const childEnvironment = { ...process.env, PLUGIN_DATA: pluginData };
let child;
let childLines;
let childExit;
let nextRequestId = 1;
const pending = new Map();

function startChild() {
  child = spawn(process.execPath, [path.join(root, 'server.mjs')], {
    env: childEnvironment,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  childLines = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
  childLines.on('line', line => {
    let message;
    try { message = JSON.parse(line); } catch { return; }
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    waiter.resolve(message);
  });
  childExit = error => {
    const reason = error instanceof Error ? error : new Error('Life Agent MCP worker exited');
    for (const waiter of pending.values()) waiter.reject(reason);
    pending.clear();
    child = undefined;
    childLines?.close();
  };
  child.once('error', childExit);
  child.once('exit', code => childExit(new Error(`Life Agent MCP worker exited with code ${code ?? 'unknown'}`)));
}

async function callChild(message) {
  if (!child || child.stdin.destroyed) startChild();
  const internalId = `http-${nextRequestId++}`;
  const request = { ...message, id: internalId };
  return new Promise((resolve, reject) => {
    pending.set(internalId, {
      resolve: response => resolve({ ...response, id: message.id }),
      reject,
    });
    child.stdin.write(`${JSON.stringify(request)}\n`, error => {
      if (!error) return;
      pending.delete(internalId);
      reject(error);
    });
  });
}

function applyCors(response) {
  response.setHeader('access-control-allow-origin', '*');
  response.setHeader('access-control-allow-headers', 'accept,content-type,mcp-protocol-version');
  response.setHeader('access-control-allow-methods', 'GET,POST,HEAD,OPTIONS');
  response.setHeader('x-content-type-options', 'nosniff');
}

function json(response, status, value) {
  response.statusCode = status;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(value));
}

async function readJson(request) {
  const encoding = String(request.headers['content-encoding'] || '').trim().toLowerCase();
  if (encoding && encoding !== 'identity') throw new Error('compressed request bodies are not supported');
  const declared = Number(request.headers['content-length'] || 0);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) throw new Error('request body is too large');
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new Error('request body is too large');
    chunks.push(buffer);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new Error('request body must be valid JSON'); }
}

async function handle(request, response) {
  applyCors(response);
  if (request.method === 'OPTIONS') { response.statusCode = 204; response.end(); return; }
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);

  if (url.pathname === '/healthz' || url.pathname === '/readyz') {
    json(response, 200, { status: 'ok', name: 'Life Agent', version: VERSION, mcp: '/mcp', assets: '/assets/<sha256>' });
    return;
  }
  if (url.pathname === '/') {
    json(response, 200, { name: 'Life Agent', version: VERSION, mcp: '/mcp', health: '/healthz', assets: '/assets/<sha256>' });
    return;
  }
  if (url.pathname.startsWith('/assets/')) {
    const result = readCachedAssetRoute({ cache: assetCache, method: request.method, path: `${url.pathname}${url.search}` });
    response.statusCode = result.status;
    for (const [name, value] of Object.entries(result.headers)) response.setHeader(name, value);
    response.end(result.body);
    return;
  }
  if (url.pathname !== '/mcp') { response.statusCode = 404; response.end('Not found'); return; }
  if (request.method !== 'POST') { response.statusCode = 405; response.setHeader('allow', 'POST, OPTIONS'); response.end('Method not allowed'); return; }
  if (!authorized(request)) {
    response.setHeader('www-authenticate', 'Bearer');
    json(response, 401, { error: 'authenticated MCP access is required' });
    return;
  }

  try {
    const message = await readJson(request);
    const result = await callChild(message);
    json(response, 200, result);
  } catch (error) {
    json(response, 400, { jsonrpc: '2.0', id: null, error: { code: -32600, message: error?.message || 'Invalid MCP request' } });
  }
}

const host = process.env.LIFE_AGENT_HOST || '0.0.0.0';
const port = Number(process.env.LIFE_AGENT_PORT || process.env.PORT || '3000');
const authToken = String(process.env.LIFE_AGENT_HTTP_AUTH_TOKEN || '').trim();
const loopback = host === '127.0.0.1' || host === '::1' || host === 'localhost';
if (!loopback && authToken.length < 16) {
  throw new Error('LIFE_AGENT_HTTP_AUTH_TOKEN with at least 16 characters is required for non-loopback HTTP hosting');
}

function authorized(request) {
  if (authToken.length === 0) return loopback;
  const value = String(request.headers.authorization || '');
  const prefix = 'Bearer ';
  if (!value.startsWith(prefix)) return false;
  const supplied = Buffer.from(value.slice(prefix.length));
  const expected = Buffer.from(authToken);
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

const server = http.createServer((request, response) => { void handle(request, response); });
server.requestTimeout = 30_000;
server.headersTimeout = 15_000;
server.listen(port, host, () => process.stderr.write(`Life Agent HTTP listening on ${host}:${port}\n`));

async function close() {
  child?.kill('SIGTERM');
  childLines?.close();
  assetStorage.cleanup();
  await new Promise(resolve => server.close(() => resolve()));
}
process.once('SIGINT', () => { void close(); });
process.once('SIGTERM', () => { void close(); });
