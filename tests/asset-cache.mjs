import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AssetCache } from '../plugins/life-agent/server/assets/asset-cache.mjs';
import { AssetCatalog, AssetResolver } from '../plugins/life-agent/server/assets/asset-resolver.mjs';

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
  const resolver = new AssetResolver({ cache, fetchImpl, lookup, iconTtlMs: 50, backgroundTtlMs: 50, negativeTtlMs: 25 });

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
    negativeTtlMs: 25,
  });
  const stale = await failingResolver.resolveBrand({ brandId: 'stripe', brandName: 'Stripe' });
  assert.equal(stale.status, 'stale-cache');
  assert.equal(stale.fresh, false);
  const stripeKey = cache.key('brand', 'stripe');
  assert.equal(cache.readMiss(stripeKey)?.metadata.error, 'origin unavailable');

  const staleAgain = await failingResolver.resolveBrand({ brandId: 'stripe', brandName: 'Stripe' });
  assert.equal(staleAgain.status, 'stale-cache');
  assert.equal(cache.readMiss(stripeKey)?.fresh, true);

  const fallback = await resolver.resolveBrand({ brandName: 'North & Pine' });
  assert.equal(fallback.status, 'fallback');
  assert.equal(fallback.fallback, 'NP');

  const untrusted = await resolver.resolveBrand({ brandId: 'unknown', brandName: 'Unknown', domain: 'unknown.example' });
  assert.equal(untrusted.status, 'fallback');
  assert.match(untrusted.error, /trusted canonical catalog/);

  let failedFetches = 0;
  const missResolver = new AssetResolver({
    cache,
    fetchImpl: async () => { failedFetches += 1; throw new Error('blocked'); },
    lookup,
    negativeTtlMs: 25,
    brandDomains: { ...AssetCatalog.brands, blockedbrand: 'blocked.example' },
  });
  const missed = await missResolver.resolveBrand({ brandId: 'blockedbrand', brandName: 'Blocked Brand' });
  assert.equal(missed.status, 'fallback');
  assert.ok(failedFetches >= 1);
  const fetchCountAfterMiss = failedFetches;
  const negativeHit = await missResolver.resolveBrand({ brandId: 'blockedbrand', brandName: 'Blocked Brand' });
  assert.equal(negativeHit.status, 'negative-cache');
  assert.equal(failedFetches, fetchCountAfterMiss);
  assert.ok(cache.stats().misses >= 2);

  clock += 26;
  await missResolver.resolveBrand({ brandId: 'blockedbrand', brandName: 'Blocked Brand' });
  assert.ok(failedFetches > fetchCountAfterMiss);

  const background = await resolver.resolveBackground({ theme: 'flight' });
  assert.equal(background.status, 'fetched');
  assert.equal(background.metadata.scope, 'background');

  const removed = cache.clearStale();
  assert.ok(removed >= 1);

  console.log('Life Agent asset cache tests passed.');
} finally {
  fs.rmSync(rootDir, { recursive: true, force: true });
}
