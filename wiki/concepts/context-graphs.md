---
entity_id: context-graphs
type: concept
bucket: context-engineering
abstract: >-
  Context graphs are structured representations of decision traces and
  conceptual relationships that give agents queryable organizational memory —
  differentiating from knowledge graphs by recording *why* decisions were made,
  not just *what* exists.
sources:
  - tweets/akoratana-context-graphs-will-be-to-the-2030s-what-databases.md
  - tweets/vtahowe-context-graphs-an-iam-problem-at-scale.md
  - tweets/jayagup10-ai-s-trillion-dollar-opportunity-context-graphs.md
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
  - repos/origintrail-dkg-v9.md
  - papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md
  - deep/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md
related:
  - execution-traces
  - openclaw
last_compiled: '2026-04-08T02:54:09.177Z'
---
# Context Graphs

## What They Are

A context graph is a data structure that represents not just facts but the reasoning connecting facts to actions. Where a [Knowledge Graph](../concepts/knowledge-graph.md) stores entities and relationships ("customer X is in healthcare"), a context graph stores decision events and their justification ("we gave customer X a 10% discount because their procurement cycle is 90 days, approved by VP Jones, consistent with precedent from deal Y in Q3").

The distinction sounds subtle but changes what you can do with the structure downstream. A knowledge graph answers "what is true?" A context graph answers "why did we decide that, under what conditions, and what happened next?"

Three components make up a context graph:

1. **Entities** — the objects the organization already tracks: accounts, tickets, policies, agents, approvers
2. **Decision events** — the moments when context turned into action, with inputs, policy applied, exception route invoked, and outcome recorded
3. **Causation links** — edges connecting prior decisions to current ones (precedent), inputs to decisions (rationale), and decisions to outcomes (consequence)

This structure is closely related to [Execution Traces](../concepts/execution-traces.md), which record what an agent did during a run. The relationship is specific: execution traces are raw material; a context graph is what you get when you index and connect those traces across time, entities, and runs into a queryable structure.

## Why This Matters

Large organizations have a coordination problem that scales badly. At ten people, everyone knows what everyone is doing. At ten thousand, most headcount exists to relay and compress information up and down a hierarchy. Each layer in that hierarchy compresses context: a manager distills a week of team activity into a 30-minute summary, their manager compresses eight such summaries, and by the time information reaches a decision-maker it has passed through five or six lossy translations. [Source](../raw/tweets/akoratana-context-graphs-will-be-to-the-2030s-what-databases.md)

Agents don't automatically fix this. An agent can automate a workflow, but if the reasoning behind decisions never gets recorded, the agent inherits the same blindspots. The CRM stores the final deal value, not the negotiation. The ticket system stores "resolved," not why escalation went to Tier 3. The codebase stores current state, not the architectural debate that produced it.

Context graphs address this by treating reasoning as data. Once decision traces accumulate into a queryable graph, an agent handling a new exception can retrieve prior decisions, check what exceptions were granted under similar conditions, and act consistently with organizational precedent rather than starting from scratch. [Source](../raw/tweets/jayagup10-ai-s-trillion-dollar-opportunity-context-graphs.md)

## How They Work

### Construction

Context graphs are built by agents that sit in the execution path at decision time. This is the critical architectural requirement. A warehouse that receives ETL after the fact cannot build a context graph because decision context is gone by the time data lands. The agent must observe the decision as it happens, capture:

- Inputs gathered (from which systems, at what state)
- Policy evaluated (which version, which clauses applied)
- Exceptions invoked (who requested, who approved, on what grounds)
- Precedent referenced (which prior decision justified the exception)
- Outcome written back to systems of record

These captured traces get indexed by entity, time, policy version, and outcome, then linked to prior decisions on the same entities or under the same policy.

### Retrieval

When an agent faces a new decision, it queries the graph for relevant precedent. A renewal agent proposing a discount can ask: "What discount exceptions were granted to healthcare accounts with open escalations, and who approved them?" The graph returns specific prior decisions rather than generic policy text. The agent can then propose a discount grounded in actual precedent, surface that precedent in its explanation, and route the exception to the same approver who handled similar cases before.

This is meaningfully different from [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) over documents. RAG retrieves text that contains relevant information. Context graph retrieval returns structured decision records with provenance, approver identity, policy version, and outcome, which an agent can reason over rather than summarize.

### Compounding

The feedback loop is the key property. Each decision adds a trace to the graph. As traces accumulate, the graph gains density. Dense graphs enable prediction: not just "how did we handle this last time?" but "if we structure the deal this way, what outcome is likely?" — grounded in the organization's actual decision history rather than generic training data. [Source](../raw/tweets/vtahowe-context-graphs-an-iam-problem-at-scale.md)

## Relation to Agentic Computation Graphs

A parallel but distinct use of graph structure appears in agentic workflow optimization. Here, the graph represents a computational workflow: nodes are LLM calls, tool invocations, or memory updates; edges represent data dependencies. [Source](../raw/deep/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md)

This framing distinguishes three objects that practitioners often conflate:

- **Workflow templates** — reusable designs specifying components and dependencies, designed offline
- **Realized graphs** — run-specific instances of a template, potentially pruned or extended per query
- **Execution traces** — what actually happened during a run, which may differ from the realized graph due to failures and retries

Optimizing at the template level (e.g., AFlow's MCTS-based search over typed operator graphs) is design-time work. Optimizing at the realized graph level (e.g., selecting from a pre-built super-graph, or generating a query-conditioned DAG) is pre-execution work. Optimizing during execution (e.g., regenerating topology when validity checks fail) is runtime work.

The organizational context graph described above and the agentic computation graph are different concepts that share the graph metaphor. An organizational context graph accumulates decision traces across time and becomes a memory layer. An agentic computation graph represents the structure of a single workflow execution. [Execution Traces](../concepts/execution-traces.md) connect both: traces from agentic computation graphs can feed into organizational context graphs.

## Implementation Considerations

### IAM Is the Blocking Problem

Building a context graph requires agents with three properties simultaneously: autonomy to traverse systems and discover context, capability to access fragmented data sources, and security controls to enforce fine-grained retrieval permissions. Current IAM architectures handle two out of three badly. [Source](../raw/tweets/vtahowe-context-graphs-an-iam-problem-at-scale.md)

The access control problem on retrieval is particularly sharp. A context graph is valuable precisely because it creates shared organizational memory. But if an agent's context graph includes the contents of private Slack threads, executive email, or confidential negotiation tactics, unrestricted retrieval is not acceptable. The permissions model for context graph retrieval needs to be context-aware and task-scoped, not just role-based.

### The Backchannel Gap

The most important organizational decisions often leave no trace. A VP approves a discount on a video call. An architectural direction gets set in a Slack DM. A precedent gets established in a conversation that never enters any system. A context graph built only from instrumented agent workflows misses this entirely. Getting coverage on the full decision surface requires connecting agents to communication channels that have historically been off-system. This remains largely unsolved. [Source](../raw/tweets/vtahowe-context-graphs-an-iam-problem-at-scale.md)

### Structural Credit Assignment

When a workflow succeeds or fails, attributing the outcome to specific structural choices versus local parameter settings is hard. This makes learning from decision traces noisy: the context graph might record that a particular deal structure led to churn, but the causal path between structure and outcome runs through market conditions, rep quality, and competitor pricing that the graph may not capture. [Source](../raw/deep/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md)

### Incumbents Can't Bolt This On

Existing systems of record are built around current-state storage. Salesforce knows what an opportunity looks like now, not what it looked like when the decision was made. Warehouse platforms like Snowflake have time-based views but receive data via ETL after decision context is gone. Building a context graph requires being in the execution path at commit time, which means the orchestration layer. This is a structural advantage for agent-native systems over incumbents adding AI features. [Source](../raw/tweets/jayagup10-ai-s-trillion-dollar-opportunity-context-graphs.md)

## Projects Using This Pattern

[OpenClaw](../projects/openclaw.md) is cited as an implementation that runs without environment-file-stored credentials, with agent identity managed externally — an approach that addresses the IAM requirements context graph construction demands.

[Graphiti](../projects/graphiti.md) and [Zep](../projects/zep.md) build persistent, queryable memory layers for agents, approaching the context graph from the memory-system direction rather than the decision-trace direction.

[GraphRAG](../projects/graphrag.md) uses community detection over document graphs to enable reasoning across large corpora. This addresses a different problem (document understanding at scale) but uses related graph structure for retrieval.

[LangGraph](../projects/langgraph.md) represents agent workflows as stateful graphs, which captures the agentic computation graph framing rather than the organizational decision trace framing.

## Failure Modes

**Sparse graphs are useless.** A context graph with one hundred decision traces covering ten edge cases provides no useful precedent for the eleven hundredth case. Coverage requires high agent adoption across workflows, which requires solving IAM and trust issues first.

**Stale precedent.** A context graph that records decisions made under old policies can actively mislead agents. The graph needs versioning on policy documents and needs mechanisms to deprecate or flag precedent that no longer applies.

**Garbage in.** If agents record the wrong inputs (missing a system that was actually consulted, omitting the Slack context that drove the decision), the graph grows dense but inaccurate. Decisions appear to follow a pattern that wasn't the real causal structure.

**Over-reliance.** An agent that surfaces precedent without surfacing the conditions under which that precedent was established can recommend decisions that were appropriate in 2023 but not in 2025. Precedent is not policy.

## Related Concepts

- [Knowledge Graph](../concepts/knowledge-graph.md) — stores entities and relationships; context graphs extend this with decision events and causation
- [Execution Traces](../concepts/execution-traces.md) — raw material that feeds context graph construction
- [Context Engineering](../concepts/context-engineering.md) — the broader practice of managing what information agents have access to
- [Episodic Memory](../concepts/episodic-memory.md) — stores specific past events; context graphs are a structured, queryable form of episodic memory at organizational scale
- [Organizational Memory](../concepts/organizational-memory.md) — the broader concept of which context graphs are one implementation approach
- [Semantic Memory](../concepts/semantic-memory.md) — general fact storage, complementary to the decision-trace focus of context graphs
- [Long-Term Memory](../concepts/long-term-memory.md) — persistence layer that context graphs depend on
- [Community Detection](../concepts/community-detection.md) — graph algorithm used in related systems like GraphRAG to cluster related nodes
- [Multi-Agent Systems](../concepts/multi-agent-systems.md) — the coordination problems context graphs are designed to address at scale
