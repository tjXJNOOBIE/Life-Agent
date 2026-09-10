import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function absoluteDirectory(value, name) {
  const candidate = String(value || '').trim();
  if (!candidate || !path.isAbsolute(candidate)) {
    throw new Error(`${name} must be an absolute path`);
  }
  return path.resolve(candidate);
}

export function pathsOverlap(left, right) {
  const first = path.resolve(left);
  const second = path.resolve(right);
  return first === second || first.startsWith(`${second}${path.sep}`) || second.startsWith(`${first}${path.sep}`);
}

function establishDirectory(rootDir, mkdirSync = fs.mkdirSync, statSync = fs.statSync) {
  try {
    mkdirSync(rootDir, { recursive: true, mode: 0o700 });
    const stats = statSync(rootDir);
    if (!stats.isDirectory()) throw new Error('asset cache path is not a directory');
  } catch (error) {
    throw new Error(`asset cache ownership could not be established: ${error?.message || error}`);
  }
  return rootDir;
}

export function resolveAssetCacheDirectory({
  pluginDataDir,
  configuredPath = process.env.LIFE_AGENT_ASSET_CACHE_DIR,
  tempDir = os.tmpdir(),
  mkdtempSync = fs.mkdtempSync,
  mkdirSync = fs.mkdirSync,
  statSync = fs.statSync,
} = {}) {
  const userStateDir = absoluteDirectory(pluginDataDir, 'pluginDataDir');
  const configured = String(configuredPath || '').trim();

  if (configured) {
    const rootDir = absoluteDirectory(configured, 'LIFE_AGENT_ASSET_CACHE_DIR');
    if (pathsOverlap(userStateDir, rootDir)) {
      throw new Error('asset cache path must not overlap PLUGIN_DATA in either direction');
    }
    establishDirectory(rootDir, mkdirSync, statSync);
    return Object.freeze({ rootDir, ownership: 'endpoint-service', ephemeral: false, cleanup: () => {} });
  }

  const processTempDir = absoluteDirectory(tempDir, 'tempDir');
  const rootDir = mkdtempSync(path.join(processTempDir, 'life-agent-asset-cache-'));
  establishDirectory(rootDir, mkdirSync, statSync);
  return Object.freeze({
    rootDir,
    ownership: 'process-ephemeral',
    ephemeral: true,
    cleanup: () => fs.rmSync(rootDir, { recursive: true, force: true }),
  });
}
