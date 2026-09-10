export const LEGACY_MCP_PROTOCOL_VERSION = '2025-11-25';
export const CURRENT_MCP_PROTOCOL_VERSION = '2026-07-28';
export const MCP_PROTOCOL_VERSIONS = Object.freeze([
  CURRENT_MCP_PROTOCOL_VERSION,
  LEGACY_MCP_PROTOCOL_VERSION,
]);
export const MCP_APPS_PROTOCOL_VERSION = '2026-01-26';

export function negotiateProtocolVersion(requested) {
  const value = String(requested || '').trim();
  if (MCP_PROTOCOL_VERSIONS.includes(value)) return value;
  if (!value) return LEGACY_MCP_PROTOCOL_VERSION;
  throw new Error(`unsupported MCP protocol version: ${value}`);
}

export function isCurrentProtocol(version) {
  return version === CURRENT_MCP_PROTOCOL_VERSION;
}

export function resultEnvelope(payload, { version, resultType, ttlMs = 0, cacheScope = 'private' } = {}) {
  if (!isCurrentProtocol(version)) return payload;
  return { resultType, ttlMs, cacheScope, ...payload };
}

export function toolResultEnvelope(payload, version) {
  return resultEnvelope(payload, {
    version,
    resultType: 'tool-call',
    ttlMs: 0,
    cacheScope: 'none',
  });
}
