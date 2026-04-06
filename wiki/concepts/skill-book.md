---
entity_id: skill-book
type: concept
bucket: agent-systems
abstract: >-
  A skillbook is a persistent, queryable repository of agent capabilities that
  survives across sessions, enabling agents to retrieve and reuse learned
  procedures rather than rediscovering them on each run.
sources:
  - repos/jmilinovich-goal-md.md
  - repos/kayba-ai-agentic-context-engine.md
  - papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
  - deep/repos/kayba-ai-agentic-context-engine.md
  - deep/repos/jmilinovich-goal-md.md
  - deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
related:
  - Agent Skills
last_compiled: '2026-04-05T23:15:29.211Z'
---
# Skillbook

## What It Is

A skillbook is a structured store of reusable agent capabilities: named procedures, strategies, or code snippets that an agent has learned, verified, and can retrieve during future task execution. The core function is simple: instead of each agent session starting from zero, the skillbook provides a growing base of validated knowledge that agents consult before acting.

The concept appears across agent frameworks under different names. Voyager calls it a "skill library." ACE calls it a "Skillbook." GOAL.md encodes skills as files in `.claude/skills/`. The underlying pattern is consistent: capture a successful behavior, index it for retrieval, inject it as context when relevant.

Skillbooks extend [Agent Skills](../concepts/agent-skills.md), which define the individual capability unit. A skillbook is the container, indexing layer, and retrieval mechanism for many such units.

## Why It Matters

Agents without persistent skill storage exhibit a specific failure mode: they repeat the same mistakes across sessions, rediscover the same solutions, and cannot compound learning from past execution. This wastes compute and degrades user experience in production deployments.

The skillbook pattern directly addresses this by creating a feedback loop: successful execution → skill extraction → storage → retrieval → better future execution. Each cycle the agent has more context to work with. Voyager demonstrated the compounding effect concretely: after building a skill library across exploration, the agent achieved diamond-level Minecraft tools while baselines (with no skill persistence) never reached that tier across hundreds of attempts. [Source](../raw/deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md)

## How It Works

### Storage

The unit of storage is the skill: a named, described capability with enough metadata to support retrieval and provenance tracking.

In ACE's implementation (`ace/core/skillbook.py`), each skill contains:
- `id`: auto-generated as `{section}-{counter:05d}` (e.g., `general-00042`)
- `section`: organizational category (`general`, `error-handling`, `formatting`)
- `content`: the strategy text in natural language
- `justification` and `evidence`: why the skill was added, with supporting data
- `sources`: `InsightSource` objects tracking which epoch, trace, and sample question generated the skill
- `embedding`: optional float vector for similarity-based retrieval
- `status`: `"active"` or `"invalid"` (soft-delete)

Voyager stores skills differently: as executable JavaScript functions, indexed by text embeddings of their descriptions. The code-as-skill representation ensures precise reproducibility but limits adaptability across API versions. [Source](../raw/deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md)

### Population

Skills enter the skillbook through verified execution. ACE runs a pipeline:

```
AgentStep → EvaluateStep → ReflectStep → UpdateStep → DeduplicateStep → PersistStep
```

The `ReflectStep` analyzes what went right or wrong. The `UpdateStep` (driven by a SkillManager LLM role) issues mutations: `ADD`, `UPDATE`, or `REMOVE`. A skill is only written to the book after the SkillManager confirms it represents a durable, generalizable lesson, not a task-specific artifact.

Voyager uses a dedicated self-verification critic — a separate GPT-4 instance that evaluates whether the agent completed its objective before allowing a skill into the library. Ablation showed this quality gate accounts for 73% of Voyager's performance advantage. Removing it causes immediate degradation as broken skills pollute retrieval. [Source](../raw/deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md)

### Retrieval

Two retrieval modes exist across implementations:

**Full injection**: All skills rendered as prompt context. ACE's `Skillbook.as_prompt()` uses the `python-toon` library for compressed tab-delimited encoding. The XML renderer (`ace/implementations/skill_rendering.py`) produces `<strategy id="general-00042" section="general">` elements. This works for small skillbooks but hits context window limits as the library grows.

**Embedding-based retrieval**: ACE's `retrieve_top_k()` computes cosine similarity between the task query and skill embeddings, returning only the most relevant skills. Voyager retrieves the top-5 most similar skills per task. This scales to larger libraries but introduces retrieval failures when text descriptions are poor proxies for functional relevance.

The `SimilarityDetector` component handles embedding computation for both retrieval and deduplication, reusing the same infrastructure for both functions. [Source](../raw/deep/repos/kayba-ai-agentic-context-engine.md)

### Deduplication

Without deduplication, near-identical skills accumulate. ACE runs a `DeduplicateStep` after each update cycle: skills above a similarity threshold get merged. The system persists `SimilarityDecision` objects in the skillbook itself, recording when two skills were evaluated and kept separate. This prevents the same pair from being re-evaluated in every epoch, an important optimization for long-running loops. [Source](../raw/deep/repos/kayba-ai-agentic-context-engine.md)

### Persistence

ACE serializes the skillbook to JSON via `to_dict()` / `from_dict()`. The `PersistStep` writes to disk after each epoch. The `InsightSource` provenance chain means every skill can be traced back to the specific execution that generated it. The `source_filter()` method enables queries like "show me skills learned from epoch 3," which aids debugging when a skill causes regressions.

Thread safety uses `threading.RLock()` on all write paths. The `SkillbookView` class wraps the real skillbook and exposes only read methods, implementing a capability-based pattern: Agent and Reflector roles receive a view; SkillManager receives the real object. [Source](../raw/deep/repos/kayba-ai-agentic-context-engine.md)

## Key Numbers

ACE (2,112 GitHub stars, MIT, Python): on TAU2 airline benchmark, 15 learned strategies doubled pass^4 consistency with Claude Haiku 4.5, no reward signals. 49% token reduction on browser automation over a 10-run learning curve. Self-reported by Kayba AI, not independently validated. [Source](../raw/repos/kayba-ai-agentic-context-engine.md)

Voyager: 3.3x more unique items discovered, 15.3x faster tech tree progression vs. AutoGPT baselines. Reported in the Stanford/SambaNova paper. Independently conducted benchmark (TAU-bench by Sierra Research cited by ACE), though Voyager's Minecraft results were author-run. [Source](../raw/deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md)

## Strengths

**Cross-session compounding**: Skills persist across restarts. An agent that learned "verify booking status before changing a flight" applies that lesson to session 50 without re-deriving it from scratch.

**Interpretable representation**: Natural language strategies and executable code are both human-readable. Operators can inspect, audit, and manually correct the skillbook without touching model weights.

**Compositional reuse**: Voyager's skill functions call other skills from the library, creating hierarchical capability growth. ACE's agent prompt instructs the model to cite skill IDs inline, enabling the Reflector to track which strategies actually influenced outcomes.

**Provenance tracking**: ACE's `InsightSource` chain records the exact epoch, trace, and question that generated each skill. This makes skill regressions debuggable: find which execution produced the broken skill, examine the trace.

## Limitations

**Skill explosion**: ACE's skillbook has no capacity limit. Over many epochs, near-similar skills proliferate. Deduplication helps but cannot catch all semantic duplicates. Eventually `as_prompt()` exceeds context window limits; `retrieve_top_k()` mitigates this for inference but the SkillManager still receives the full text for curation decisions. [Source](../raw/deep/repos/kayba-ai-agentic-context-engine.md)

**Cold start problem**: An empty skillbook provides no benefit. The first epochs have no strategies to leverage. ACE provides no skill import or transfer mechanism from existing skillbooks, though `loads()` / `from_dict()` could be used manually.

**Ground truth dependency**: ACE's evaluate-reflect loop degrades without a clear success/failure signal. When ground truth is unavailable and environment feedback is noisy, the Reflector produces lower-quality skill extractions. Voyager requires explicit task completion signals for the self-verification critic to function.

**Retrieval failure modes**: Embedding-based retrieval assumes text descriptions predict functional relevance. A skill described as "handle flight rebooking" may be highly relevant to "reschedule a trip" but score low on similarity. Poor skill descriptions silently degrade retrieval quality.

**No skill update history**: ACE tracks provenance for creation but not for subsequent mutations. If a skill is updated 10 times, the final version carries only the original source metadata.

## When Not to Use a Skillbook

For one-shot or low-repetition tasks, the overhead of extraction, deduplication, and persistence adds latency and cost with no compounding benefit. If each task the agent handles is structurally unique, skills learned from past tasks rarely transfer.

Domains with rapidly changing operational contexts — where yesterday's correct procedure is today's wrong one — accumulate stale skills that mislead more than they help. A skillbook without active invalidation is a liability in high-churn environments.

If your agent framework lacks a reliable success/failure signal, the quality gate on skill creation breaks down. Skills enter the library without verification and degrade future performance.

## Unresolved Questions

**Skill invalidation at scale**: ACE supports soft-delete via `status: "invalid"`, but no mechanism triggers this automatically when a skill starts producing poor outcomes. Long-running deployments accumulate outdated strategies with no self-cleaning.

**Cross-agent transfer**: Can a skillbook trained on one agent configuration transfer to another model or another task domain? The ACE codebase supports serialization but not transfer protocols. Voyager's zero-shot generalization results show skills transfer across Minecraft worlds, but cross-domain transfer is unvalidated for either system.

**Governance at scale**: Who audits the skillbook in production? ACE's provenance tracking supports human review but provides no workflow tooling for it. The Kayba hosted solution presumably addresses this, but details are not in the open-source repository.

**Cost accumulation**: Three LLM calls per learning cycle (Reflector, SkillManager, deduplication embeddings) adds up. ACE tracks token usage per role but provides no cost budget or stopping conditions. A long-running continuous loop with GPT-4 in all roles will accumulate significant API costs.

## Alternatives

**In-context learning without persistence**: Pass relevant examples directly in the prompt each session, selected by a retrieval system from a static example bank. Simpler to implement, no persistence layer, but does not compound — the example bank is manually curated rather than learned.

**Fine-tuning**: Bake learned behaviors into model weights. More durable than prompt injection, but requires data pipelines, training infrastructure, and evaluation. No interpretability at the individual skill level.

**Memory systems (MemGPT / external vector stores)**: Store episodic memories of past interactions. More granular than skills, better for "what did I do last Tuesday" retrieval, but less structured for "how should I handle booking changes" strategy retrieval.

Use a skillbook when: (1) the same agent runs repeatedly on structurally similar tasks, (2) you have a reliable success/failure signal for verification, (3) you need human-readable auditability of learned behaviors, and (4) you can tolerate the latency of a multi-role learning pipeline.

## Related Pages

- [Agent Skills](../concepts/agent-skills.md)
- [Voyager](../projects/voyager.md) (if created)
- [Agentic Context Engine](../projects/agentic-context-engine.md) (if created)
