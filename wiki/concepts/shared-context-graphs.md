---
entity_id: shared-context-graphs
type: concept
bucket: context-engineering
sources:
  - tweets/jayagup10-ai-s-trillion-dollar-opportunity-context-graphs.md
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
  - tweets/akoratana-context-graphs-will-be-to-the-2030s-what-databases.md
related:
  - Context Graphs
  - Agent Memory
  - Context Engineering
last_compiled: '2026-04-05T19:00:00.000Z'
---
# Shared Context Graphs

> Multi-agent systems need more than individual memory. Shared context graphs capture decision traces — who decided what, under what policy, with what precedent — as structured, queryable records that any agent can build on. The pattern emerged independently from enterprise VC thinking and developer-side knowledge base work, converging on the same conclusion.

## The Core Idea

Standard agent memory is single-agent and session-scoped. Shared context graphs are multi-agent and organizational. The distinction: individual memory stores what one agent learned; a shared context graph stores how a group of agents (or humans and agents together) made decisions and why.

Jaya Gupta (Foundation Capital) articulates the enterprise framing: the trillion-dollar opportunity is not better access to existing data but capturing "decision traces — the exceptions, overrides, precedents, and cross-system context that currently live in Slack threads, deal desk conversations, escalation calls, and people's heads" ([Source](../../raw/tweets/jayagup10-ai-s-trillion-dollar-opportunity-context-graphs.md)). A context graph is "a living record of decision traces stitched across entities and time so precedent becomes searchable." The essay names concrete examples: a renewal agent pulling three SEV-1 incidents from PagerDuty, an open escalation from Zendesk, and a prior VP exception to justify a discount. The CRM records one fact ("20% discount"). The context graph records why.

Brana Rakic (OriginTrail) arrives from the developer side: Karpathy's wiki pattern is a knowledge graph for a single agent. Multi-agent work requires shared context graphs where agents "publish, query, and verify knowledge together" ([Source](../../raw/tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md)). The DKG v9 implementation structures context into sub-graphs by function — `/code`, `/decisions`, `/sessions`, `/tasks`, `/github` — each holding different types of decision traces. Agent A publishes a refactoring rationale. Agent B queries for anything affecting auth. One query, full context, zero coordination overhead.

## What Makes This Different from Agent Memory

Agent memory systems like [Mem0](../projects/mem0.md), [Graphiti](../projects/graphiti.md), and [Letta](../projects/letta.md) store facts for retrieval. Shared context graphs store decision lineage: not just what is true, but who asserted it, when, under what authority, and whether it was verified. The difference matters when agents need to trust each other's output.

Rakic names four trust tiers that map to software development stages ([Source](../../raw/tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md)):

1. **Working Memory** — private scratch space (local branch)
2. **Shared Working Memory** — team staging, visible but not final (PR territory)
3. **Long-term Memory** — permanently published with cryptographic provenance (merged code)
4. **Verified Memory** — multiple independent agents agree via consensus (release-approved)

At 10 agents, you can read everyone's output. At 1,000, trust levels become the filter.

## Why It Matters for Knowledge Bases

Gupta's argument reframes what "system of record" means in the agent era. Current systems of record (Salesforce, Workday, SAP) store objects: accounts, employees, transactions. They do not store the reasoning that connected data to action. Agents that sit in the orchestration path see the full picture at decision time and can capture it as a first-class record ([Source](../../raw/tweets/jayagup10-ai-s-trillion-dollar-opportunity-context-graphs.md)).

Three startup paths follow: replace existing systems of record, replace modules where exceptions concentrate, or create new systems of record for decisions themselves. The last path is where context graphs become the enduring platform.

## Open Questions

- What is the right granularity for a decision trace? Too coarse and you lose the reasoning. Too fine and the graph becomes unqueryable noise.
- Can context graphs work without a central coordinator? Rakic's decentralized approach (DKG) is the only implementation that does not require a central server, but adds complexity around consensus and cryptographic verification.
- How do shared context graphs interact with the Karpathy wiki pattern? The wiki compiles knowledge from raw sources. Decision traces are a new type of raw source — structured, multi-authored, and continuously produced.
- Gupta's framing is enterprise-focused (deal desks, compliance, escalations). Does the pattern apply equally to open-source multi-agent development workflows?

## Sources

- [Foundation Capital: Context graphs](../../raw/tweets/jayagup10-ai-s-trillion-dollar-opportunity-context-graphs.md) — Jaya Gupta, 6,941 likes, 4.8M views
- [Shared context graphs](../../raw/tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md) — Brana Rakic (OriginTrail)
- [Context graphs as the next databases](../../raw/tweets/akoratana-context-graphs-will-be-to-the-2030s-what-databases.md) — @akoratana
