---
entity_id: dynamic-cheatsheet
type: concept
bucket: context-engineering
abstract: >-
  A dynamic cheatsheet is an agent-maintained reference document that
  accumulates, updates, and prunes task-relevant knowledge during execution,
  preventing context loss across long tasks or session resets.
sources:
  - tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md
  - deep/repos/gepa-ai-gepa.md
  - deep/repos/bingreeky-memevolve.md
  - deep/repos/davebcn87-pi-autoresearch.md
  - deep/papers/zhang-agentic-context-engineering-evolving-contexts-for.md
related: []
last_compiled: '2026-04-05T23:19:47.562Z'
---
# Dynamic Cheatsheet

## What It Is

A dynamic cheatsheet is a text document that an agent writes to, updates, and reads from during task execution. Unlike a static system prompt, it changes as the agent learns. Unlike raw conversation history, it is curated: the agent decides what to record, how to organize it, and what to remove when it becomes stale or redundant.

The core problem it solves: LLM agents have bounded context windows, so they cannot hold an entire task history in working memory. They also forget information across session resets. A cheatsheet bridges these gaps by externalizing knowledge the agent has earned through execution into a format it can consult later.

The pattern appears across multiple systems under different names. MemEvolve's [EvolveLab](../raw/deep/repos/bingreeky-memevolve.md) catalogs it as one of twelve baseline memory providers. The ACE framework benchmarks against it as a representative online memory baseline. Pi-autoresearch's `autoresearch.md` file instantiates the same pattern with explicit structure requirements.

## How It Works

### The Basic Loop

An agent executing a multi-step task periodically pauses to:

1. Review what it just learned or accomplished
2. Decide which facts, patterns, or observations are worth preserving
3. Write or update entries in the cheatsheet
4. On future steps, read the cheatsheet before acting

The cheatsheet is typically a markdown file, a YAML document, or structured plain text. Format matters less than the agent's discipline in maintaining it.

### What Gets Recorded

Agents trained or prompted to maintain cheatsheets typically record:

- **Domain-specific facts** discovered during execution ("This API requires the session token in a header, not a query param")
- **Failure patterns** and their fixes ("Task fails when input exceeds 500 tokens; chunking resolves it")
- **Task state** -- progress markers, decisions made, branches explored
- **Constraints and rules** that apply to the current task environment
- **Open questions** the agent has not yet resolved

Pi-autoresearch formalizes this structure in its SKILL.md: the `autoresearch.md` file has explicit sections for Objective, Metrics, How to Run, Files in Scope, Off Limits, Constraints, and "What's Been Tried." The "What's Been Tried" section is the critical memory -- it prevents resuming agents from repeating failed approaches. [Source](../raw/deep/repos/davebcn87-pi-autoresearch.md)

### Session Continuity

The cheatsheet's most important function is enabling session resumption. When a context window exhausts, a new agent instance reads the cheatsheet and continues without re-discovering what the previous instance already learned. Pi-autoresearch explicitly documents this: "A fresh agent with no memory reads this file and can continue exactly where the previous session left off."

The companion `autoresearch.ideas.md` file extends this by preserving a backlog of promising approaches not yet attempted -- a secondary memory layer for deferred work.

## The Context Collapse Problem

Cheatsheets that allow the agent to freely rewrite their own content degrade over time. The ACE framework names this failure mode "context collapse": when LLMs iteratively summarize context, brevity bias causes them to drop detailed domain insights in favor of concise generalizations. A specific instruction like "check the decimals attribute before the scale attribute in European XBRL filings" collapses to "parse financial filings carefully" after a few rewrites. After 5-10 iterations, the cheatsheet converges to generic instructions that have lost all task-specific knowledge. [Source](../raw/deep/papers/zhang-agentic-context-engineering-evolving-contexts-for.md)

ACE's solution is architectural: replace free-form rewriting with incremental delta updates. New knowledge appends as structured bullets with helpful/harmful counters. The merge operation is deterministic, not LLM-driven. The agent adds to the cheatsheet but cannot rewrite existing entries through the normal update path. Semantic deduplication prunes redundant bullets using embedding similarity rather than LLM judgment.

This distinction matters in practice. A cheatsheet that asks the agent to "update the notes section with what you learned" will collapse. One that asks the agent to "append new findings as bullets; do not modify existing entries" will not.

## Strengths

**Works without labels.** A cheatsheet accumulates knowledge from execution feedback alone. If code runs, an API call succeeds, or a task completes, that outcome is sufficient supervision signal. ACE demonstrates +14.8% improvement on agent benchmarks without ground-truth labels, using execution feedback as the sole learning signal.

**Bridges context resets.** External files persist across context window exhaustion, model restarts, or agent handoffs. The pi-autoresearch auto-resume mechanism explicitly relies on this: after context exhaustion, the new session reads `autoresearch.md` and continues.

**Cheap to implement.** The basic pattern requires only file I/O and agent prompting. No vector databases, embedding models, or specialized infrastructure. This is a significant advantage over retrieval-augmented memory systems.

**Human-readable.** Unlike embedding stores or graph databases, a cheatsheet is inspectable. A developer can read it, spot problems, and manually correct entries. This transparency aids debugging.

**Composable with other memory systems.** Cheatsheets serve as the structured extraction layer in larger architectures. The multi-agent swarm pattern described by @jumperz uses agent-produced raw outputs feeding a compiler that organizes them into structured wiki articles, which then generate per-agent briefings. The cheatsheet is one node in this pipeline, not a complete memory architecture. [Source](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)

## Limitations

**Context collapse under free rewriting.** As described above, agents that rewrite their own cheatsheets lose information over iterations. ACE benchmarks show Dynamic Cheatsheet performing 7.6% below ACE on the AppWorld benchmark, with 91.5% higher adaptation latency and 83.6% higher token cost. The gap is attributable to the rewriting mechanism.

**No structure enforces quality.** A cheatsheet is only as good as the agent's judgment about what to record. Agents that record irrelevant details, fail to update stale entries, or over-compress useful information produce cheatsheets that mislead more than they help. There is no automatic quality gate.

**Flat structure does not scale.** A cheatsheet as a flat list of notes becomes unwieldy beyond a few hundred entries. Retrieval degrades as the agent must attend to an increasingly long document. Systems like A-MEM or Zep address this with hierarchical organization, but a basic cheatsheet does not.

**Hallucinations compound.** Without a validation layer, a cheatsheet records what the agent believes, not what is true. In a multi-agent system, one agent's hallucinated connection enters the shared cheatsheet and downstream agents build on it. The @jumperz architecture addresses this explicitly with Hermes as a blind review gate between drafts and live knowledge -- an agent that evaluates articles without knowing how they were produced, preventing bias toward keeping work it did not produce.

**No deprecation mechanism.** Facts recorded early in a task may become wrong as the environment changes or the agent's understanding deepens. Without explicit deprecation logic, stale entries persist indefinitely and can contradict newer, correct entries.

## Concrete Failure Mode

An agent optimizing a software benchmark records "using process pools improved throughput by 30%" after an early experiment. Three sessions later, after the codebase has changed substantially, the benchmark infrastructure now imposes a process limit that makes pools slower. The agent reads the old cheatsheet entry, attempts process pooling, sees degraded results, and marks the run as failed -- but does not update the cheatsheet entry because it cannot explain the contradiction. The stale entry persists and continues misleading future sessions.

The fix: entries should carry version markers, timestamps, or execution context (e.g., "observed at session 4, benchmark v1.2"). Pi-autoresearch's JSONL persistence addresses this for experiment logs -- every entry carries a timestamp and segment index -- but the human-readable `autoresearch.md` file lacks this structure.

## Infrastructure Assumption

The pattern assumes the agent has reliable, fast file I/O to a persistent location. This holds trivially for single-machine deployments. In distributed agent systems, shared file access becomes a coordination problem: two agents writing the cheatsheet simultaneously can corrupt it. Architectures that route all writes through a single compiler or curator (as in the @jumperz pattern) avoid this, but add latency.

## Implementation Variants

**Append-only with counters (ACE):** Bullets with helpful/harmful counters, deterministic merge, semantic deduplication. Best for systems that need to avoid context collapse over many iterations. [Source](../raw/deep/papers/zhang-agentic-context-engineering-evolving-contexts-for.md)

**Structured sections with human-readable format (pi-autoresearch):** Explicit sections for different knowledge types, designed for human inspection and agent consumption. Best for single-agent optimization loops where humans may want to review progress. [Source](../raw/deep/repos/davebcn87-pi-autoresearch.md)

**LLM-generated provider code (MemEvolve):** MemEvolve treats the cheatsheet as one of twelve memory architectures in a design space, generating entirely new memory provider implementations rather than tuning parameters. `dynamic_cheatsheet` is a named baseline that evolved systems are compared against and expected to outperform. [Source](../raw/deep/repos/bingreeky-memevolve.md)

**Wiki with validation gate (multi-agent swarm):** Raw agent outputs feed a compiler that organizes them into articles. A separate supervisor agent scores each article before it enters the permanent knowledge base. Briefings generated from validated articles feed back to agents. This is the most sophisticated instantiation -- it adds compilation, validation, and distribution stages around the core cheatsheet pattern.

## When Not to Use It

**Simple, short tasks.** ACE notes that simpler tasks benefit more from concise instructions than growing playbooks. The overhead of maintaining a cheatsheet is not justified when the task fits in a single context window and does not repeat.

**When execution feedback is unreliable.** If the agent cannot distinguish successful from failed actions, the cheatsheet will record noise as signal. Without a reliable quality signal, entries degrade rather than improve over time.

**When latency is critical.** Reading and writing the cheatsheet adds latency to every step. For real-time systems where response speed matters more than accumulated knowledge, static system prompts or retrieval-augmented memory with fast lookup will outperform a cheatsheet that requires full document scanning.

**Untrusted multi-agent contexts without a validation layer.** When multiple agents contribute to a shared cheatsheet without a review gate, hallucinations spread rapidly. Use the validation gate pattern from @jumperz before deploying shared cheatsheets in production multi-agent systems.

## Unresolved Questions

The pattern lacks established answers to: how large should a cheatsheet grow before pruning is mandatory; what the right granularity is for individual entries; how to handle contradictions between entries without LLM involvement; and how to measure cheatsheet quality independently of task performance. These are practical engineering questions that current implementations leave to the developer.
