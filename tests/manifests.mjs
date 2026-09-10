import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repo = path.resolve(import.meta.dirname, '..');
const files = ['.agents/plugins/marketplace.json', 'plugins/life-agent/.codex-plugin/plugin.json', 'plugins/life-agent/.mcp.json'];
for (const relative of files) {
  const parsed = JSON.parse(fs.readFileSync(path.join(repo, relative), 'utf8'));
  assert.equal(typeof parsed, 'object');
}
const marketplace = JSON.parse(fs.readFileSync(path.join(repo, files[0]), 'utf8'));
assert.equal(marketplace.plugins.filter(plugin => plugin.name === 'life-agent').length, 1);
const mcp = JSON.parse(fs.readFileSync(path.join(repo, files[2]), 'utf8'));
assert.equal(mcp.mcpServers['life-agent-ui'].command, 'node');
console.log('Life Agent plugin manifests parsed successfully.');
