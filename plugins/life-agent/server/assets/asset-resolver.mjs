import dns from 'node:dns/promises';
import net from 'node:net';

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const ICON_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]);
const BACKGROUND_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

const KNOWN_BRAND_DOMAINS = Object.freeze({
  alaska: 'alaskaair.com',
  apple: 'apple.com',
  delta: 'delta.com',
  hilton: 'hilton.com',
  hyatt: 'hyatt.com',
  lyft: 'lyft.com',
  marriott: 'marriott.com',
  microsoft: 'microsoft.com',
  onemedical: 'onemedical.com',
  paypal: 'paypal.com',
  seatgeek: 'seatgeek.com',
  slack: 'slack.com',
  stripe: 'stripe.com',
  stubhub: 'stubhub.com',
  ticketmaster: 'ticketmaster.com',
  uber: 'uber.com',
  united: 'united.com',
});

const BACKGROUND_CATALOG = Object.freeze({
  flight: 'https://images.unsplash.com/photo-1757865579141-4cde5cf8ea0c?auto=format&fit=crop&w=2400&q=72',
  dining: 'https://images.unsplash.com/photo-1734770295030-048576b442d9?auto=format&fit=crop&w=2400&q=72',
  office: 'https://images.unsplash.com/photo-1772475385509-93fd87a2d4ba?auto=format&fit=crop&w=2400&q=72',
  drive: 'https://images.unsplash.com/photo-1588192754695-ea55aef5117f?auto=format&fit=crop&fm=jpg&q=68&w=2400',
  event: 'https://images.unsplash.com/photo-1579696412992-6c3706e96cdf?auto=format&fit=crop&q=68&w=2400',
});

function normalizeBrandId(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '');
}

function normalizeDomain(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return null;
  const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
  if (url.protocol !== 'https:') throw new Error('brand domain must use https');
  return url.hostname;
}

function fallbackInitials(name) {
  const words = String(name || '')
    .trim()
    .split(/\s+/)
    .map(word => word.replace(/[^a-z0-9]/gi, ''))
    .filter(Boolean);
  if (words.length === 0) return '';
  return words.slice(0, 2).map(word => word[0]).join('').toUpperCase();
}

function isPrivateAddress(address) {
  const family = net.isIP(address);
  if (family === 4) {
    const parts = address.split('.').map(Number);
    const [a, b] = parts;
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  if (family === 6) {
    const normalized = address.toLowerCase();
    return normalized === '::' || normalized === '::1' || normalized.startsWith('fe80:') ||
      normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('ff');
  }
  return true;
}

async function assertPublicUrl(url, lookup = dns.lookup) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') throw new Error('asset origins must use https');
  if (parsed.username || parsed.password) throw new Error('asset origins may not contain credentials');
  if (parsed.port && parsed.port !== '443') throw new Error('asset origins may only use port 443');
  const addresses = await lookup(parsed.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(entry => isPrivateAddress(entry.address))) {
    throw new Error('asset origin did not resolve to a public address');
  }
  return parsed;
}

async function readLimitedBody(response, maxBytes) {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) throw new Error('asset exceeds size limit');
  if (!response.body) return Buffer.alloc(0);

  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new Error('asset exceeds size limit');
      chunks.push(Buffer.from(value));
    }
  } finally {
    if (size > maxBytes) await reader.cancel().catch(() => {});
  }
  return Buffer.concat(chunks, size);
}

async function fetchPublic(fetchImpl, url, { maxBytes, acceptedTypes, lookup, maxRedirects = 4 }) {
  let current = new URL(url);
  for (let redirect = 0; redirect <= maxRedirects; redirect += 1) {
    await assertPublicUrl(current, lookup);
    const response = await fetchImpl(current, {
      redirect: 'manual',
      headers: {
        accept: [...acceptedTypes].join(', '),
        'user-agent': 'Life-Agent-UI-Asset-Resolver/0.1',
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error('redirect missing location');
      current = new URL(location, current);
      continue;
    }
    if (!response.ok) throw new Error(`asset request failed with ${response.status}`);

    const contentType = String(response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!acceptedTypes.has(contentType)) throw new Error(`unsupported asset content type: ${contentType || 'unknown'}`);
    const bytes = await readLimitedBody(response, maxBytes);
    if (!bytes.length) throw new Error('asset response was empty');
    return { bytes, contentType, sourceUrl: current.toString() };
  }
  throw new Error('too many redirects');
}

async function fetchHomepageIcon(fetchImpl, domain, { lookup, maxIconBytes }) {
  const homepage = new URL(`https://${domain}/`);
  await assertPublicUrl(homepage, lookup);
  const response = await fetchImpl(homepage, {
    redirect: 'manual',
    headers: { accept: 'text/html', 'user-agent': 'Life-Agent-UI-Asset-Resolver/0.1' },
  });
  if (!response.ok) throw new Error(`homepage request failed with ${response.status}`);
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  if (!contentType.startsWith('text/html')) throw new Error('homepage was not html');
  const html = (await readLimitedBody(response, 256 * 1024)).toString('utf8');
  const tags = html.match(/<link\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const rel = tag.match(/\brel=["']([^"']+)["']/i)?.[1] || '';
    if (!/\b(?:shortcut\s+)?icon\b/i.test(rel)) continue;
    const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (!href || href.startsWith('data:')) continue;
    const candidate = new URL(href, homepage);
    try {
      return await fetchPublic(fetchImpl, candidate, { maxBytes: maxIconBytes, acceptedTypes: ICON_TYPES, lookup });
    } catch {
      // Try the next icon declaration.
    }
  }
  throw new Error('no supported page icon found');
}

export class AssetResolver {
  constructor({
    cache,
    fetchImpl = globalThis.fetch,
    lookup = dns.lookup,
    iconTtlMs = 31 * DAY,
    backgroundTtlMs = 31 * DAY,
    negativeTtlMs = 6 * HOUR,
    maxIconBytes = 512 * 1024,
    maxBackgroundBytes = 8 * 1024 * 1024,
  }) {
    if (!cache) throw new Error('cache is required');
    if (typeof fetchImpl !== 'function') throw new Error('fetch implementation is required');
    this.cache = cache;
    this.fetchImpl = fetchImpl;
    this.lookup = lookup;
    this.iconTtlMs = iconTtlMs;
    this.backgroundTtlMs = backgroundTtlMs;
    this.negativeTtlMs = negativeTtlMs;
    this.maxIconBytes = maxIconBytes;
    this.maxBackgroundBytes = maxBackgroundBytes;
  }

  async resolveBrand({ brandId, brandName, domain } = {}) {
    const id = normalizeBrandId(brandId || brandName);
    const host = normalizeDomain(domain || KNOWN_BRAND_DOMAINS[id]);
    const identity = id || host;
    if (!identity) return { kind: 'brand', status: 'fallback', fallback: fallbackInitials(brandName) };

    const key = this.cache.key('brand', identity);
    const cached = this.cache.read(key);
    if (cached?.fresh) return { kind: 'brand', status: 'cache', fallback: fallbackInitials(brandName || id), ...cached };

    const negative = this.cache.readMiss(key);
    if (negative) {
      if (cached) return { kind: 'brand', status: 'stale-cache', fallback: fallbackInitials(brandName || id), error: negative.metadata.error, ...cached };
      return { kind: 'brand', status: 'negative-cache', key, fallback: fallbackInitials(brandName || id), error: negative.metadata.error };
    }

    if (!host) {
      if (cached) return { kind: 'brand', status: 'stale-cache', fallback: fallbackInitials(brandName || id), ...cached };
      return { kind: 'brand', status: 'fallback', key, fallback: fallbackInitials(brandName || id) };
    }

    try {
      let fetched;
      try {
        fetched = await fetchPublic(this.fetchImpl, `https://${host}/favicon.ico`, {
          maxBytes: this.maxIconBytes,
          acceptedTypes: ICON_TYPES,
          lookup: this.lookup,
        });
      } catch {
        fetched = await fetchHomepageIcon(this.fetchImpl, host, { lookup: this.lookup, maxIconBytes: this.maxIconBytes });
      }
      const written = this.cache.write({
        key,
        bytes: fetched.bytes,
        contentType: fetched.contentType,
        sourceUrl: fetched.sourceUrl,
        ttlMs: this.iconTtlMs,
        scope: 'brand',
        identity,
      });
      return { kind: 'brand', status: 'fetched', fallback: fallbackInitials(brandName || id), ...written };
    } catch (error) {
      if (cached) return { kind: 'brand', status: 'stale-cache', fallback: fallbackInitials(brandName || id), error: error.message, ...cached };
      this.cache.writeMiss({ key, ttlMs: this.negativeTtlMs, scope: 'brand', identity, error: error.message });
      return { kind: 'brand', status: 'fallback', key, fallback: fallbackInitials(brandName || id), error: error.message };
    }
  }

  async resolveBackground({ theme } = {}) {
    const normalizedTheme = normalizeBrandId(theme);
    const sourceUrl = BACKGROUND_CATALOG[normalizedTheme];
    if (!sourceUrl) return { kind: 'background', status: 'fallback', theme: normalizedTheme || 'generic' };

    const key = this.cache.key('background', normalizedTheme);
    const cached = this.cache.read(key);
    if (cached?.fresh) return { kind: 'background', status: 'cache', theme: normalizedTheme, ...cached };

    const negative = this.cache.readMiss(key);
    if (negative) {
      if (cached) return { kind: 'background', status: 'stale-cache', theme: normalizedTheme, error: negative.metadata.error, ...cached };
      return { kind: 'background', status: 'negative-cache', theme: normalizedTheme, key, error: negative.metadata.error };
    }

    try {
      const fetched = await fetchPublic(this.fetchImpl, sourceUrl, {
        maxBytes: this.maxBackgroundBytes,
        acceptedTypes: BACKGROUND_TYPES,
        lookup: this.lookup,
      });
      const written = this.cache.write({
        key,
        bytes: fetched.bytes,
        contentType: fetched.contentType,
        sourceUrl: fetched.sourceUrl,
        ttlMs: this.backgroundTtlMs,
        scope: 'background',
        identity: normalizedTheme,
      });
      return { kind: 'background', status: 'fetched', theme: normalizedTheme, ...written };
    } catch (error) {
      if (cached) return { kind: 'background', status: 'stale-cache', theme: normalizedTheme, error: error.message, ...cached };
      this.cache.writeMiss({ key, ttlMs: this.negativeTtlMs, scope: 'background', identity: normalizedTheme, error: error.message });
      return { kind: 'background', status: 'fallback', theme: normalizedTheme, key, error: error.message };
    }
  }

  read(key, options) {
    return this.cache.read(key, options);
  }

  stats() {
    return this.cache.stats();
  }

  clearStale(options) {
    return this.cache.clearStale(options);
  }
}

export const AssetCatalog = Object.freeze({
  brands: KNOWN_BRAND_DOMAINS,
  backgrounds: BACKGROUND_CATALOG,
});
