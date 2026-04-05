---
entity_id: appworld
type: project
bucket: agent-systems
abstract: >-
  AppWorld: A sandboxed benchmark of 9 real-world apps and 750 tasks testing LLM
  agents on multi-step API interactions, distinguished by executable evaluation
  with real state changes rather than static output matching.
sources:
  - repos/modelscope-agentevolver.md
  - papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/papers/zhang-agentic-context-engineering-evolving-contexts-for.md
related:
  - WebArena
last_compiled: '2026-04-05T20:37:34.900Z'
---
# AppWorld

## What It Is

AppWorld is a benchmark environment for evaluating LLM agents on realistic, multi-step tasks that require interacting with simulated real-world applications: email, calendar, shopping, banking, and similar services. Tasks range from single-app operations to multi-app workflows that require coordinating state across multiple services simultaneously.

The key architectural distinction from static benchmarks: AppWorld executes agent actions against live sandboxed app instances and evaluates whether the resulting system state matches a ground-truth outcome. An agent that generates plausible-looking API calls but fails to actually complete the task gets no credit. This makes AppWorld harder to game than benchmarks graded on output text similarity.

## Core Mechanism

AppWorld provides a set of sandboxed app servers (implemented as REST APIs) that agents interact with through natural-language tasks. The benchmark includes:

- **~9 apps** covering communication, productivity, and financial domains
- **750 tasks** spanning simple single-app actions to complex multi-app scenarios
- **Two evaluation splits:** `test-normal` (standard difficulty) and `test-challenge` (harder, requiring more steps and cross-app coordination)

Evaluation uses two primary metrics:
- **Task Goal Completion (TGC):** Whether the final system state matches the expected outcome
- **Scenario Goal Completion (SGC):** Completion across grouped scenario sets

The sandbox resets between tasks, ensuring independent evaluation. Agents must discover available APIs, authenticate, handle pagination, manage state across calls, and recover from errors, all without access to the underlying implementation.

## Key Numbers

Benchmark results from published papers (all self-reported by respective research teams, not independently validated):

| System | TGC (test-normal) | Notes |
|--------|-------------------|-------|
| ReAct baseline | ~63.7% | ACE paper baseline |
| ACE + DeepSeek-V3.1 | 76.2% | Open-source model |
| IBM-CUGA | ~76% avg | GPT-4.1-based production agent |
| SAGE (RL-trained) | 72.0% | 26% fewer steps vs baseline |
| AgentEvolver 14B | 48.7% avg@8 / 69.4% best@8 | Qwen2.5-14B fine-tuned |
| AgentEvolver 7B | 32.4% avg@8 / 51.2% best@8 | Qwen2.5-7B fine-tuned |

The ACE result on `test-challenge` exceeds IBM-CUGA by +8.4% TGC despite using a smaller open-source model, suggesting the harder split more cleanly separates agent architecture quality from base model capability. [Source](../raw/deep/papers/zhang-agentic-context-engineering-evolving-contexts-for.md)

SAGE's RL-based skill learning achieves 72.0% TGC while generating 59% fewer tokens than the baseline, a cost-efficiency gain worth noting for production system builders. [Source](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md)

## Strengths

**Executable evaluation catches failures that text matching misses.** An agent that hallucinates a successful API response gets exposed when the state check fails. This closes the gap between benchmark performance and deployment reality.

**Multi-app tasks stress actual planning.** Tasks requiring coordination across apps surface weaknesses in context management and state tracking that single-app tasks hide.

**Active use as a training environment.** AgentEvolver, SAGE, and ACE all use AppWorld as a training ground, not just evaluation. The sandboxed APIs make it safe to run RL rollouts without external dependencies.

**Graded difficulty splits.** The `test-normal` / `test-challenge` distinction lets researchers compare on both standard and hard settings, making it harder to overfit to a single difficulty level.

## Critical Limitations

**Coverage gap in app diversity.** Nine apps, however well-implemented, does not cover the long tail of real enterprise software. An agent that achieves 76% on AppWorld may still fail on the 11th app it encounters in production because the benchmark's API patterns cluster around a relatively narrow interaction style.

**Unspoken infrastructure assumption:** Running AppWorld requires local app server infrastructure. Researchers without access to the server setup cannot evaluate agents, and the benchmark cannot be run purely through API calls to a hosted endpoint. This limits adoption for teams without engineering resources to stand up the sandbox.

## When NOT to Use AppWorld

Skip AppWorld if your agent needs to handle GUI-based applications. AppWorld evaluates API-level interactions only. For agents operating on visual interfaces (clicking, typing, reading screens), [WebArena](../projects/webarena.md) or OSWorld are more appropriate choices. Also avoid AppWorld as a primary benchmark if your agent's core challenge is tool discovery rather than multi-step execution: the available APIs are relatively well-scoped, so benchmarks with larger and noisier tool registries will stress that capability harder.

## Unresolved Questions

**Leaderboard governance:** Multiple papers report AppWorld scores, but the benchmark does not appear to have a centrally maintained leaderboard with submission validation. Self-reported numbers across papers use different baseline configurations, making cross-paper comparisons unreliable without careful reading.

**Task distribution refresh:** Whether the 750 tasks are periodically updated to prevent contamination from models trained on publicly available solutions is unclear. As more training pipelines use AppWorld tasks directly (as AgentEvolver and SAGE do), the line between training data and evaluation data blurs.

**Real-world gap measurement:** No published analysis compares AppWorld task completion rates against agent performance on the actual applications being simulated. The gap between sandboxed API behavior and production app behavior (rate limits, auth flows, undocumented edge cases) is unknown.

## Alternatives

- **[WebArena](../projects/webarena.md):** Use when evaluating agents on browser-based GUI tasks rather than API interactions. WebArena tests navigation, form-filling, and visual understanding; AppWorld tests programmatic API orchestration.
- **OSWorld:** Use when evaluating desktop GUI agents across Windows, macOS, or Linux applications. More comprehensive OS coverage than AppWorld, with human-level baselines now matched on some splits.
- **BFCL (Berkeley Function Calling Leaderboard):** Use when your primary concern is single-turn function call accuracy rather than multi-step task completion. AgentEvolver trains on both simultaneously for coverage of both skills.

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md): Several top AppWorld systems (ACE, AgentEvolver) use evolving memory or skill libraries as the mechanism driving performance gains.
- [Tool Use](../concepts/tool-use.md): AppWorld tasks are fundamentally tool-use chains; performance correlates with how well agents handle API discovery, error recovery, and sequential state management.
