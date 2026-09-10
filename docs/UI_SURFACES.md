# Life Agent UI Surfaces

> **Owner:** Life Agent orchestration UI.
> **Contract:** Seven versioned MCP App resources and their read-only render tools.

Life Agent is outcome-first. UI is a projection of server-sanitized orchestration state; it does not mutate providers.

| Surface | URI | Primary question |
| --- | --- | --- |
| Choice | `ui://life-agent/choices-v2.html` | Which small set of options best satisfies the outcome? |
| Commitment Surface | `ui://life-agent/commitment-v2.html` | What will this choice create, and what is the smallest remaining decision or approval? |
| Handoff | `ui://life-agent/handoff-v2.html` | What one provider/user step cannot be delegated? |
| Live Execution | `ui://life-agent/execution-v2.html` | What is verified, active, blocked, or waiting? |
| Outcome | `ui://life-agent/outcome-v2.html` | What became true, and which consequences remain? |
| Settings | `ui://life-agent/settings-v2.html` | Which preferences, permissions, and safe identity metadata are active? |
| Capability Route | `ui://life-agent/capability-route-v2.html` | Which capability was needed before a provider was selected? |

## Commitment Surface rule

The selected item is compact context. The surface then shows consequences, inline conflict repair, applicable fare/seat/bag or other micro-decisions, and one obvious primary action. A payment confirmation, changed route, changed target, changed price, changed terms, or other material boundary is explicit and returns to the user.

## MCP Apps behavior

Resources use MIME `text/html;profile=mcp-app` and the MCP Apps view contract `2026-01-26`. Widgets handle `ui/initialize`, `ui/update-model-context`, `ui/message`, `ui/size`, and `ui/teardown`. A small in-card choice is sent through `ui/update-model-context`; an explicit continuation CTA uses `ui/message`. Renderers use text nodes and server output only, so tool input cannot be injected into the DOM.

Production resources use a restrictive CSP with `connect-src 'none'`, no browser storage/cookies, no forms, no base tag, and no arbitrary third-party URLs. Asset bytes are supplied only by the endpoint resolver as bounded safe raster data or a controlled `/assets/<sha256>` route.

## Visual contract

The accepted system is dark contextual Glass: Apple system font stack, compact dense composition, modest blur, restrained borders, rounded controls, compact 3-up choices, small provider marks, approximately 22px outer material radius, approximately 16px inner option cards, restrained metadata, progressive disclosure, and one primary action. Generic SaaS dashboard styling, pill spam, huge detail pages, and generated imagery are outside this contract.
