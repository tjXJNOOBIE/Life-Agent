# Java product and installation boundary

The Java runtime is the authoritative Life Agent product backend.

```text
AI client / CLI
  -> Java Life Agent MCP
       -> deterministic task and approval state
       -> provider/browser/payment boundaries
       -> standalone Strands bridge
            -> native Strands reasoning
            -> authorized Java Function Catalog MCP view
```

The model-facing Function Catalog contains planning, task observation, bounded
action requests, and capability inspection. It does not contain approval or
execution functions. A requested action is persisted as `WAITING_FOR_HUMAN`;
payment confirmation is never autonomous. Browser access is represented by a
task-scoped ephemeral session and is destroyed when the owner closes it.

## Local installation

From a source checkout with Java 25 and Gradle 9:

```bash
gradle --no-daemon clean check installDist
./build/install/life-agent/bin/life-agent doctor
./build/install/life-agent/bin/life-agent serve
```

The default development endpoint is `http://127.0.0.1:3300/mcp`. A local
stdio client runs `./build/install/life-agent/bin/life-agent` with no command.
`LIFE_AGENT_TASK_STATE_DIR` may point to a user-owned state directory. It must
not contain OAuth tokens, cookies, passwords, card data, or browser profiles.

To run native Strands reasoning, configure:

```bash
export LIFE_AGENT_STRANDS_NODE=/absolute/path/to/node
export LIFE_AGENT_STRANDS_ENTRYPOINT=/absolute/path/to/strands-bridge/dist/mcp/main.js
./build/install/life-agent/bin/life-agent reason "Plan my trip next week"
```

The Java launcher supplies an explicit child-process environment allowlist.
Production credentials are not inherited by the model subprocess.

For end-user installation, use the npm package instead of a source checkout:

```bash
npm install life-agent
npx life-agent doctor
npx life-agent
npx life-agent serve
```

## Java MCP App surface and legacy UI migration boundary

The Java MCP publishes these seven read-only resources and matching render
functions: choices, commitment, handoff, execution, outcome, settings, and
capability-route. Their HTML is sanitized and mutation-free. The Java
distribution carries the checked-in Glass master as a resource and removes
external image URLs before serving it. The TypeScript UI remains the source
compatibility fixture and test surface.

The TypeScript server under `plugins/life-agent/server/` remains checked in for
the MCP Apps/browser compatibility suite and endpoint-owned asset behavior. It
is not packaged as the product backend and is not the owner of task policy,
approval, provider effects, or durable task state.

Production mutation recording follows the product-wide rule: **production
mutation -> recorded**. Local, development, and sandbox provider tests use
ordinary structured logs and test output only.

The 2026-09-12 SANDBOX-REAL acceptance slice used the connected Google Calendar
and Gmail host boundaries with a test identity. It created and re-read one
private disposable calendar event and one unsent self-addressed draft, then
removed the temporary state. Java Life Agent held both requested actions at
`WAITING_FOR_HUMAN`; it did not autonomously approve, send, book, or pay.
