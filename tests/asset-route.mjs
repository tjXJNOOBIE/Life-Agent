import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AssetCache } from '../plugins/life-agent/server/assets/asset-cache.mjs';
import { assetPathForKey, readCachedAssetRoute } from '../plugins/life-agent/server/assets/asset-route.mjs';

const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'life-agent-route-'));
try {
  const cache = new AssetCache({ rootDir, now: () => 100 });
  const key = cache.key('brand', 'stripe');
  cache.write({
    key,
    bytes: Buffer.from([1, 2, 3]),
    contentType: 'image/png',
    sourceUrl: 'https://stripe.com/favicon.ico',
    ttlMs: 1_000,
    scope: 'brand',
    identity: 'stripe',
  });

  assert.equal(assetPathForKey(key), `/assets/${key}`);
  assert.throws(() => assetPathForKey('stripe'), /invalid asset cache key/);

  const get = readCachedAssetRoute({ cache, path: `/assets/${key}` });
  assert.equal(get.status, 200);
  assert.equal(get.headers['content-type'], 'image/png');
  assert.equal(get.headers['x-content-type-options'], 'nosniff');
  assert.deepEqual(get.body, Buffer.from([1, 2, 3]));

  const head = readCachedAssetRoute({ cache, method: 'HEAD', path: `/assets/${key}` });
  assert.equal(head.status, 200);
  assert.equal(head.body, null);

  assert.equal(readCachedAssetRoute({ cache, path: `/assets/${key}?url=https://evil.example` }).status, 404);
  assert.equal(readCachedAssetRoute({ cache, path: '/assets?url=https://evil.example' }).status, 404);
  assert.equal(readCachedAssetRoute({ cache, method: 'POST', path: `/assets/${key}` }).status, 405);
  assert.equal(readCachedAssetRoute({ cache, path: `/assets/${'0'.repeat(64)}` }).status, 404);

  console.log('Life Agent bounded asset route tests passed.');
} finally {
  fs.rmSync(rootDir, { recursive: true, force: true });
}
