import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathsOverlap, resolveAssetCacheDirectory } from '../plugins/life-agent/server/assets/asset-storage.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'life-agent-storage-'));
const pluginData = path.join(root, 'plugin-data');
fs.mkdirSync(pluginData);
try {
  assert.equal(pathsOverlap(pluginData, path.join(root, 'plugin-data', 'assets')), true);
  assert.equal(pathsOverlap(pluginData, root), true);

  const ephemeral = resolveAssetCacheDirectory({ pluginDataDir: pluginData, tempDir: root });
  assert.equal(ephemeral.ephemeral, true);
  assert.equal(ephemeral.ownership, 'process-ephemeral');
  assert.equal(ephemeral.rootDir.startsWith(pluginData), false);
  assert.equal(fs.existsSync(ephemeral.rootDir), true);
  ephemeral.cleanup();
  assert.equal(fs.existsSync(ephemeral.rootDir), false);

  const endpointRoot = path.join(root, 'endpoint-cache');
  const configured = resolveAssetCacheDirectory({ pluginDataDir: pluginData, configuredPath: endpointRoot });
  assert.equal(configured.ephemeral, false);
  assert.equal(configured.ownership, 'endpoint-service');
  assert.equal(fs.statSync(endpointRoot).isDirectory(), true);

  assert.throws(() => resolveAssetCacheDirectory({ pluginDataDir: pluginData, configuredPath: path.join(pluginData, 'assets') }), /overlap/);
  assert.throws(() => resolveAssetCacheDirectory({ pluginDataDir: pluginData, configuredPath: root }), /overlap/);
  assert.throws(() => resolveAssetCacheDirectory({ pluginDataDir: pluginData, configuredPath: 'relative-cache' }), /absolute/);
  assert.throws(() => resolveAssetCacheDirectory({ pluginDataDir: pluginData, configuredPath: path.join(root, 'not-a-directory'), mkdirSync: () => {}, statSync: () => ({ isDirectory: () => false }) }), /ownership/);
  console.log('Life Agent endpoint-owned asset storage tests passed.');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
