# ADR-008 — Multi-agent build orchestration

**Status:** Accepted

## Context

The prototype must be built fast enough to be useful for an interview cycle. A traditional sequential build would take weeks. The work splits cleanly into six vertical slices that share only their cross-layer contracts, which means it can be parallelized across multiple specialized agents.

## Decision

**Six specialized agents, run in parallel** via the `Agent` tool with `subagent_type=general-purpose`. Each agent owns one vertical slice. Each agent receives:

1. Its task brief from `tasks/agent-N-*.md`
2. The relevant ADRs (always 001, 002, 003 plus any others specific to its slice)
3. The pinned cross-layer contracts in `src/contracts/`
4. An explicit "do not touch outside your slice" guardrail
5. A definition-of-done checklist tied to the sprint backlog

The slices and their agents:

| Agent | Slice | Depends on |
|---|---|---|
| Agent 1 | Domain & Data (synthetic return + 50-rule corpus + golden recommendations) | None |
| Agent 2 | Recommendation Engine (B1 anchor) | Agent 1 |
| Agent 3 | Pre-Work Engine (B3 mock) | Agent 1 |
| Agent 4 | Workbench UI (Layer 3) | Agents 2 + 3 (consumes their APIs) |
| Agent 5 | Trust Layer (Layer 4) | Agents 2 + 3 (wraps their LLM calls) |
| Agent 6 | Quality, Tests, & Demo | Agents 1 to 5 |

**Sequencing.** Agent 1 runs first (foundation). The moment Agent 1 is done, Agents 2 through 5 launch in parallel in a single Agent tool message. Agent 6 launches alongside the build agents and integrates as soon as any two slices stabilize.

**Contract pinning.** Before any agent writes code, the cross-layer contracts in `src/contracts/` are written and committed. Agents are not allowed to modify the contracts; if a contract change is needed, the agent must surface it as a blocker rather than mutate the contract unilaterally.

## Why

- Parallelism collapses build time
- Contract pinning prevents the agents from negotiating boundaries at runtime, which is the failure mode of multi-agent code generation
- A single foundation agent (Agent 1) eliminates the worst sequential dependency
- A single quality/integration agent (Agent 6) catches drift early without slowing the build agents

## Consequences

The contracts must be **right** before the build kicks off. If a contract is wrong, all parallel work has to be revised. This is mitigated by writing the contracts during the planning phase (now), reviewing them with the user, and only launching the build after the contracts are pinned. The contracts file `src/contracts/index.ts` is the most-reviewed artifact in the repo before the multi-agent build runs.
