---
entity_id: ace
type: project
bucket: agent-systems
sources:
  - repos/kayba-ai-agentic-context-engine.md
  - papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
  - deep/papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
  - deep/papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
  - deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
related: []
last_compiled: '2026-04-05T05:27:24.217Z'
---
# ACE (Agentic Context Engine)

**Type:** Agent learning framework | **Language:** Python | **License:** MIT
**Stars:** 2,112 | **Forks:** 264 | **Last updated:** April 2026

## What It Does

ACE gives LLM agents a persistent learning loop. Agents normally repeat the same mistakes across sessions because nothing carries forward from one run to the next. ACE fixes this by maintaining a **Skillbook**, a queryable collection of strategies that agents retrieve during inference. After each run, a Reflector analyzes execution traces and a SkillManager updates the Skillbook. The agent consults current Skillbook entries at the start of each subsequent task.

The project has two related origins: the [open-source repo](https://github.com/kayba-ai/agentic-context-engine) from Kayba AI, and a Stanford/SambaNova paper ([Zhang et al., 2025](https://arxiv.org/abs/2510.04618)) that frames the same idea as treating system prompts and agent memory as "evolving playbooks" rather than static text.

## Core Mechanism

Three roles drive the learning loop:

| Role | Job |
|------|-----|
| **Agent** | Executes tasks; reads Skillbook strategies at inference time |
| **Reflector** | Analyzes traces; the "Recursive Reflector" writes and runs Python in a sandbox to find patterns programmatically |
| **SkillManager** | Adds, refines, and prunes strategies in the Skillbook |

The pipeline is composable: `AgentStep → EvaluateStep → ReflectStep → UpdateStep → ApplyStep → DeduplicateStep`. Each step declares `requires` and `provides` contracts; context is immutable between steps. The pipeline code lives in `pipeline/`, with design rationale in `docs/design/PIPELINE_DESIGN.md` and `docs/design/ACE_ARCHITECTURE.md`.

All roles are backed by PydanticAI agents with structured output validation. LiteLLM routes calls to 100+ providers. Optional embedding-based deduplication (`ace-framework[deduplication]`) prevents the Skillbook from accumulating redundant entries.

The paper's framing adds two specific problems this architecture targets: **brevity bias** (summaries discard domain-specific detail) and **context collapse** (iterative rewriting erodes knowledge over time). Structured incremental updates to the Skillbook avoid both.

## Key Numbers

| Metric | Result | Source |
|--------|--------|--------|
| Tau2 airline benchmark (pass^4) | 2x consistency with 15 learned strategies | Self-reported; methodology described but not independently validated |
| Browser automation token reduction | 49% over 10 runs | Self-reported |
| Claude Code: 14k lines Python → TypeScript | 0 build errors, all tests passing, ~$1.50 learning cost | Self-reported |
| Agent benchmarks vs. baselines | +10.6% | Paper-reported; AppWorld leaderboard comparison is publicly verifiable |
| Finance domain benchmarks | +8.6% | Paper-reported |

The AppWorld leaderboard result is the most credible: ACE matches the top-ranked production agent on overall average and beats it on the harder test-challenge split using a smaller open-source model. The browser automation and Claude Code numbers are compelling but come from Kayba's own evaluations.

A follow-on paper (Meta-Harness, Lee et al. 2026) shows a competing approach beats ACE by 7.7 points on online text classification while using 4x fewer context tokens, which puts a ceiling on ACE's claims in that setting.

## Strengths

**No fine-tuning or labeled data required.** ACE learns from natural execution feedback. You don't need reward signals, human annotations, or a training pipeline.

**Framework-agnostic runners.** Wrappers exist for LiteLLM, LangChain, browser-use, Claude Code CLI, and MCP servers. You can also feed existing logs to `TraceAnalyser` and extract strategies without re-running tasks.

**Offline and online optimization.** The paper validates both modes: offline (improving system prompts before deployment) and online (updating agent memory during live task execution).

**Composable pipeline.** Custom step sequences let you swap out components without touching the rest of the loop.

## Critical Limitations

**Concrete failure mode:** The Recursive Reflector's correctness depends on the quality of traces it receives. If an agent fails silently (produces wrong output without an error or exception), the Reflector has nothing concrete to analyze. Strategies extracted from ambiguous traces may encode the wrong lesson, and the SkillManager has no ground truth to check against. Bad strategies compound across sessions rather than self-correcting.

**Unspoken infrastructure assumption:** The Skillbook is local by default. Multi-agent deployments where several agent instances run concurrently against the same Skillbook require either the hosted Kayba service or custom synchronization logic. The open-source repo gives no guidance on concurrent writes or conflict resolution between SkillManagers.

## When Not to Use It

**Single-run or low-repetition tasks.** The learning loop pays off over many runs of similar tasks. If your agent runs each task type once, the Skillbook never accumulates enough strategies to matter, and you pay Reflector inference costs for nothing.

**Latency-sensitive production paths.** Skillbook retrieval adds an inference call before each task. For sub-second SLA requirements, this overhead is a problem.

**Tasks where trace quality is unreliable.** If your environment produces noisy, incomplete, or unstructured logs, the Reflector's analysis degrades. The framework has no explicit mechanism for detecting or discarding low-quality traces.

**When harness-level optimization is the goal.** Meta-Harness (Lee et al. 2026) outperforms ACE on text classification by optimizing the code that controls what the model sees, rather than the text content of memory. If you can run an outer optimization loop over harness code, that approach uses fewer tokens and reaches higher accuracy.

## Unresolved Questions

**Skillbook governance at scale.** The SkillManager prunes and refines strategies, but the repo doesn't document how conflicts between contradictory strategies are resolved, how many strategies is too many before retrieval degrades, or what happens when a domain shifts and old strategies become wrong.

**Hosted service vs. open-source parity.** Kayba offers a paid hosted product. The README doesn't clarify which features are open-source-only, which require the cloud service, and whether the CLI's `kayba` commands work without an account.

**Deduplication threshold tuning.** Embedding-based deduplication is an optional extra (`ace-framework[deduplication]`), but there's no published guidance on similarity thresholds. Too aggressive and you lose meaningful strategy variants; too permissive and the Skillbook bloats.

**Cost scaling.** The $1.50 translation figure covers one Claude Code run. Long-running deployments where the Reflector fires after every task, across many agents, have no published cost model.

## Alternatives

| Tool | Use when |
|------|----------|
| **Meta-Harness** | You want to optimize the code controlling LLM inputs (not just text strategies), and can tolerate a longer outer optimization loop |
| **LangMem / MemGPT** | You need general-purpose agent memory with conversation history, not task-specific strategy accumulation |
| **DSPy** | Your goal is systematic prompt optimization with labeled examples and defined metrics, not inference-time learning from execution traces |
| **Raw RAG over logs** | Your traces are high-volume and structured, and you need retrieval without the overhead of Reflector inference calls |

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md)
- [Agent Memory](../concepts/agent-memory.md)

## Sources

- [Kayba AI repo README](../../raw/repos/kayba-ai-agentic-context-engine.md)
- [Zhang et al. 2025 paper](../../raw/papers/zhang-agentic-context-engineering-evolving-contexts-for.md)
- [Lee et al. 2026, Meta-Harness](../../raw/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md)
