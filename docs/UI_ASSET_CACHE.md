# Life Agent UI Asset Cache

> **Status:** Working implementation contract  
> **Owns:** UI-only brand-icon and contextual-background resolution/cache behavior.  
> **Does not own:** Provider business data, user accounts, arbitrary web proxying, authentication, payments, or durable application records.

## Purpose

Life Agent uses recognizable business/provider marks and contextual photographic backgrounds to make compact in-chat UI easier to scan. Those assets should not be fetched from third-party websites every time a card renders.

The asset layer therefore provides one bounded flow:

```text
resolve requested UI identity/theme
-> fresh cache
-> safe public-origin retrieval when allowed
-> stale cache on origin failure
-> short-lived negative cache after failed retrieval
-> initials/blank fallback
```

The cache is disposable UI state. External providers remain authoritative for everything except the cached image bytes themselves.

## Storage

The local plugin stores assets below the host-provided writable plugin data directory:

```text
PLUGIN_DATA/
├── LIFE.md
└── assets/
```

Each successful entry has content bytes plus metadata including scope, identity, source URL, content type, byte size, stored time, and expiry. Failed resolutions may write a small negative-cache metadata entry so an unavailable origin is not retried on every render.

Current defaults:

- brand icon freshness: 31 days;
- contextual background freshness: 31 days;
- failed-resolution negative cache: 6 hours;
- stale cached assets remain eligible when a refresh attempt fails;
- icons are bounded to 512 KiB;
- backgrounds are bounded to 8 MiB.

These values are runtime policy and may change as evidence warrants.

## Brand Resolution

Brand identity is generic UI metadata, not a flight-specific feature. It may be used for airlines, hotels, restaurants, merchants, payment providers, messaging systems, clinics, repair shops, rideshare providers, retailers, SaaS tools, and other recognizable entities.

Resolution order:

1. fresh cached icon;
2. known canonical brand-domain mapping when available;
3. HTTPS `<domain>/favicon.ico`;
4. supported page-declared icon from the canonical public HTTPS site;
5. stale cached icon if refresh fails;
6. negative-cache hit;
7. clean initials or blank icon fallback.

SVG is intentionally not accepted by the initial resolver. Supported image types are bounded raster/icon formats so the cache does not become a script-bearing asset transport.

## Background Resolution

Contextual backgrounds are theme-driven and curated. The model does not provide an arbitrary image URL for the resolver to proxy.

Examples:

- `flight` -> airplane / clouds;
- `dining` -> restaurant interior;
- `office` -> work / business surface;
- `drive` -> vehicle / road;
- `event` -> venue / crowd.

Additional themes should be added to the curated catalog rather than turning background resolution into an open URL fetcher.

## Network Safety

Dynamic brand lookup is not a general-purpose proxy.

The resolver:

- requires HTTPS;
- rejects embedded credentials;
- limits remote origins to port 443;
- resolves hostnames before fetching and rejects loopback, private, link-local, multicast, and other non-public literal destinations;
- revalidates redirects;
- bounds response size;
- validates supported content types;
- uses manual redirect handling;
- caches failures temporarily to avoid repeated requests.

The public HTTPS app transport should serve cached assets from a Life Agent-controlled asset origin. ChatGPT UI then needs only that controlled asset domain in its CSP instead of a growing allowlist of every provider represented in a card.

## Transport Boundary

The current stdio MCP shim can resolve/cache assets and optionally embed small cached assets as data URIs. A future public HTTPS transport should reuse the same cache/resolver and expose cached bytes through a narrow read-only asset route such as:

```text
GET /assets/<cache-key>
```

That route must only read cache keys created by the resolver. It must not accept or proxy arbitrary target URLs.

## Failure Semantics

Asset failure must never block the underlying Life Agent workflow.

If an icon cannot be resolved, render initials or no icon. If a contextual background is unavailable, render the same glass component with its neutral fallback material. Provider actions, verification, reservations, payments, messages, and other workflow behavior continue independently of cosmetic asset state.
