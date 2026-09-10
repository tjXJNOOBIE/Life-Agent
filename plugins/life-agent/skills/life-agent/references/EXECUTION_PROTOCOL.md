# Life Agent Execution Protocol

This reference defines the reusable interpretation pattern behind every Life Agent flow.

## Outcome frame

Before acting, derive internally:

```text
Outcome: What must become true?
Completion evidence: How can we know it became true?
Constraints: Time, money, location, people, policy, dependencies.
Capabilities: What kinds of actions are required?
Providers: Which available host tools can perform those actions?
Boundaries: Where, if anywhere, must the user intervene?
Consequences: What new obligations will exist after success?
```

The user does not need to provide this structure explicitly.

## Routing invariants

- Interpret natural language rather than requiring command syntax.
- Never ask which integration to use before inspecting what is available.
- Do not confuse a provider with a capability.
- Prefer authoritative systems of record.
- Browser automation is a normal fallback, not an exceptional failure mode.
- Preserve referential continuity across short follow-ups.
- Verify before retrying consequential mutations.
- Expand consequences only after a real state change is confirmed.

## Completion contract

A flow is complete when either:

1. the intended outcome is verified and justified follow-ups are handled/scheduled, or
2. the agent has reached a genuine non-delegable boundary and has completed everything possible before it.

A prose explanation of steps is not completion when the host can actually perform those steps.
