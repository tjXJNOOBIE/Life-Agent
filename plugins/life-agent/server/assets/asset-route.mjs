const CACHE_KEY = /^[a-f0-9]{64}$/;

export function assetPathForKey(key) {
  const normalized = String(key || '').trim().toLowerCase();
  if (!CACHE_KEY.test(normalized)) throw new Error('invalid asset cache key');
  return `/assets/${normalized}`;
}

export function readCachedAssetRoute({ cache, method = 'GET', path = '' } = {}) {
  if (!cache) throw new Error('cache is required');
  const verb = String(method || 'GET').toUpperCase();
  if (verb !== 'GET' && verb !== 'HEAD') {
    return { status: 405, headers: { allow: 'GET, HEAD' }, body: null };
  }

  const parsed = new URL(String(path || ''), 'https://life-agent.invalid');
  if (parsed.search || parsed.hash) return { status: 404, headers: {}, body: null };
  const match = parsed.pathname.match(/^\/assets\/([a-f0-9]{64})$/);
  if (!match) return { status: 404, headers: {}, body: null };

  const entry = cache.read(match[1], { allowStale: true });
  if (!entry) return { status: 404, headers: {}, body: null };

  const headers = {
    'content-type': entry.metadata.contentType,
    'content-length': String(entry.bytes.length),
    'cache-control': entry.fresh ? 'public, max-age=86400' : 'public, max-age=60, stale-if-error=86400',
    'x-content-type-options': 'nosniff',
  };
  return { status: 200, headers, body: verb === 'HEAD' ? null : entry.bytes };
}
