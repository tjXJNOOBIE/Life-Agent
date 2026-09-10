# Life Agent Final Draft

> **Status:** Working design contract for v0.1
> **Owns:** Outcome orchestration, capability routing, commitment handling, verification, safe UI, task-scoped browser boundaries, and user-state principles.
> **Does not own:** Provider authentication or records, payment credentials, calendars, inboxes, browser profiles, third-party sessions, or a private scheduler.

## About

Life Agent turns an ordinary-language outcome into coordinated work. The user states what should become true; Life Agent discovers the capabilities already available in the host, selects providers only after capability resolution, acts as far as authorized, verifies reality, and handles the consequences.

The core loop is:

```text
Interpret -> Resolve capability -> Select provider -> Act -> Handoff if required
-> Verify -> Repair/propagate consequences -> Persist only durable state
```

## Ownership rules

Life Agent owns interpretation, capability-first/provider-second routing, multi-provider orchestration, continuation semantics, verification strategy, consequence expansion, and orchestration UI.

The host and connected providers own authentication, authorization enforcement, browser/computer use, app connections, payment confirmation, provider records, scheduled tasks, and native rich UI. Life Agent never receives a password or MFA secret and never stores reusable website or identity-provider session material.

## Product behavior

### Outcome-first routing

The user should be able to say “Book a flight to Seattle.” Life Agent first resolves travel search, booking, calendar, communication, and transport capabilities, then chooses among currently available providers. Provider names are implementation details unless a choice is consequential.

### Commitment Surface

After a choice, the selected item becomes compact context. The primary surface shows the consequences it creates, inline conflict repair, only the remaining micro-decisions, and the smallest approval boundary. It does not turn every fare, seat, bag, or conflict into a separate giant page.

### Verification and retry

A provider call is not proof of completion. Every consequential mutation must be checked against authoritative provider state. If a mutation fails ambiguously, Life Agent verifies whether it already applied before deciding whether retry is safe. Materially changed price, route, target, recipient, terms, or financial impact returns to the user.

### Browser fallback

Browser capability is task-scoped and outcome-specific. It is used only when no suitable connected capability exists. Life Agent may prepare work to the provider boundary, then hand off authentication, payment, MFA, password-only login, or legally required consent to the user.

## UI contract

The production resources and matching tools are:

| Surface | Resource URI | Tool |
| --- | --- | --- |
| Choice | `ui://life-agent/choices-v2.html` | `life_show_choices` |
| Commitment | `ui://life-agent/commitment-v2.html` | `life_show_commitment` |
| Handoff | `ui://life-agent/handoff-v2.html` | `life_show_handoff` |
| Live Execution | `ui://life-agent/execution-v2.html` | `life_show_execution` |
| Outcome | `ui://life-agent/outcome-v2.html` | `life_show_outcome` |
| Settings | `ui://life-agent/settings-v2.html` | `life_show_settings` |
| Capability Route | `ui://life-agent/capability-route-v2.html` | `life_show_capability_route` |

The accepted visual contract is the dark contextual Glass UI System. Shared CSS preserves the Apple system font stack, compact density, dark translucent glass, restrained borders, 22px outer material radius, 16px option cards, compact 3-up choices, provider marks, and progressive disclosure.

MCP Apps view behavior uses `2026-01-26`: widgets handle `ui/initialize`, host model-context updates, `ui/update-model-context` for small decisions, `ui/message` for explicit continuation CTAs, sizing, and teardown. They render server-sanitized `toolOutput` only. Production CSP disables network connections, storage, cookies, arbitrary forms, base tags, and third-party rendering.

## Storage and privacy

`LIFE.md` is user-owned and durable. It may contain preferences, standing permissions, relationship/channel mappings, continuation context, unresolved commitments, learned defaults, and safe `ExternalIdentityLink` metadata:

```text
provider, stableProviderSubject, displayName, emailHint, linkedAt
```

It must not contain tokens, cookies, passwords, MFA or recovery secrets, browser profiles, reusable sessions, card data, or private keys.

The UI asset cache is not plugin state. The hosted MCP endpoint owns cache bytes, SHA-shaped keys, TTLs, negative entries, stale-if-error behavior, bounded retrieval, and cleanup. A configured absolute `LIFE_AGENT_ASSET_CACHE_DIR` must not overlap `PLUGIN_DATA` as a child, parent, or equal path. Local stdio uses an ephemeral process-scoped directory when no endpoint cache is configured. The read-only route is `/assets/<cache-key>`; arbitrary URL proxying and user/model cache administration do not exist.

## Authentication lifecycle

An isolated temporary browser runtime is created for each root task. An `AuthLease` is bound to the root task, runtime, HTTPS origin, identity provider, and expiry, with states `AUTH_REQUIRED`, `AUTHENTICATING`, `AUTHENTICATED`, `EXPIRED`, and `DESTROYED`. Runtime teardown destroys leases and actual browser resources on success, cancel, timeout, and failure.

The guarantee is precise: **Life Agent retains no reusable website or identity-provider session material after the task completes.** This does not claim that a third-party server-side session was terminated.

`BrowserApprovalPolicy` separates authentication from authorization. It requires user involvement for identity linking, OAuth scope changes, passwords, MFA, recovery, core security, material legal terms, payment method changes, changed purchase amounts, targets, recipients, routes, prices, and terms.

## MCP protocol

The stdio server supports legacy `2025-11-25` and current `2026-07-28`. Current clients may call `server/discover`. Current list/resource results include `resultType`, `ttlMs`, and `cacheScope`; consequential tool calls return `ttlMs: 0` and `cacheScope: none`. Legacy clients receive the ordinary MCP result shapes. The `life_asset_resolve` tool remains bounded and read-only; shared cache status/clear operations are operator infrastructure, not user/model tools.

## Validation

The local suite exercises actual server subprocess behavior, not only imports. It validates manifests, all seven resources/tools, commitment and outcome models, sanitized output, modern and legacy protocol paths, UI lifecycle strings, auth lease transitions, browser teardown on terminal paths, safe identity links, SSO priority and password handoff, deterministic approval, verify-before-retry decisions, redirect/IP/domain/MIME/size asset safety, negative cache, stale-if-error, asset routes, cache/user-state separation, payload bounds, prototype-pollution rejection, and cache-admin absence.

Real Google/Microsoft/GitHub/Discord authentication ceremonies, provider-side mutations, third-party server-session termination, and host-specific ChatGPT installation remain manual/provider boundaries and are not represented as completed by local tests.
