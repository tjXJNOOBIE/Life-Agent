# Life Agent Final Draft

> **Status:** Working design  
> **Owns:** Life Agent product behavior, orchestration boundaries, durable-state principles, and host/provider integration model.  
> **Does not own:** Provider authentication, provider business data, payment credentials, calendars, inboxes, task schedulers, browser sessions, or third-party service behavior.

## About

Life Agent is a portable orchestration plugin for general-purpose AI hosts. A user states a desired outcome in ordinary language; Life Agent interprets that outcome, discovers the capabilities already available in the host, executes as far as permissions allow, verifies the result, and handles the follow-up work that the result creates.

The primary interaction rule is:

> **The user expresses the outcome. Life Agent discovers the means.**

Life Agent is intentionally not a standalone SaaS application. It should exploit the host's browser, connected apps, plugins, MCP servers, files, tasks, and native UI rather than reimplementing them.

## Ownership Rules

Life Agent owns:

- natural-language outcome interpretation;
- capability-first provider routing;
- multi-provider orchestration;
- continuation semantics such as "do it";
- verification strategy;
- consequence/follow-up expansion;
- selective durable operational memory;
- orchestration UI for status, generic choices, and capability routes.

Connected providers own authentication/authorization, source-of-truth records, communications delivery, calendar state, payment processing/credentials, bookings/reservations, CRM/project/file data, and provider-specific confirmation or safety requirements.

The host owns browser/computer use, web search, scheduled tasks/automation, plugin/app connection flows, approval UX/permission enforcement, and native rich UI surfaces when available.

## System Rules and Behavior

### Universal execution

Every actionable request follows the same conceptual loop:

```text
Interpret -> Resolve -> Act -> Hand off if required -> Verify -> Propagate -> Persist selectively
```

Steps may be skipped when the request is simple. The loop is a reasoning contract, not user-visible ceremony.

### Capability-first routing

Life Agent resolves the capability required before choosing a provider. Provider choice depends on what the current host exposes and what the user has connected. The user should not need to name Gmail, Calendar, Stripe, Slack, or any other integration when the route can be discovered.

### Browser fallback

The host browser/computer-use system is the universal fallback for services without a suitable connector. Life Agent may navigate, fill forms, and prepare a transaction or reservation to the point allowed by the host/provider. Authentication, payment confirmation, or another protected action can be handed to the user at the narrowest possible boundary.

### Verification

A mutation is not complete merely because a tool call was attempted. Life Agent verifies using the best available authoritative evidence, such as provider state, browser confirmation, email receipt, calendar event, payment status, or resulting record.

### Consequence expansion

After a verified state change, Life Agent determines what new obligations were created and handles or schedules justified follow-ups. It must not generate artificial productivity work merely because a workflow could theoretically have more steps.

### Communication

Life Agent may send or prepare email/messages using connected channels when communication is part of the intended outcome or a necessary consequence. It should infer the appropriate channel from context and avoid duplicate notifications.

### Payments

Life Agent never stores card credentials and does not become a payment processor. It routes through provider payment capabilities or merchant/browser checkout and respects the host/provider confirmation boundary.

### Future work

Life Agent uses host scheduled tasks/automations for future checks, reminders, recurring work, and condition monitoring. It does not maintain its own scheduler.

## Technical Structure

The initial package contains:

```text
plugins/life-agent/
├── .codex-plugin/plugin.json
├── .mcp.json
├── server/server.mjs
├── skills/life-agent/
└── templates/LIFE.md
```

The skill is the primary product behavior. The bundled MCP server is deliberately narrow: it provides Life Agent orchestration UI and durable `LIFE.md` read/write tools. It does not proxy provider APIs.

## Data Model and Storage

Durable Life Agent memory is a user-owned Markdown file named `LIFE.md` in the host-provided writable plugin data directory.

It may contain only reusable preferences, standing permissions, person/channel mappings, active continuation context, unresolved commitments, and learned defaults. It must not contain secrets, credentials, authentication artifacts, payment credentials, or transient browsing data.

External providers remain authoritative for their own records.

## Runtime Flows

### Generic success flow

```text
one-sentence request
-> interpret desired outcome
-> inspect capabilities
-> select provider route
-> execute connected actions/browser work
-> pause only at required user boundary
-> verify completion
-> perform/schedule resulting commitments
-> update durable Life State only if warranted
-> render completion receipt when useful
```

### Provider failure

```text
provider action fails
-> inspect whether action may have partially completed
-> verify authoritative state
-> select safe alternate provider/browser route when available
-> otherwise expose the narrow blocker
```

Retries must not duplicate consequential actions when prior completion is uncertain.

## Integrations

The current provider catalog is owned by `plugins/life-agent/skills/life-agent/references/CAPABILITY_STACK.md`. The catalog is intentionally replaceable: capability semantics are stable while provider availability varies by host and installation.

## Validation Requirements

Before v0.1 is considered verified:

- plugin manifest and marketplace JSON parse cleanly;
- bundled MCP server passes initialization, tool listing, state read/write, UI resource read, and render-tool smoke tests;
- local ChatGPT Desktop installation succeeds;
- all three Life Agent UI resources render in the host;
- at least one cross-provider flow is exercised end-to-end using real connected services;
- browser fallback is exercised without Life Agent receiving user credentials;
- durable state survives plugin runs without writing secrets;
- no provider operation is falsely reported as completed without verification.

## Final Rules Summary

- One sentence must be enough to start an actionable flow.
- The user states outcomes, not connector choreography.
- Resolve capabilities before providers.
- Use existing host/provider auth, storage, browser, task, and payment systems.
- Hand the user only genuinely non-delegable steps.
- Verify mutations before declaring success.
- Handle consequences after verified state changes.
- Keep durable memory small, explicit, user-owned, and secret-free.
- Keep the Life Agent MCP server a UI/state shim, not a shadow backend.
