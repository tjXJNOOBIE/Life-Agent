const MAX_DEPTH = 10;
const MAX_NODES = 2_000;
const MAX_ARRAY_LENGTH = 100;
const MAX_STRING_LENGTH = 8_192;
const MAX_AGGREGATE_BYTES = 512 * 1024;

const FORBIDDEN_KEYS = new Set([
  'accesstoken', 'refreshtoken', 'idtoken', 'token', 'cookie', 'cookies',
  'password', 'mfasecret', 'session', 'sessiontoken', 'authorization',
  'rawheaders', 'localstorage', 'indexeddb', 'browserprofile',
  'recoverysecret', 'credential', 'credentials', 'secret', 'bearer',
]);
const PROTOTYPE_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function normalizedKey(key) {
  return String(key).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function forbiddenKey(key) {
  const normalized = normalizedKey(key);
  return PROTOTYPE_KEYS.has(String(key).toLowerCase()) || FORBIDDEN_KEYS.has(normalized) ||
    normalized.endsWith('token') || normalized.endsWith('password') || normalized.endsWith('secret') ||
    normalized.includes('cookie') || normalized.includes('authorization') || normalized.includes('rawheaders');
}

export function validateStructuredContent(value, {
  maxDepth = MAX_DEPTH,
  maxNodes = MAX_NODES,
  maxArrayLength = MAX_ARRAY_LENGTH,
  maxStringLength = MAX_STRING_LENGTH,
  maxAggregateBytes = MAX_AGGREGATE_BYTES,
} = {}) {
  let nodes = 0;
  let aggregateBytes = 0;

  function visit(current, depth) {
    if (depth > maxDepth) throw new Error('structuredContent exceeds maximum depth');
    nodes += 1;
    if (nodes > maxNodes) throw new Error('structuredContent exceeds maximum object nodes');

    if (current === null || typeof current === 'boolean') return current;
    if (typeof current === 'number') {
      if (!Number.isFinite(current)) throw new Error('structuredContent contains a non-finite number');
      return current;
    }
    if (typeof current === 'string') {
      if (current.length > maxStringLength) throw new Error('structuredContent contains an oversized string');
      aggregateBytes += Buffer.byteLength(current, 'utf8');
      if (aggregateBytes > maxAggregateBytes) throw new Error('structuredContent exceeds aggregate size');
      return current;
    }
    if (Array.isArray(current)) {
      if (current.length > maxArrayLength) throw new Error('structuredContent contains an oversized array');
      return current.map(item => visit(item, depth + 1));
    }
    if (typeof current !== 'object') throw new Error('structuredContent contains an unsupported value');

    const copy = Object.create(null);
    for (const [key, child] of Object.entries(current)) {
      if (forbiddenKey(key)) throw new Error(`structuredContent contains forbidden field ${key}`);
      copy[key] = visit(child, depth + 1);
    }
    return copy;
  }

  return visit(value, 0);
}

export function assertAllowedKeys(value, allowedKeys, label = 'input') {
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(value || {})) {
    if (!allowed.has(key)) throw new Error(`${label} contains unsupported field ${key}`);
  }
  return value;
}

export const StructuredContentLimits = Object.freeze({
  maxDepth: MAX_DEPTH,
  maxNodes: MAX_NODES,
  maxArrayLength: MAX_ARRAY_LENGTH,
  maxStringLength: MAX_STRING_LENGTH,
  maxAggregateBytes: MAX_AGGREGATE_BYTES,
});
