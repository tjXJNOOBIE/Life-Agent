import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { UI_RESOURCE_URIS } from '../plugins/life-agent/server/ui/ui-base.mjs';
import { UI_RESOURCES } from '../plugins/life-agent/server/ui/ui-resources.mjs';

const repo = path.resolve(import.meta.dirname, '..');
const base = fs.readFileSync(path.join(repo, 'plugins/life-agent/server/ui/ui-base.mjs'), 'utf8');
assert.equal(Object.keys(UI_RESOURCE_URIS).length, 7);
assert.equal(UI_RESOURCES.size, 7);
for (const uri of Object.values(UI_RESOURCE_URIS)) assert.match(uri, /^ui:\/\/life-agent\/.+-v2\.html$/);
for (const html of UI_RESOURCES.values()) {
  const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
  assert.ok(script);
  assert.doesNotThrow(() => new Function(script));
  assert.doesNotMatch(html, /toolInput/);
}
assert.match(base, /-apple-system/);
assert.match(base, /SF Pro Text/);
assert.match(base, /backdrop-filter:blur\(17px\)/);
assert.match(base, /border-radius:22px/);
assert.match(base, /border-radius:16px/);
assert.match(base, /2026-01-26/);

const masterCandidates = [
  path.join(repo, 'fixtures/life-agent-glass-ui-system(1).html'),
  path.join(repo, 'life-agent-glass-ui-system(1).html'),
];
const master = masterCandidates.find(candidate => fs.existsSync(candidate));
if (master) {
  const bytes = fs.readFileSync(master);
  assert.equal(bytes.length, 37_404);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), 'f497d59d4cb86493009dc9412bbe60dfde313d0516e8b1cbbf47228967e6b7f5');
} else {
  console.log('Glass master fixture not supplied in this checkout; visual contract tokens are locked.');
}
console.log('Life Agent Glass UI contract tests passed.');
