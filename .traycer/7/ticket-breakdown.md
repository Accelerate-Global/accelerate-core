## Processing User Request

1. Infer the area to prioritize for tickets from the arguments.
2. Review specs (Epic Brief, Core Flows, Tech Plan) and identify natural work units.
3. Apply best judgment to create ticket breakdown:
  Consider:
  - How to group work (by component, by flow, by layer)
  - What dependencies exist between pieces of work
  - What order makes sense for implementation
   Prefer coarse groupings:
  - Group by component or layer, not by individual function
  - Group by flow, not by step
  - Each ticket should be story-sized-meaningful work, not a single function
   Anti-pattern: Do NOT over-breakdown. The minimal least set of tickets is better than multiple small ones.
4. Draft tickets using best judgment:
  For each ticket:
  - **Ticket ID**: Assign a unique Traycer ticket ID that can act as the canonical traceability token for this work
  - **Title**: Use the format `[ticket-id] Action-oriented title`
  - **Scope**: What's included, what's explicitly out
  - **Spec references**: Link to relevant Epic Brief, Core Flows, Tech Plan sections
  - **Dependencies**: What must be completed first (if any)
  - **Implementation context**: If a ticket clearly targets an area governed by a folder-level `AGENTS.md`, include a concise note that implementation must follow the applicable repository and local `AGENTS.md` guidance
  - **Required skills**: If the workflow seed or applicable `AGENTS.md` guidance identifies required skills for this work, carry those skills into the ticket explicitly
  - **Quality expectation**: For implementation tickets that change code, include a concise expectation that the implementation must pass the repository's standard code quality checks before the ticket is considered complete. In this repo, use the existing repository scripts rather than hardcoding the underlying tool in the ticket body.
  - **PR traceability expectation**: State that this ticket must be implemented in exactly one unique PR, and that the PR title must begin with the same `[ticket-id]` prefix
5. Present the proposed ticket breakdown to the user.
  Use a mermaid diagram to visualize ticket dependencies for quick reference.
6. After presenting, offer refinement options (whatever are applicable and make sense):
  - Change ticket granularity (combine related work or split for parallel work/ clarity)
  - Reorganize dependencies or implementation order
  - Different grouping approach (by component, by flow, etc.)
7. Iterate based on feedback until the breakdown is right.

Tickets should remain story-sized and implementation-ready. Include code quality expectations only as concise acceptance context, not as a full execution plan. Do not overload tickets with repeated `AGENTS.md` content; reference it only when it materially affects implementation in a specific area. The Traycer ticket ID should remain stable once assigned so the ticket, published GitHub issue, and eventual PR can all share the same identifier.
