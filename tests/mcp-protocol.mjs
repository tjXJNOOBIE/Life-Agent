import assert from 'node:assert/strict';
import { CURRENT_MCP_PROTOCOL_VERSION, LEGACY_MCP_PROTOCOL_VERSION, isCurrentProtocol, negotiateProtocolVersion, resultEnvelope, toolResultEnvelope } from '../plugins/life-agent/server/mcp-protocol.mjs';

assert.equal(negotiateProtocolVersion(CURRENT_MCP_PROTOCOL_VERSION), CURRENT_MCP_PROTOCOL_VERSION);
assert.equal(negotiateProtocolVersion(LEGACY_MCP_PROTOCOL_VERSION), LEGACY_MCP_PROTOCOL_VERSION);
assert.equal(negotiateProtocolVersion(), LEGACY_MCP_PROTOCOL_VERSION);
assert.equal(isCurrentProtocol(CURRENT_MCP_PROTOCOL_VERSION), true);
assert.equal(isCurrentProtocol(LEGACY_MCP_PROTOCOL_VERSION), false);
assert.throws(() => negotiateProtocolVersion('2024-11-05'), /unsupported/);
assert.deepEqual(resultEnvelope({ tools: [] }, { version: LEGACY_MCP_PROTOCOL_VERSION, resultType: 'tools-list' }), { tools: [] });
assert.deepEqual(resultEnvelope({ tools: [] }, { version: CURRENT_MCP_PROTOCOL_VERSION, resultType: 'tools-list' }), { resultType: 'tools-list', ttlMs: 0, cacheScope: 'private', tools: [] });
assert.deepEqual(toolResultEnvelope({ content: [] }, CURRENT_MCP_PROTOCOL_VERSION), { resultType: 'tool-call', ttlMs: 0, cacheScope: 'none', content: [] });
console.log('Life Agent MCP protocol contract tests passed.');
