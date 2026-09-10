# Life Agent

**Ask for the outcome. Life Agent handles the steps.**

Life Agent is a portable outcome-first orchestration plugin. It resolves the capability needed for a request before selecting an available provider, performs authorized work, verifies consequential mutations, and handles the commitments created by the result.

Life Agent does not become an account system, payment vault, calendar, inbox, CRM, scheduler, browser-profile store, or provider proxy. Connected providers own their data and authentication; the host owns browser/computer use, app connections, approvals, and native UI.

## v0.1 surfaces

The dependency-free MCP server exposes seven production UI resources and matching read-only render tools:

1. Choice — compact comparable options.
2. Commitment Surface — the selected item, consequences, conflict repair, micro-decisions, and the smallest remaining approval boundary.
3. Handoff — a narrow user-assisted authentication, payment, MFA, or provider step.
4. Live Execution — verified step state and required handoffs.
5. Outcome — a compact verified receipt and justified follow-ups.
6. Settings — preferences, standing permissions, and safe identity metadata.
7. Capability Route — capability-first/provider-second routing evidence.

The accepted visual language is the dark Apple-like contextual Glass UI System: compact dense layouts, restrained blurred glass, recognizable provider marks, 22px outer materials, 16px option cards, progressive disclosure, and one obvious primary action. The checked-in reference fixture `fixtures/life-agent-glass-ui-system.html` is locked at 37,404 bytes with SHA-256 `f497d59d4cb86493009dc9412bbe60dfde313d0516e8b1cbbf47228967e6b7f5`. UI resources are versioned as `ui://life-agent/*-v2.html` and speak the MCP Apps view contract `2026-01-26`.

## Install for local ChatGPT Desktop testing

The marketplace is `.agents/plugins/marketplace.json` and the plugin is under `plugins/life-agent/`.

```bash
git clone https://github.com/tjXJNOOBIE/Life-Agent.git
cd Life-Agent
npm test
```

Open the repository in ChatGPT Desktop, choose **Plugins Directory**, add **Life Agent Dev**, and install **Life Agent**. Codex CLI can add the development marketplace with:

```bash
codex plugin marketplace add tjXJNOOBIE/Life-Agent --ref main
```

## Hosted MCP adapter

The merged `main` tree also includes a dependency-free HTTP adapter for a
Tavall-hosted deployment. Configure an endpoint-owned absolute
`LIFE_AGENT_ASSET_CACHE_DIR`, then run:

```bash
LIFE_AGENT_ASSET_CACHE_DIR=/var/lib/life-agent/assets \
LIFE_AGENT_HTTP_AUTH_TOKEN='generate-a-secret-at-least-16-characters' \
LIFE_AGENT_PORT=3000 npm run serve:http
```

The adapter exposes `GET /healthz`, `POST /mcp`, and read-only
`GET|HEAD /assets/<64-lowercase-hex-sha256>`. Loopback development may omit the
token; a non-loopback bind fails closed unless the bearer token is configured.
It wraps the same MCP server used by stdio and does not add provider
credentials, arbitrary URL fetching, or provider mutation authority. A host
supplies the Strands/model/provider loop and performs explicit HITL before
consequential actions.

### Current Tavall acceptance deployment

The merged `main` commit `8b489a0691d56ca02448868a7d073b1b6e5dca52` is registered in Tavall Cloud as `life-agent-hosted-demo`, owned by `dev-storage`, using the canonical `EXTERNAL_SYSTEMD` service lifecycle and unit `e2e-life-agent-hosted-demo.service`. Tavall reports the service `RUNNING` after start and restart; the loopback acceptance URL is `http://127.0.0.1:3300`. Public HTTPS/tunnel exposure is intentionally not claimed until tunnel authorization and DNS/proxy ownership are available.

## MCP and security boundaries

The stdio server supports legacy MCP `2025-11-25` and current MCP `2026-07-28`. Current clients can use `server/discover`; list/resource results carry explicit discriminator and cache metadata, while tool calls are explicitly uncached.

Tool output is server-sanitized before it reaches a widget. Credential/session-shaped fields and prototype-pollution keys are rejected, and output depth, node count, array length, string length, and aggregate size are bounded. Widgets render only `window.openai.toolOutput` plus standard `ui/initialize`, `ui/update-model-context`, `ui/message`, `ui/size`, and `ui/teardown` messages. They do not fetch network resources, use browser storage/cookies, submit forms, or render arbitrary URLs.

`LIFE.md` is user-owned operating state. It may contain preferences, standing permissions, relationship/channel mappings, continuation context, unresolved commitments, learned defaults, and safe identity metadata. It never stores passwords, tokens, cookies, browser profiles, MFA/recovery material, or payment credentials.

UI asset bytes are endpoint-owned service infrastructure. A configured `LIFE_AGENT_ASSET_CACHE_DIR` must be absolute, service-owned, and disjoint from `PLUGIN_DATA` in both directions. Local stdio falls back to an ephemeral process-scoped cache. `life_asset_resolve` accepts trusted brand/theme identities only; shared cache administration is not exposed as a user/model tool. Hosted deployments serve cached bytes through `GET /assets/<64-hex-sha256-key>`, never `GET /assets?url=...`.

## Browser execution model

Browser fallback is task-scoped and outcome-specific. Each root task creates an isolated temporary runtime and an `AuthLease` bound to that task, runtime, origin, and identity provider. The runtime is torn down on success, cancellation, timeout, and failure. Persistent `ExternalIdentityLink` values contain only provider, stable subject, display name, email hint, and link time. Authentication material is never retained; password-only sites remain user-assisted handoffs.

Authentication is separate from authorization. `BrowserApprovalPolicy` is deterministic and returns to the user for identity linking, OAuth scope changes, passwords, MFA, recovery, security settings, material legal/financial changes, changed targets, changed routes, changed prices, or changed terms. Consequential mutations verify provider state before any retry after an ambiguous failure.

## Tests

Run the complete dependency-free suite with:

```bash
npm test
```

It covers the subprocess MCP smoke path, both protocol eras, MCP Apps lifecycle messages, all seven UI surfaces, exact resource/tool counts, sanitizer limits, auth/approval/retry safety, asset redirects/IP/MIME/size safety, negative and stale-if-error cache behavior, endpoint/user-state separation, `/assets/<key>`, and manifest-compatible behavior.

Live third-party authentication ceremonies and real provider mutations remain host/provider acceptance boundaries; they are not claimed by the local test suite.
