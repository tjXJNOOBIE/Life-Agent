import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { UI_RESOURCE_URIS } from '../plugins/life-agent/server/ui/ui-base.mjs';
import { GLASS_UI_STYLES } from '../plugins/life-agent/server/ui/ui-glass-system.mjs';
import { UI_RESOURCES } from '../plugins/life-agent/server/ui/ui-resources.mjs';

const repo = path.resolve(import.meta.dirname, '..');
const base = fs.readFileSync(path.join(repo, 'plugins/life-agent/server/ui/ui-base.mjs'), 'utf8');
const fixture = fs.readFileSync(path.join(repo, 'fixtures/life-agent-glass-ui-system.html'), 'utf8');
const referenceStyles = fixture.match(/<style>([\s\S]*?)<\/style>/)?.[1];
const safeReferenceStyles = referenceStyles.replace(/url\((['"])https?:\/\/[^)]*?\1\)/g, 'var(--life-agent-image, none)');
assert.equal(GLASS_UI_STYLES, safeReferenceStyles);
assert.doesNotMatch(GLASS_UI_STYLES, /https?:\/\//);
assert.equal(Object.keys(UI_RESOURCE_URIS).length, 7);
assert.equal(UI_RESOURCES.size, 7);
for (const uri of Object.values(UI_RESOURCE_URIS)) assert.match(uri, /^ui:\/\/life-agent\/.+-v2\.html$/);
for (const html of UI_RESOURCES.values()) {
  const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
  assert.ok(script);
  assert.doesNotThrow(() => new Function(script));
  assert.doesNotMatch(html, /toolInput/);
}
assert.match(GLASS_UI_STYLES, /-apple-system/);
assert.match(GLASS_UI_STYLES, /SF Pro Text/);
assert.match(GLASS_UI_STYLES, /backdrop-filter:blur\(28px\)/);
assert.match(GLASS_UI_STYLES, /border-radius:22px/);
assert.match(GLASS_UI_STYLES, /border-radius:16px/);
assert.match(base, /2026-01-26/);

const masterCandidates = [
  path.join(repo, 'fixtures/life-agent-glass-ui-system.html'),
  path.join(repo, 'fixtures/life-agent-glass-ui-system(1).html'),
  path.join(repo, 'life-agent-glass-ui-system(1).html'),
];
const master = masterCandidates.find(candidate => fs.existsSync(candidate));
if (master) {
  const bytes = fs.readFileSync(master);
  assert.equal(bytes.length, 37_404);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), 'f497d59d4cb86493009dc9412bbe60dfde313d0516e8b1cbbf47228967e6b7f5');
}
console.log('Life Agent Glass UI contract tests passed.');
