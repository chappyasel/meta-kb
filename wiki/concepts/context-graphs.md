---
entity_id: context-graphs
type: concept
bucket: context-engineering
abstract: >-
  Context graphs are graph-structured records of organizational decision
  traces—capturing not just outcomes but the reasoning, exceptions, and
  cross-system context that produced them—enabling agents to retrieve
  organizational judgment, not just data.
sources:
  - tweets/akoratana-context-graphs-will-be-to-the-2030s-what-databases.md
  - tweets/jayagup10-ai-s-trillion-dollar-opportunity-context-graphs.md
  - tweets/vtahowe-context-graphs-an-iam-problem-at-scale.md
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
  - repos/origintrail-dkg-v9.md
  - papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md
  - deep/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md
related:
  - execution-traces
  - organizational-memory
last_compiled: '2026-04-06T02:09:26.399Z'
---
# Context Graphs

## What They Are

A context graph is a graph-structured representation where nodes are organizational entities (accounts, policies, agents, people, tasks, decisions) and edges are decision events: the moments when context from multiple sources was synthesized into an action, with the "why" preserved as a first-class record.

The key distinction from other graph structures is temporal and causal. A [Knowledge Graph](../concepts/knowledge-graph.md) stores what is true. A context graph stores how it became true and why it was allowed to happen. Your CRM stores a 20% discount. A context graph stores: the three SEV-1 incidents pulled from PagerDuty, the open "cancel unless fixed" escalation in Zendesk, the VP who approved the exception on a Zoom call, and the prior renewal that set the precedent. [Source](../raw/tweets/jayagup10-ai-s-trillion-dollar-opportunity-context-graphs.md)

This distinction matters because agents operating without decision traces hit a wall that governance frameworks cannot solve. The agent knows the rule. It does not know when and why the rule was overridden, who approved it, or whether this situation matches a prior exception. That reasoning currently lives in Slack threads, side conversations, and people's heads. Context graphs treat it as data.

## Why It Matters Now

Large organizations already pay enormous coordination overhead to manage exactly what context graphs would automate. At 10,000 people, roughly 60% of payroll covers coordination rather than production. Hierarchy functions as a lossy compression algorithm: a manager compresses their team's reality into a 30-minute summary, their manager compresses eight such summaries, and by the time information reaches a decision-maker, five or six layers of human interpretation have filtered it. [Source](../raw/tweets/akoratana-context-graphs-will-be-to-the-2030s-what-databases.md)

Agents sitting in the execution path can capture decision context at commit time, not after the fact via ETL. This is architecturally different from what warehouses like Snowflake do. A warehouse receives data via ETL after decisions are made; the decision context is gone by the time the data lands. An orchestration layer in the execution path sees the full picture as it happens: what inputs were gathered across systems, what policies applied, what exceptions were granted, who approved.

The practical consequence is a compounding feedback loop. Captured decision traces become searchable precedent. Every automated decision adds another trace to the graph. Over time, the graph shifts from retrieval ("how did we handle this last time?") toward prediction ("if we structure the deal this way, what's likely to happen?")—grounded in the organization's actual decision history rather than generic training data.

## How It Works

### Graph Structure

The basic structure connects:

- **Entity nodes**: accounts, employees, policies, agent runs, approvers, tickets, incidents
- **Decision event edges**: the moments when context was synthesized into action, carrying "why" links
- **State snapshots**: what the world looked like at decision time, enabling replay

Unlike a standard [Knowledge Graph](../concepts/knowledge-graph.md) optimized for querying current state, a context graph indexes by decision context, making precedent searchable. "Find all prior deals where a similar exception was approved under policy v3.2" is a query type that current CRM or data warehouse architectures cannot answer.

### Construction

Context graphs are built by instrumented orchestration layers that emit a structured trace on every agent run. The trace records:

1. Inputs gathered across systems and their sources
2. Policies evaluated and how they resolved
3. Exception routes invoked and who approved
4. Final state written and where

This is structurally related to what the agentic computation graph literature calls [Execution Traces](../concepts/execution-traces.md): the actual sequence of LLM calls, tool invocations, and data flows during a run. The distinction is that execution traces describe what happened mechanically, while context graph records describe why a decision was permitted, linking to the organizational entities and precedents that governed it. [Source](../raw/deep/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md)

### Retrieval

At query time, an agent or human asks questions that require reasoning across the graph: tracing why a policy was applied, finding analogous historical decisions, or understanding which approver has precedent for a given exception class. This retrieval is more complex than standard [Vector Database](../concepts/vector-database.md) similarity search because the relevant context is relational and temporal, not just semantically similar.

[GraphRAG](../projects/graphrag.md) and [HippoRAG](../projects/hipporag.md) address related problems—using graph structure to improve retrieval quality—but focus on document-level knowledge rather than decision-level organizational traces. Projects like [Graphiti](../projects/graphiti.md) and [Zep](../projects/zep.md) implement temporal knowledge graphs for agent memory and are closer architecturally, though not specifically designed around enterprise decision lineage.

## Relationship to Adjacent Concepts

**[Organizational Memory](../concepts/organizational-memory.md)**: Context graphs are one implementation strategy for organizational memory—specifically the component that captures procedural and episodic knowledge about decision-making. Other implementations (wikis, document stores) capture explicit knowledge but not the decision traces connecting observations to actions.

**[Execution Traces](../concepts/execution-traces.md)**: Execution traces are the raw material from which context graphs are built. A context graph stitches execution traces across entities and time to make precedent searchable and causal relationships explicit.

**[Agent Memory](../concepts/agent-memory.md)**: Context graphs extend agent memory from individual session or user scope to organizational scope. Where [Episodic Memory](../concepts/episodic-memory.md) captures what an agent experienced in a prior session, a context graph captures what the organization decided across all agents and humans over time.

**[Agentic RAG](../concepts/agentic-rag.md)**: Standard [Retrieval-Augmented Generation](../concepts/rag.md) retrieves documents. Agentic RAG adds multi-hop and iterative retrieval. Context graph retrieval adds organizational decision provenance—not just "here's a relevant document" but "here's the precedent, who approved it, and under what conditions."

**[Context Engineering](../concepts/context-engineering.md)**: Context graphs represent one end of the context engineering spectrum. Rather than compressing information to fit a context window ([Prompt Compression](../concepts/prompt-compression.md)) or selecting relevant chunks ([Progressive Disclosure](../concepts/progressive-disclosure.md)), a context graph maintains a persistent external structure that agents query at decision time, keeping the relevant organizational judgment outside the model and close to the action.

## Implementation Challenges

### IAM at Scale

The most concrete blocker for enterprise context graph adoption is identity and access management. Context graphs create two distinct IAM problems that current architectures cannot both solve simultaneously. [Source](../raw/tweets/vtahowe-context-graphs-an-iam-problem-at-scale.md)

First, **discovery**: agents need sufficient access to traverse enterprise systems and collect decision context. This requires wide access grants, which security teams resist.

Second, **retrieval**: once context exists in a shared memory layer, access control must be fine-grained and context-aware. A junior engineer should not retrieve a leadership mandate to cut 30% of engineering that an executive's agent captured from a private channel. Simple role-based access control breaks because the relevant boundary is not the user's role but the decision's sensitivity and the requestor's relationship to it.

Current IAM architectures give agents two of three required properties: autonomy, capability, and security. Providing all three simultaneously at the scale required to build useful context graphs remains unsolved.

### The Backchannel Problem

The most valuable organizational judgment often never emits a trace. It lives in intuition, politics, and side conversations: Signal messages, private Slack channels, a CEO's reasoning that never touches a system of record. A context graph built only from instrumented digital workflows will systematically miss the most consequential decisions. Agents can only capture what they can observe, and the observation problem is real.

### Structural Credit Assignment

Determining *why* a decision succeeded or failed, and attributing that to specific graph structures versus other factors, is hard. This is the same problem the workflow optimization literature identifies for agentic computation graphs: when a workflow fails, it is difficult to distinguish structural causes from parameter causes. [Source](../raw/deep/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md)

### Incumbent Lock-in

Existing enterprise software vendors (Salesforce, ServiceNow, Workday) store current state, not decision history. Their agent frameworks inherit this limitation: they can tell you what an opportunity looks like now, not what the world looked like when the discount was approved. Building a context graph across a fragmented enterprise requires either replacing incumbents (difficult, slow) or sitting in the orchestration path above them (possible, but contingent on API access that incumbents may restrict).

## When to Use This Approach

Context graphs earn their complexity in environments where:

- Decisions are exception-heavy and precedent-dependent (deal desks, underwriting, compliance review, escalation management)
- Cross-system synthesis happens manually today, with humans carrying context that software does not capture
- "Why did we do that?" is a question that currently requires finding the right person and asking them
- Coordination costs are measurably high relative to production output

For simple deterministic workflows, a context graph is unnecessary overhead. The decision logic is fixed, exceptions are rare, and a standard rule engine or static workflow template suffices.

## What the Documentation Doesn't Explain

The concept is better articulated as a vision than as a specification. Open questions:

- **Conflict resolution**: When two decision traces set contradictory precedent, which governs? No framework for precedent ranking exists.
- **Graph maintenance**: Decision traces become stale when policies, personnel, or business context changes. How to expire or reweight outdated precedent is unaddressed.
- **Evaluation**: How do you measure whether a context graph is improving agent decision quality? No benchmarks exist.
- **Latency at scale**: Retrieval from a dense graph of organizational decisions is a complex query; performance characteristics at scale are unexplored in public literature.
- **Governance of the graph itself**: Who can correct a captured decision trace? Who audits the auditor?

## Alternatives and Selection Guidance

| Approach | Use when |
|----------|----------|
| **Standard RAG / [Vector Database](../concepts/vector-database.md)** | Decisions are document-retrievable; organizational history is less relevant than semantic similarity |
| **[Knowledge Graph](../concepts/knowledge-graph.md)** | Relationships between entities matter more than decision provenance; current state is sufficient |
| **[GraphRAG](../projects/graphrag.md)** | Multi-hop reasoning over document collections; no need for temporal decision traces |
| **[Graphiti](../projects/graphiti.md) / [Zep](../projects/zep.md)** | Temporal agent memory at user or session scope; enterprise-scale decision lineage not required |
| **Context graph** | Agents need to reason from organizational precedent; exceptions and approvals are common; the "why" matters as much as the "what" |
