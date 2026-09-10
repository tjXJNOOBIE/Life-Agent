# Life Agent Browser Authentication

> **Owner:** Task-scoped browser capability and authentication boundary.
> **Does not own:** Provider accounts, provider records, third-party sessions, passwords, MFA secrets, or payment credentials.

## Identity invariant

Identity may persist; authentication may not. `ExternalIdentityLink` contains only:

```text
provider, stableProviderSubject, displayName, emailHint, linkedAt
```

It rejects normalized credential/session fields, extra fields, and prototype-pollution-shaped input. It never contains an access token, refresh token, ID token, cookie, password, MFA/recovery secret, browser profile, local storage, or reusable session.

## Task runtime and lease

Each root task owns an isolated temporary browser runtime. An `AuthLease` is scoped to the root task, runtime, HTTPS origin, identity provider, and expiry:

```text
AUTH_REQUIRED -> AUTHENTICATING -> AUTHENTICATED
                                      |          |
                                  EXPIRED     DESTROYED
```

The runtime destroys every lease and the actual adapter runtime on success, cancellation, timeout, and failure. The user-facing guarantee is: **Life Agent retains no reusable website or identity-provider session material after the task completes.** It is not a claim that a third-party server-side session was terminated.

## Site authentication resolution

For verified site capabilities, linked SSO identities are preferred, then available major SSO providers in deterministic priority order: Google, Microsoft, GitHub, Discord, and optional Apple. Password-only sites return `USER_PASSWORD_HANDOFF`. Life Agent never receives the password or MFA secret.

## Authorization

Authentication is not authorization. `BrowserApprovalPolicy` evaluates HTTPS site/origin, action family, target, constraints, identity provider, and approval mode. It returns a deterministic decision. User involvement is required for identity linking, OAuth scope changes, passwords, MFA, account recovery, security settings, material legal or financial terms, payment-method changes, changed purchase amounts, changed targets/recipients/routes/prices/terms, and non-delegable provider boundaries.

## Failure and retry

Browser teardown is attempted in a `finally` boundary. Consequential provider mutation retries use verify-before-retry: inspect authoritative provider state first, do not submit a duplicate while state is unknown, and return to the user when conditions materially changed.
