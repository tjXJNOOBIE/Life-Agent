# Life Agent Repository Guidance

Before material implementation or architecture changes:

1. Read the current shared Tavall quality guidance from `TavallStudios/tavall-docs`, especially `docs/quality/GIT_WORKFLOW.md`, `docs/quality/CODE_ARCHITECTURE.md`, and `docs/quality/DOCUMENTATION_STANDARDS.md`.
2. Treat `docs/LIFE_AGENT_FINAL_DRAFT.md` as the current Life Agent product/technical design contract until promoted by human review.
3. Keep provider integrations outside Life Agent unless the provider itself cannot own the capability. Life Agent should prefer host tools, connected plugins/apps, and browser/computer use.
4. Do not add Life Agent authentication, payment credential storage, a duplicate scheduler, or shadow provider databases without an explicit design change.
5. Keep the bundled MCP server limited to orchestration UI and user-owned durable state unless a broader responsibility is explicitly approved.
6. Add or update tests and documentation in the same coherent change as behavior.
