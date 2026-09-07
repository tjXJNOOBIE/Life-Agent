# Life Agent Capability Stack

> **Status:** v0.1 development contract  
> **Purpose:** Define provider families Life Agent knows how to route across. This is a capability catalog, not a requirement that every provider be connected.

## Selection rule

Resolve **capability first, provider second**. The host's currently available tools and user connections are authoritative. Provider names below describe supported routing knowledge; they are not hard dependencies.

## Host-native foundation

| Capability | Preferred surface | Role |
| --- | --- | --- |
| Browser / computer use | Host browser or computer-use system | Universal fallback for websites, forms, unsupported services, sign-in handoffs, and final checkout/confirmation steps. |
| Web search | Host web search | Public discovery and research. |
| Scheduled tasks / automations | Host task system | Reminders, scheduled follow-up, recurring checks, and condition monitoring. |
| Files | Host file system / project files | User-provided and generated working artifacts. |
| Native rich UI | Host widgets/components | Prefer domain-native maps, products, restaurants, weather, calendars, and similar UI over generic Life Agent cards. |

## Communication

| Capability | v0.1 providers | Notes |
| --- | --- | --- |
| Email | Gmail, Outlook Email | Read/search, draft/send, thread-aware follow-up where host permissions permit. |
| Team messaging | Slack, Microsoft Teams | Prefer existing thread/channel and inferred relationship context. |
| Business messaging | Peach for WhatsApp Business | Business conversations, templates, app messages, media, and supported workflow actions. |

## Scheduling and people

| Capability | v0.1 providers | Notes |
| --- | --- | --- |
| Calendar | Google Calendar, Outlook Calendar | Availability, event creation/update, schedule reconciliation. |
| Contacts | Google Contacts | Resolve people and contact details before communication or invitations. |
| Task manager | ChatGPT Tasks first; Todoist optional | Use ChatGPT Tasks for Life Agent future work when available; external task managers are optional destinations. |

## Files and knowledge

| Capability | v0.1 providers | Notes |
| --- | --- | --- |
| Cloud files/docs | Google Drive, Dropbox | Search/read/write/share according to provider capabilities. |
| Knowledge/workspace | Notion | Knowledge retrieval and structured workspace updates. |

## Work and development

| Capability | v0.1 providers | Notes |
| --- | --- | --- |
| Source control / engineering work | GitHub | Repositories, issues, PRs, CI, code changes where exposed. |
| Product/project work | Linear | Issues, projects, initiatives, updates. |
| Knowledge/project context | Notion | Plans, docs, meeting context, knowledge capture. |
| General work management | monday.com | Boards, items, ownership, timelines, updates when available. |

## Payments, invoicing, and business operations

| Capability | v0.1 providers | Notes |
| --- | --- | --- |
| Payments / billing | Stripe | Products, prices, payment links, payments, subscriptions, invoices, refunds, disputes, customers when exposed by the connector. |
| Payments / business | PayPal | Business/payment actions exposed by the provider. |
| Invoice-focused workflows | Elevate Invoices | Invoice creation and management when installed. |
| CRM | Zoho CRM, Streak, Sales plugin | Use the user's actual system of record; do not create a Life Agent CRM. |

Life Agent does not store payment credentials. Consumer checkout prefers native provider action, then browser checkout, then minimal human confirmation.

## Travel and reservations

| Capability | v0.1 providers | Notes |
| --- | --- | --- |
| Stays / cars / attractions | Booking.com | Discovery and provider handoff where booking completes on Booking.com. |
| Flights / hotels / managed travel | Otto Travel | Search, booking, trip retrieval, and supported exchange/cancel operations. |
| Flight comparison | Reagent Travel | Guided flight search/comparison and booking handoff. |
| Hotel comparison | Vio.com | Hotel discovery, live pricing/availability, interactive comparison, booking links. |
| Arbitrary reservation site | Browser | Universal fallback for restaurants, appointments, local services, and unsupported booking providers. |

## Provider fallback order

For any capability:

1. already-connected authoritative provider;
2. another compatible connected provider explicitly supported by the host;
3. provider-specific plugin available to connect through the host's own flow;
4. browser/computer use against the actual service;
5. web discovery plus a minimal user handoff when no executable path exists.

Never require the user to name a connector if capability discovery can determine it.
