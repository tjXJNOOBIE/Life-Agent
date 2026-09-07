# Life Agent

**Ask for the outcome. Life Agent handles the steps.**

Life Agent is a portable orchestration plugin for general-purpose AI hosts. It interprets a natural-language outcome, discovers the capabilities and connected services already available in the host, executes as far as permissions allow, verifies the result, and handles the follow-up work created by that result.

It does **not** run a separate account system, payment vault, calendar, inbox, CRM, scheduler, or provider proxy.

## What v0.1 contains

- A universal `life-agent` skill for one-sentence actionable requests.
- Capability-first routing guidance for communication, scheduling, files, work, payments, business operations, travel, and browser fallback.
- A bundled no-auth MCP UI/state shim.
- Three in-chat UI surfaces:
  - execution / completion card;
  - generic choice deck;
  - capability-route inspector.
- User-owned durable `LIFE.md` state stored in the host's writable plugin data directory.
- A repo marketplace entry for local ChatGPT Desktop / Codex testing.

See [`docs/LIFE_AGENT_FINAL_DRAFT.md`](docs/LIFE_AGENT_FINAL_DRAFT.md) for the current product contract.

## Install for local ChatGPT Desktop testing

The repo contains a marketplace at `.agents/plugins/marketplace.json` and the plugin under `plugins/life-agent/`.

### From a local clone

```bash
git clone https://github.com/tjXJNOOBIE/Life-Agent.git
cd Life-Agent
git switch working/chatgpt-plugin-v1
```

Open that repo in the ChatGPT desktop app, restart the app, then open **Plugins Directory**, choose **Life Agent Dev**, and install **Life Agent**.

### Add the marketplace with Codex CLI

While this branch is under development:

```bash
codex plugin marketplace add tjXJNOOBIE/Life-Agent --ref working/chatgpt-plugin-v1
```

Then restart the ChatGPT desktop app, open **Plugins Directory**, choose **Life Agent Dev**, and install **Life Agent**.

After the branch reaches `main`, omit `--ref`.

## Test locally

The bundled MCP server is dependency-free and requires Node.js.

```bash
npm test
```

The smoke test validates MCP initialization, tool discovery, durable state read/write, all UI resources, and a render-tool call.

## ChatGPT web / Work

The bundled MCP server uses local stdio for fast desktop/Codex development. ChatGPT web/Work cannot execute a local stdio process from the browser. The same UI/state server will need a public HTTPS Streamable MCP endpoint (or Secure MCP Tunnel during development) before these custom Life Agent UIs can run directly in web Work. The skill itself remains portable; provider connections continue to use ChatGPT's own plugin/app flows.

## Supported capability stack

The current catalog lives in [`plugins/life-agent/skills/life-agent/references/CAPABILITY_STACK.md`](plugins/life-agent/skills/life-agent/references/CAPABILITY_STACK.md).

Initial provider knowledge includes:

- Gmail, Outlook Email;
- Google Calendar, Outlook Calendar, Google Contacts;
- Slack, Microsoft Teams, WhatsApp Business via Peach;
- Google Drive, Dropbox, Notion;
- GitHub, Linear, monday.com;
- Stripe, PayPal, Elevate Invoices, Zoho CRM, Streak, Sales;
- Booking.com, Otto Travel, Reagent Travel, Vio.com;
- host browser/computer use, web search, files, native rich UI, and scheduled Tasks as universal foundation/fallbacks.

Provider availability is discovered at runtime. Users are not expected to name or configure all of these manually before making a request.

## Memory

Life Agent creates `LIFE.md` inside the host-provided writable plugin data directory on first use. It is intentionally small and human-readable.

It may store durable preferences, standing permissions, relationship/channel mappings, active continuation context, unresolved commitments, and learned defaults. It must never store passwords, tokens, cookies, private keys, card credentials, or other secrets.
