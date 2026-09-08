import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AssetCache } from '../plugins/life-agent/server/assets/asset-cache.mjs';
import { AssetResolver } from '../plugins/life-agent/server/assets/asset-resolver.mjs';

const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'life-agent-assets-'));
let clock = 1_000;
const now = () => clock;
const cache = new AssetCache({ rootDir, now });

try {
  const key = cache.key('brand', 'example');
  const written = cache.write({
    key,
    bytes: Buffer.from([1, 2, 3]),
    contentType: 'image/png',
    sourceUrl: 'https://example.com/favicon.ico',
    ttlMs: 100,
    scope: 'brand',
    identity: 'example',
  });
  assert.equal(written.fresh, true);
  assert.deepEqual(cache.read(key, { allowStale: false }).bytes, Buffer.from([1, 2, 3]));

  clock += 101;
  assert.equal(cache.read(key, { allowStale: false }), null);
  assert.equal(cache.read(key).fresh, false);
  assert.equal(cache.stats().stale, 1);

  const calls = [];
  const fetchImpl = async url => {
    calls.push(String(url));
    return new Response(Buffer.from([137, 80, 78, 71]), {
      status: 200,
      headers: { 'content-type': 'image/png', 'content-length': '4' },
    });
  };
  const lookup = async () => [{ address: '93.184.216.34', family: 4 }];
  const resolver = new AssetResolver({ cache, fetchImpl, lookup, iconTtlMs: 50, backgroundTtlMs: 50 });

  const first = await resolver.resolveBrand({ brandId: 'stripe', brandName: 'Stripe' });
  assert.equal(first.status, 'fetched');
  assert.equal(first.metadata.contentType, 'image/png');
  assert.ok(calls.some(url => url.includes('stripe.com/favicon.ico')));

  calls.length = 0;
  const second = await resolver.resolveBrand({ brandId: 'stripe', brandName: 'Stripe' });
  assert.equal(second.status, 'cache');
  assert.equal(calls.length, 0);

  clock += 51;
  const failingResolver = new AssetResolver({
    cache,
    fetchImpl: async () => { throw new Error('origin unavailable'); },
    lookup,
    iconTtlMs: 50,
  });
  const stale = await failingResolver.resolveBrand({ brandId: 'stripe', brandName: 'Stripe' });
  assert.equal(stale.status, 'stale-cache');
  assert.equal(stale.fresh, false);

  const fallback = await resolver.resolveBrand({ brandName: 'North & Pine' });
  assert.equal(fallback.status, 'fallback');
  assert.equal(fallback.fallback, 'NP');

  const background = await resolver.resolveBackground({ theme: 'flight' });
  assert.equal(background.status, 'fetched');
  assert.equal(background.metadata.scope, 'background');

  const removed = cache.clearStale();
  assert.ok(removed >= 1);

  console.log('Life Agent asset cache tests passed.');
} finally {
  fs.rmSync(rootDir, { recursive: true, force: true });
}
