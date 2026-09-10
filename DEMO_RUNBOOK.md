# Life Agent demo runbook

## Local protocol demo

```bash
git clone https://github.com/tjXJNOOBIE/Life-Agent.git
cd Life-Agent
npm test
PLUGIN_DATA="$(mktemp -d)" node plugins/life-agent/server/server.mjs
```

Use an MCP client over stdio. Initialize once with either `2025-11-25` or
`2026-07-28`, list tools/resources, read one UI resource, then call
`life_show_choices`, `life_show_commitment`, and `life_show_outcome` with
server-sanitized representative data. This validates the UI/protocol boundary;
it is not a provider booking.

## Hosted adapter smoke

```bash
LIFE_AGENT_ASSET_CACHE_DIR=/var/lib/life-agent/assets \
LIFE_AGENT_PORT=3000 npm run serve:http
curl -fsS http://127.0.0.1:3000/healthz
```

The hosted adapter exposes `POST /mcp` and read-only `/assets/<sha256>`. Verify
`initialize`, `server/discover`, `tools/list`, `resources/list`, and one
`resources/read` call, then terminate and restart the adapter. Provider auth,
payment, and consequential actions remain host/provider-owned and require an
explicit human approval boundary. A non-loopback deployment must send
`Authorization: Bearer $LIFE_AGENT_HTTP_AUTH_TOKEN`; `/healthz` remains public.

The current Tavall-hosted acceptance service is `life-agent-hosted-demo` at
merged commit `71ed276aa825b1affa06d327ec736eaa86843fde`, with loopback MCP at
`http://127.0.0.1:3300/mcp`. Tavall start/restart, health, initialize, tool
discovery, resource discovery, and execution-resource read were physically
verified. This is a controlled host acceptance deployment, not a public judge
endpoint.

## Evidence boundary

The repository and controlled Tavall service prove protocol, UI, state-safety,
browser-lease, retry semantics, and hosted adapter lifecycle. They do not claim
a real Google/Microsoft/GitHub/Discord authentication ceremony, a provider-side
booking, or a public deployment until those external gates are executed with
authorized accounts.
