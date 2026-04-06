---
entity_id: multi-agent-systems
type: concept
bucket: agent-systems
abstract: >-
  Multi-agent systems coordinate multiple AI agents with divided labor and
  specialized roles to tackle problems too large or complex for a single model
  call — differentiated by how they handle context sharing, validation, and
  compounding errors across agent boundaries.
sources:
  - tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md
  - tweets/jayagup10-ai-s-trillion-dollar-opportunity-context-graphs.md
  - tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
related: []
last_compiled: '2026-04-05T23:20:05.621Z'
---
# Multi-Agent Systems

## What They Are

A multi-agent system (MAS) is an architecture where multiple AI agents run concurrently or in sequence, each acting on some portion of a larger task. Agents may specialize (one retrieves data, another drafts, another validates), parallelize identical subtasks across a problem space, or operate in a supervisor-worker hierarchy where a coordinator routes work to specialists.

The core appeal: single-agent systems hit practical limits. Context windows fill up. Single models can't parallelize. Tasks that require critique benefit from an agent that didn't write the original output. Multi-agent architectures address these by distributing both cognition and execution.

Andrej Karpathy's autoresearch experiment makes the practical case concrete. Over two days, an agent swarm ran approximately 700 autonomous experiments on a neural network training configuration — catching bugs Karpathy had missed in months of manual tuning, including an unscaled QK normalization multiplier, missing regularization on value embeddings, and misconfigured AdamW betas. Stacking the changes produced an 11% training speedup (self-reported, not independently benchmarked). His conclusion: "any metric you care about that is reasonably efficient to evaluate can be autoresearched by an agent swarm." [Source](../raw/tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md)

## Core Mechanisms

**Division of labor** splits a workflow into subtasks assigned to different agents. The split can be functional (retriever, reasoner, writer, critic) or horizontal (ten agents each processing one document from a batch).

**Cascading validation** chains agents so earlier outputs get evaluated before later stages consume them. Karpathy's autoresearch used small-model experiments to gate which changes got promoted to larger-scale testing — a budget-aware filter that avoids running expensive evaluations on weak candidates.

**Supervisor-worker hierarchies** designate one agent to coordinate others. The supervisor routes tasks, aggregates results, and sometimes holds a different model or system prompt than the workers it oversees. This separation matters: a supervisor that didn't produce the work has no prior commitment to it and judges it more honestly.

**Shared knowledge bases and wikis** give all agents a persistent memory outside any individual context window. One practitioner's architecture dumps every agent's output into a `raw/` folder, then a compiler runs periodically to organize material into structured wiki articles with backlinks and an index. Agents start each session with a pre-generated briefing derived from that wiki rather than blank context. [Source](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)

**Context graphs** are a more structured variant: rather than raw documents, the persistent layer stores decision traces — what policy applied, what exception was granted, who approved, what precedent was invoked. These records make reasoning auditable and searchable, and they compound: each new decision adds another trace that future agents can reference. The argument is that this trace layer, not just access to existing data, is what enables genuine autonomy at scale. [Source](../raw/tweets/jayagup10-ai-s-trillion-dollar-opportunity-context-graphs.md)

**Quality gates** sit between raw agent output and permanent storage. In one documented pattern, a separate "Hermes" supervisor agent reviews every article before it enters the live knowledge base, scoring it blind to how it was produced. Clean outputs get promoted; bad ones die in drafts. The key design decision: the reviewing agent is not part of the swarm it evaluates and has no context about production process, removing the bias toward preserving work already done. [Source](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)

## Why Architecture Matters Here

The survey literature frames multi-agent systems as an integration of retrieval, processing, and memory components — not just chained prompts. [Source](../raw/papers/mei-a-survey-of-context-engineering-for-large-language.md) What you put in each agent's context window determines what it can do. This sounds obvious but has real design consequences: agents sharing raw unvalidated outputs corrupt downstream reasoning. Agents starting from well-structured briefings rather than blank state perform more consistently.

The asymmetry between LLM comprehension and generation creates specific constraints. Models understand complex multi-source contexts better than they generate equivalently sophisticated long-form outputs. System designers who understand this build agents that consume rich context but produce narrow, structured outputs — easier to validate and compose.

## Compounding Error: The Central Failure Mode

The dangerous property of multi-agent pipelines is that errors compound. One hallucinated connection in a shared knowledge base enters the context of every subsequent agent. Those agents build on it. Their outputs feed back into the knowledge base. Within a few cycles, the corruption is structural.

This isn't a hypothetical. The practitioner who built a 10-agent swarm explicitly identifies it: "raw data is dangerous when it compounds cause one hallucinated connection enters the brain and every agent downstream builds on it." [Source](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md) The mitigation — a blind review gate before anything enters permanent storage — is an operational overhead most teams don't build until they've already been burned.

Individual agent errors in a single-agent system are recoverable. In a multi-agent pipeline with shared state, they can be self-reinforcing.

## Unspoken Infrastructure Assumptions

Multi-agent systems assume you can define success metrics clearly enough to evaluate agent output, either by a supervisor agent or by automated scoring. Karpathy's autoresearch worked because validation loss is unambiguous and cheap to compute on small models. Workflows where "correct" is contested, subjective, or expensive to evaluate don't get the same quality gating — and without it, the swarm has no signal for which outputs to keep.

They also assume the coordination overhead is worth it. Running ten agents with a supervisor, a shared knowledge base, and a validation pipeline is engineering work. For tasks a single capable model can handle in one pass, the added complexity produces latency and cost with no quality benefit.

## When Not to Use Multi-Agent Systems

Don't use this architecture when the task fits in a single context window and doesn't benefit from specialized critique. Adding agents to a task a single model handles well introduces coordination overhead, more failure points, and debugging complexity with no upside.

Don't use it when you can't define a validation signal. Without some mechanism to catch bad agent output before it enters shared state, multi-agent pipelines amplify errors rather than reducing them. A single careful model call beats a swarm feeding each other hallucinations.

Don't use it when latency matters more than thoroughness. Multi-agent coordination adds round trips. For interactive applications, the speed cost is often prohibitive.

## Strengths

Parallelism is the clearest one. Tasks that decompose into independent subtasks — processing a large document corpus, running many experiments, drafting variations — scale horizontally without hitting single-context limits.

Separation of concerns enables genuine specialization. A retrieval agent optimized for broad search, a synthesis agent with a longer working context, and a critic agent with a different system prompt will each do their job better than one agent trying to do all three.

Blind review is structurally easier. An agent that didn't produce content has no sunk-cost bias. This is why supervisor hierarchies with separate reviewer agents outperform self-critique in quality-sensitive pipelines.

Decision trace accumulation compounds over time. Each run adds precedent. Agents that start from a briefing built on hundreds of prior decisions make fewer edge-case errors than agents starting from a blank context.

## Unresolved Questions

**Governance at scale**: who decides which agent outputs get promoted, how review criteria evolve, and who owns the knowledge base when it produces a wrong answer that propagates? The architectural patterns exist but governance frameworks don't.

**Cost modeling**: running 700 experiments autonomously sounds cheap until you price the API calls. Published demonstrations rarely include cost breakdowns. At what point does autoresearch become more expensive than a senior engineer's time?

**Conflict resolution**: when two agents produce contradictory outputs, what resolves the contradiction? Most documented architectures assume this is rare or handle it by supervisor judgment, but at scale it becomes a systematic design problem.

**Context graph ownership**: the argument that decision trace accumulation creates competitive moat assumes the traces stay with the orchestration layer. What happens when the underlying models change, or when enterprises want to migrate between orchestration systems? [Source](../raw/tweets/jayagup10-ai-s-trillion-dollar-opportunity-context-graphs.md)

## Relationship to Context Engineering

Multi-agent systems are one implementation layer within the broader discipline of context engineering — the systematic design of what information goes into each model call. [Source](../raw/papers/mei-a-survey-of-context-engineering-for-large-language.md) The agent boundaries are, fundamentally, decisions about context partitioning: what each agent sees, when it sees it, and what it's asked to produce from that context. Getting this partitioning right is most of the work.

## Selecting an Architecture

Single agent with retrieval: use when the task fits in one context window, has clear success criteria, and doesn't require parallel execution.

Supervisor-worker hierarchy: use when tasks decompose into parallel subtasks with shared state, and you can dedicate engineering effort to the coordination and validation layers.

Sequential pipeline with quality gates: use when correctness compounds — where downstream agents build on upstream outputs — and you can define a validation signal for each stage.

Context graph with persistent traces: use when the value is in accumulated decision precedent, not just execution speed, and when you need auditable reasoning across many runs over time.


## Related

- [CrewAI](../projects/crewai.md) — implements (0.7)
- [AutoGen](../projects/autogen.md) — implements (0.7)
- [LangGraph](../projects/langgraph.md) — implements (0.7)
- [Mobile-Agent-E](../projects/mobile-agent-e.md) — implements (0.6)
