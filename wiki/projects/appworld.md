---
entity_id: appworld
type: project
bucket: agent-architecture
abstract: >-
  AppWorld is a benchmark for evaluating LLM agents on realistic multi-app API
  tasks with a fully controlled, sandboxed environment; its key differentiator
  is deep integration across 9 apps with 457 APIs, enabling measurable progress
  on complex, multi-step agent workflows.
sources:
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - deep/repos/modelscope-agentevolver.md
  - papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - repos/modelscope-agentevolver.md
related: []
last_compiled: '2026-04-08T23:02:53.130Z'
---
# AppWorld

## What It Is

AppWorld is a benchmark and controlled execution environment for testing LLM agents on complex, real-world-like tasks that span multiple interconnected applications. An agent must complete tasks such as "cancel the Spotify subscription I'm paying for my roommate and send them a Venmo request for the amount I already paid this month" by calling sequences of APIs across connected services, managing state across those services, and recovering from errors along the way.

The benchmark is built on a simulated ecosystem of 9 apps (Spotify, Gmail, Venmo, Amazon, Phone, Notes, Contacts, Calendar, Supervisor) with 457 APIs, 750 everyday tasks organized into 4 difficulty levels, and a sandboxed Python execution environment that acts as the agent's terminal. Each task runs in a fresh, isolated database state so test results are reproducible and agents cannot contaminate each other's environments.

AppWorld is frequently used as a primary evaluation target in agent research. [AgentEvolver](../projects/agentevolver.md) reports results on AppWorld as one of two benchmark targets. [ACE](../concepts/context-engineering.md) uses AppWorld for its context evolution experiments and appears on the AppWorld public leaderboard. The benchmark's Task Goal Completion (TGC) and Scenario Goal Completion (SGC) metrics track both per-task accuracy and the harder cross-task scenario success rates, respectively.

## Architecture

### Simulated App Ecosystem

The 9 apps are not thin stubs. Each simulates real application behavior with stateful databases, interdependencies between services (e.g., Venmo transactions affect account balances, Spotify subscription status affects what plans are listed elsewhere), and API semantics that match real-world patterns including pagination, authentication, and error codes. API calls go through a controller that enforces schema validation, logs the interaction, and updates shared state.

Tasks are seeded with specific data states (specific users, playlists, transactions, contact lists) so every task has a deterministic ground truth. The evaluator checks final database state, not intermediate steps, which means agents can succeed via novel API call sequences that differ from the reference solution.

### Task Difficulty Levels

Four levels of increasing complexity:

- **Level 1:** Single app, single API call
- **Level 2:** Single app, multiple API calls
- **Level 3:** Multiple apps, moderate coordination
- **Level 4:** Multiple apps, complex cross-app state management

Most research reports aggregate numbers, but Level 4 tasks expose where agents fail: they require tracking state across multiple services, handling situations where earlier API calls must be revisited based on later discoveries, and managing ambiguous task specifications where the agent must infer intent.

### Execution Environment

The agent operates through a Python REPL. It imports an `appworld` client library, calls APIs as Python function calls, receives structured responses, and writes code to process results. This design choice matters: the agent can use Python to process API outputs (e.g., filter a list, compute a total) rather than relying on the LLM to do arithmetic in context. It also means the benchmark tests code generation alongside API orchestration.

### Evaluation

TGC checks whether the final state of the relevant databases matches the expected state. SGC groups tasks into scenarios (e.g., "manage a shared household account") and measures whether all tasks in the scenario succeed. SGC is significantly harder because partial scenario completion scores zero.

The benchmark has a public leaderboard. As of the research in these sources, ACE with DeepSeek-V3.1 matched the top-ranked production agent (IBM-CUGA, GPT-4.1-based) on overall average and exceeded it by +8.4% TGC on the harder test-challenge split. SAGE (from the agent skills survey) reported 72.0% TGC. AgentEvolver with Qwen2.5-14B reached 48.7% avg@8 and 69.4% best@8. These figures are self-reported by the respective research groups, not independently audited.

## Key Numbers

| System | TGC / avg@8 | Notes |
|--------|-------------|-------|
| ACE + DeepSeek-V3.1 | 76.2% TGC (test-normal) | Self-reported; on public leaderboard |
| SAGE | 72.0% TGC | Self-reported; 8.9% over baseline |
| AgentEvolver (14B, all) | 48.7% avg@8 | Self-reported; ablation results available |
| Qwen2.5-14B baseline | 18.0% avg@8 | Self-reported |

The spread between methods is large enough to be meaningful even with self-reporting caveats. The public leaderboard provides some external validation for leaderboard submissions, though test set security is not described in detail.

## Strengths

**Controlled reproducibility.** Each task runs in an isolated database snapshot. Unlike web agent benchmarks where live websites change, AppWorld results are stable over time and across machines.

**Real complexity without real systems.** The multi-app interdependencies create genuinely hard tasks without requiring live API credentials, rate limits, or external service dependencies. Researchers can run thousands of evaluation episodes.

**Measurable, unambiguous outcomes.** Database state comparison avoids the subjectivity of LLM-as-judge evaluation. Either the Spotify subscription was cancelled and the Venmo request was sent, or it was not.

**Code execution as a tool.** The Python REPL design tests whether agents can write working code to process API responses, not just whether they can string API calls together. This is closer to how capable human users actually interact with services.

## Limitations

**One concrete failure mode:** Tasks with ambiguous specifications expose a systematic failure. When a task says "cancel the subscription I'm paying for my roommate," the agent must determine which subscription qualifies (the roommate could be on multiple plans). Agents that pick the wrong interpretation complete all API calls successfully but fail evaluation because the database state is wrong. Benchmark scores do not distinguish "wrong interpretation" failures from "API usage" failures, making it hard to diagnose agent weaknesses.

**One unspoken infrastructure assumption:** AppWorld's sandboxed environment assumes the agent's code runs in a trusted, controlled interpreter. Production deployments cannot give agents arbitrary Python execution against real APIs. The skills and capabilities demonstrated on AppWorld transfer imperfectly to systems that need sandboxing, permission controls, or API authentication — the benchmark abstracts these away entirely.

**Closed ecosystem.** The 9 apps cover common personal productivity scenarios but miss enterprise contexts (Salesforce, JIRA, GitHub), developer tools, and domain-specific APIs. Agents that score well on AppWorld may not generalize to vertical-specific workflows.

**Leaderboard dynamics.** Public leaderboards incentivize benchmark-specific optimization. Systems tuned specifically for AppWorld's API patterns and task distributions (as SAGE and AgentEvolver clearly are, given AppWorld is their primary training environment) may overfit to this benchmark's quirks.

## When Not to Use It

AppWorld is the wrong benchmark when you need to evaluate:

- **Enterprise or domain-specific agent workflows.** The benchmark's personal app ecosystem does not reflect B2B automation patterns. Use [Tau-bench](../projects/tau-bench.md) for customer service or [SWE-bench](../projects/swe-bench.md) for software engineering tasks.
- **Open-ended web navigation.** AppWorld provides structured APIs; it does not test agents that must navigate GUIs, parse HTML, or handle unpredictable web surfaces.
- **Multi-agent coordination.** All tasks are single-agent. If you are building systems where multiple agents coordinate, AppWorld will not surface coordination failures.
- **Safety and adversarial robustness.** The controlled environment has no malicious content, prompt injection attempts, or adversarial API responses.

## Unresolved Questions

**Test set security.** The public leaderboard implies a held-out test set, but the documentation does not describe how test task isolation is maintained as the dataset becomes more widely known. If training datasets for models like AgentEvolver include AppWorld tasks, contamination becomes a concern.

**Cost at scale.** Running AppWorld evaluation requires executing hundreds of isolated sandboxed environments. The compute and storage cost of running full evaluations at scale is not published. Research groups with GPU clusters can absorb this, but small teams may find evaluation prohibitively expensive.

**Scenario composition methodology.** How tasks are grouped into scenarios (for SGC scoring) and how scenario difficulty is balanced across the four levels is not publicly documented in detail. The SGC metric's sensitivity to scenario composition choices is not analyzed.

**Generalization evidence.** AgentEvolver and SAGE both train specifically on AppWorld and report AppWorld results. There is limited evidence that AppWorld-specific improvements transfer to other multi-app benchmarks. The correlation between AppWorld scores and real-world agent capability is asserted, not demonstrated.

## Alternatives

- **[Tau-bench](../projects/tau-bench.md):** Use when evaluating agents on customer service or retail workflows with human-in-the-loop dynamics.
- **[SWE-bench](../projects/swe-bench.md):** Use when evaluating software engineering agents on real GitHub issues with code execution.
- **[GAIA](../projects/gaia.md):** Use when evaluating general-purpose question answering with tool use across diverse domains.
- **[HotpotQA](../projects/hotpotqa.md):** Use when evaluating multi-hop reasoning without execution environments.

AppWorld is the right choice specifically when you want to measure structured API orchestration across interdependent services in a reproducible, sandboxed setting with unambiguous outcome metrics.

## Related Concepts

- [Agent Skills](../concepts/agent-skills.md): AppWorld is the primary training and evaluation environment for skill-based agent research including SAGE.
- [ReAct](../concepts/react.md): The baseline agent architecture used in most AppWorld evaluations.
- [Context Engineering](../concepts/context-engineering.md): ACE uses AppWorld as its primary agent benchmark for evaluating evolving context playbooks.
- [Multi-Agent Systems](../concepts/multi-agent-systems.md): AppWorld is single-agent, but results are often compared to multi-agent baselines.
- [Self-Improving Agents](../concepts/self-improving-agents.md): AgentEvolver and SAGE both use AppWorld as the primary environment for training self-evolving agents.
