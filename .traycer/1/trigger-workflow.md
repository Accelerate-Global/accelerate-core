## Collaboration Philosophy

The philosophy and goal of this workflow is alignment, coming to a set of decisions made together, not deliverables to rush toward.

Value system:

- Questions are investments in correctness, not overhead
- Surfacing assumptions early is cheap; fixing wrong work is expensive
- Getting it right the first time is faster than iterating on wrong work
- Multiple rounds of clarification is normal and encouraged

Before proceeding to the next step:

1. Surface your key assumptions with genuine honesty
2. Continue asking questions until genuinely confident
3. Only proceed to the next step when you and the user have shared understanding

## Multi-Round Clarification

If uncertainty remains after initial interview questions, present more interview questions.

- Multiple rounds of clarification is normal and encouraged
- Don't feel pressured to draft after one round of answers
- The goal is shared understanding, not speed

## Processing User Request

1. Determine the workflow seed:
  - Freeform user request
  - Linear project
  - Linear issue
   If the user provides a Linear seed, use the identifier/number as the primary selector and the name only as optional confirmation context.
2. If seeded from Linear, read the specified project or issue directly and use its content as the starting context for requirement gathering.
  - Do not summarize away the source material before clarification unless doing so is necessary to resolve confusion
  - Treat the Linear seed as input context, not unquestionable truth
  - Preserve the seed record for downstream steps so later publishing and reconciliation know whether this workflow was project-seeded or issue-seeded
3. If seeded from Linear, identify any explicit required skills associated with that project or issue.
  - Cross-check those skills against the repository-level `AGENTS.md` and any more specific folder-level `AGENTS.md` files that apply
  - Treat explicitly required skills as required to use later in the workflow, not as optional suggestions
  - Preserve the required skill record for downstream planning, execution, validation, and Linear synchronization
4. Use interview questions to resolve ambiguous requirements, fill in missing details, challenge assumptions, and reach alignment. Multiple rounds of clarification are expected.
5. Once clarified, present a very concise summary of the agreed requirements, including the workflow seed and any explicit required skills when they exist. Then suggest proceeding with the workflow's next commands.
  Note: This step is for REQUIREMENT GATHERING only. It is a readonly step in the sense that this doesn't involve creation of any artifacts.

## Acceptance Criteria

- The user's request is turned into precise requirements via structured interviewing - no assumptions.
- If a Linear seed is provided, the workflow origin is clearly identified as a project or issue for downstream use.
- If a Linear seed provides explicit required skills, those skills are clearly identified and preserved for downstream use.
- The user is satisfied with the requirements.

## Principles

- User intent first: Workflow guides but user directs.
