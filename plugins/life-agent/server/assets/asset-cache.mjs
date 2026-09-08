import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const META_SUFFIX = '.json';
const DATA_SUFFIX = '.bin';

function atomicWrite(file, content) {
  const temp = `${file}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(temp, content);
  fs.renameSync(temp, file);
}

export class AssetCache {
  constructor({ rootDir, now = () => Date.now() }) {
    if (!rootDir) throw new Error('rootDir is required');
    this.rootDir = rootDir;
    this.now = now;
    fs.mkdirSync(this.rootDir, { recursive: true });
  }

  key(scope, identity) {
    if (!scope || !identity) throw new Error('scope and identity are required');
    return crypto.createHash('sha256').update(`${scope}:${identity}`).digest('hex');
  }

  #metaPath(key) {
    return path.join(this.rootDir, `${key}${META_SUFFIX}`);
  }

  #dataPath(key) {
    return path.join(this.rootDir, `${key}${DATA_SUFFIX}`);
  }

  read(key, { allowStale = true } = {}) {
    const metaPath = this.#metaPath(key);
    const dataPath = this.#dataPath(key);
    if (!fs.existsSync(metaPath) || !fs.existsSync(dataPath)) return null;

    try {
      const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      const fresh = Number(metadata.expiresAt) > this.now();
      if (!fresh && !allowStale) return null;
      const bytes = fs.readFileSync(dataPath);
      return { key, metadata, bytes, fresh };
    } catch {
      return null;
    }
  }

  write({ key, bytes, contentType, sourceUrl, ttlMs, scope, identity }) {
    if (!key || !Buffer.isBuffer(bytes) || bytes.length === 0) throw new Error('key and non-empty bytes are required');
    if (!contentType || !Number.isFinite(ttlMs) || ttlMs <= 0) throw new Error('contentType and positive ttlMs are required');

    const storedAt = this.now();
    const metadata = {
      version: 1,
      scope,
      identity,
      contentType,
      sourceUrl: sourceUrl || null,
      size: bytes.length,
      storedAt,
      expiresAt: storedAt + ttlMs,
    };

    atomicWrite(this.#dataPath(key), bytes);
    atomicWrite(this.#metaPath(key), `${JSON.stringify(metadata, null, 2)}\n`);
    return { key, metadata, bytes, fresh: true };
  }

  remove(key) {
    fs.rmSync(this.#metaPath(key), { force: true });
    fs.rmSync(this.#dataPath(key), { force: true });
  }

  stats() {
    const files = fs.readdirSync(this.rootDir);
    const metadataFiles = files.filter(name => name.endsWith(META_SUFFIX));
    let entries = 0;
    let fresh = 0;
    let stale = 0;
    let bytes = 0;
    const byScope = {};

    for (const file of metadataFiles) {
      try {
        const metadata = JSON.parse(fs.readFileSync(path.join(this.rootDir, file), 'utf8'));
        entries += 1;
        bytes += Number(metadata.size) || 0;
        if (Number(metadata.expiresAt) > this.now()) fresh += 1;
        else stale += 1;
        const scope = metadata.scope || 'unknown';
        byScope[scope] = (byScope[scope] || 0) + 1;
      } catch {
        // Corrupt metadata is ignored; the resolver can replace it later.
      }
    }

    return { entries, fresh, stale, bytes, byScope };
  }

  clearStale({ olderThanMs = 0 } = {}) {
    const cutoff = this.now() - Math.max(0, olderThanMs);
    let removed = 0;
    for (const file of fs.readdirSync(this.rootDir)) {
      if (!file.endsWith(META_SUFFIX)) continue;
      const key = file.slice(0, -META_SUFFIX.length);
      try {
        const metadata = JSON.parse(fs.readFileSync(this.#metaPath(key), 'utf8'));
        if (Number(metadata.expiresAt) <= cutoff) {
          this.remove(key);
          removed += 1;
        }
      } catch {
        this.remove(key);
        removed += 1;
      }
    }
    return removed;
  }
}
