# Agents for Humans submission: Life Agent

## Tagline

State the outcome. Life Agent coordinates the steps and stops at the smallest
human decision that matters.

## Problem and audience

Personal administration crosses travel, calendars, messages, and provider
accounts. Life Agent is for people who want the result without handing an agent
their passwords, reusable browser sessions, or payment authority.

## How it works

The host/Strands agent resolves capabilities first, Life Agent presents
choices and commitments through MCP Apps, and connected providers or host
browser tools perform authorized work. Consequential actions require explicit
human approval and are verified before any retry.

## Safety boundary

Identity metadata may persist; authentication material may not. `LIFE.md` is
user-owned operating context only. The MCP UI is presentation/control context,
not a direct provider mutation channel. Assets are served only from the
endpoint-owned bounded cache.

## Installation and test

See [README.md](README.md), [DEMO_RUNBOOK.md](DEMO_RUNBOOK.md), and
[docs/ARCHITECTURE.svg](docs/ARCHITECTURE.svg). Run `npm test` for the complete
dependency-free protocol/security suite. The local HTTP adapter is started with
`npm run serve:http`.

Current controlled deployment: Tavall service `life-agent-hosted-demo`, merged
commit `0d1dce8d15d8d5cf7dbf1d58f0c64fce555b351d`, loopback MCP
`http://127.0.0.1:3300/mcp`. Public HTTPS and provider-side consequences remain
unclaimed.

## Pre-existing components disclosure

The Life Agent product/UI contract was built for this hackathon. It reuses
standard Node.js tooling, MCP conventions, and pre-existing Tavall/host
infrastructure. Provider accounts, authentication, and any connected host
tools remain external components and are not represented as completed here.

## AWS and video

Strands is the required agent foundation. No AWS service is claimed in this
repository until it is actually used by the final deployment. Add the public
YouTube/Vimeo URL and AWS Builder ID in Devpost as human submission fields.
