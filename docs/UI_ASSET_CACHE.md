# Life Agent UI Asset Cache

> **Status:** v0.1 implementation contract
> **Owns:** Endpoint-owned UI brand/icon and curated contextual-background cache behavior.
> **Does not own:** `LIFE.md`, user preferences, provider data, accounts, authentication, arbitrary web proxying, payment state, or cache administration exposed to users/models.

## Authority and storage

`LIFE.md` is user-owned Life Agent operating state. Asset bytes and cache metadata are service infrastructure owned by the hosted Life Agent MCP endpoint.

Hosted deployments configure `LIFE_AGENT_ASSET_CACHE_DIR`. It must be absolute, endpoint/service-owned, and disjoint from `PLUGIN_DATA` in both directions. `PLUGIN_DATA/assets` is rejected, as is a cache directory that is a parent of `PLUGIN_DATA` or equal to it. If ownership cannot be established, startup fails closed. Local stdio uses a process-scoped ephemeral temporary cache when no hosted path is configured; it never silently places bytes in `PLUGIN_DATA`.

The cache owns SHA-256-shaped keys, positive TTLs, negative-cache TTLs, stale-if-error behavior, bounded retrieval, and cleanup. Current defaults are 31 days for icons/backgrounds and 6 hours for failed resolutions. Icons are capped at 512 KiB and backgrounds at 8 MiB.

## Resolution

`life_asset_resolve` is bounded and read-only. Its model-facing schema accepts only `kind`, trusted `brandId`/`brandName`, curated `theme`, and an optional bounded embed flag. It exposes neither `url` nor `domain` target inputs. Known brand domains and curated background identities are the only fetch targets.

Resolution is:

```text
trusted identity/theme -> fresh cache -> safe retrieval -> stale cache on error
-> short negative cache -> initials/neutral fallback
```

Retrieval requires HTTPS, rejects URL credentials and non-443 ports, validates every redirect, rejects private/loopback/link-local/multicast destinations, bounds bytes, validates raster MIME types, and keeps brand retrieval within the trusted canonical domain. SVG is not accepted as an embedded data URI or arbitrary asset response.

## Read-only asset route

Hosted deployments expose only:

```text
GET  /assets/<64 lowercase hexadecimal sha256 key>
HEAD /assets/<64 lowercase hexadecimal sha256 key>
```

The route reads an existing endpoint cache entry and returns `nosniff`, bounded content type/length, and fresh/stale cache headers. Query strings, arbitrary URLs, arbitrary domains, and all other methods are rejected. There is no `/assets?url=...` proxy.

## Tool boundary

The user/model catalog contains `life_asset_resolve` only. Shared service operations such as cache status, clear, TTL administration, and cache lifecycle remain operator/service infrastructure and are intentionally absent from the ordinary Life Agent tool catalog. The visual design may show diagnostics as a reference concept; that is not a permission grant.
