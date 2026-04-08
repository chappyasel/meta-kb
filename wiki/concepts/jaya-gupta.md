---
entity_id: jaya-gupta
type: person
bucket: agent-architecture
abstract: >-
  Jaya Gupta is a partner at Foundation Capital who articulates the thesis that
  enterprise AI's durable moat comes from capturing decision traces (not just
  outcomes) into compounding context graphs.
sources:
  - tweets/jayagup10-ai-s-trillion-dollar-opportunity-context-graphs.md
  - tweets/jayagup10-google-s-20-year-secret-is-now-available-to-every.md
  - tweets/jayagup10-the-trillion-dollar-loop-b2b-never-had.md
  - tweets/vtahowe-context-graphs-an-iam-problem-at-scale.md
related:
  - execution-traces
last_compiled: '2026-04-08T23:24:45.291Z'
---
# Jaya Gupta

## Who She Is

Jaya Gupta is a partner at Foundation Capital, a venture capital firm. She writes and invests at the intersection of enterprise software and agent infrastructure, with a focus on how AI-native companies can build compounding advantages that legacy SaaS incumbents cannot replicate.

## Key Contributions

Gupta's primary contribution to this space is a thesis she has developed across several high-reach posts: enterprise AI's durable moat is not better features or model quality, but [Execution Traces](../concepts/execution-traces.md) accumulated into [Context Graphs](../concepts/context-graphs.md).

Her core argument runs as follows. Consumer platforms compounded behavioral signals for two decades (what you clicked, hovered over, abandoned). Enterprise software never built an equivalent loop because enterprise decisions are multiplayer negotiations that happen across Slack threads, escalation calls, and people's heads, none of which traditional systems of record capture. A CRM stores the final discount. It does not store why that discount was approved, what precedent was cited, or which VP made the call on a Zoom.

Agents change this by sitting in the write path at decision time. When an agent drafts a pricing proposal and a sales rep edits the discount from 25% to 30% with a note about competitive pressure, that edit is a decision trace. The model's proposal is a structured prior; the human's modification is the judgment signal. As agents insert themselves into more workflows, more of this previously tacit reasoning becomes explicit and capturable.

Her framing distinguishes two architectural positions:

- **Write path** (structural advantage): agent orchestration layers that execute workflows and can capture rationale at the moment decisions become binding
- **Read path** (structural disadvantage): warehouses like Snowflake and Databricks that receive data via ETL after decisions are made, along with incumbent SaaS platforms built on current-state storage that discard the "why"

She also articulates three categories of context graph that will emerge as distinct systems of record: operational (how the company runs day-to-day), customer-facing (sales, support, account management), and strategic (executive decision-making). Each carries distinct confidentiality requirements.

Her posts on this thesis reached significant audience: the Foundation Capital piece on AI's trillion-dollar opportunity drew roughly 4.8 million views, and her "Google's 20-Year Secret" piece drew roughly 278,000.

## Notable Work

- Co-authored "AI's Trillion-Dollar Opportunity: Context Graphs" with Ashu Garg (Foundation Capital, December 2025), which frames context graphs as the next category of system of record
- "Google's 20-Year Secret Is Now Available to Every Enterprise" and "The Trillion Dollar Loop B2B Never Had," which develop the decision-trace thesis with attention to IAM, permissioned inference, and the write-path/read-path architectural distinction

## Related Concepts

- [Execution Traces](../concepts/execution-traces.md)
- [Context Graphs](../concepts/context-graphs.md)
- [Organizational Memory](../concepts/organizational-memory.md)
- [Human-in-the-Loop](../concepts/human-in-the-loop.md)
- [Multi-Agent Systems](../concepts/multi-agent-systems.md)
