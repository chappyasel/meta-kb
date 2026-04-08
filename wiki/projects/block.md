---
entity_id: block
type: project
bucket: agent-architecture
abstract: >-
  Block (Jack Dorsey's fintech, formerly Square) is implementing an AI-native
  org redesign that replaces middle management with a "world model" — a
  continuously updated vector database of company operations feeding intelligent
  coordination agents.
sources:
  - tweets/akoratana-context-graphs-will-be-to-the-2030s-what-databases.md
  - tweets/ericosiu-how-to-practically-deploy-jack-dorsey-s-world-int.md
  - tweets/jack-from-hierarchy-to-intelligence.md
related: []
last_compiled: '2026-04-08T23:27:48.414Z'
---
# Block

## What It Is

Block is Jack Dorsey's financial technology company (formerly Square), operating at roughly 6,000 employees across Square, Cash App, Afterpay, TIDAL, and Bitkey. In early 2025, Dorsey co-authored "From Hierarchy to Intelligence" with Sequoia's Roelof Botha, outlining Block's active restructuring from a conventional corporate hierarchy into what they call an "intelligence-organized company." The essay received 5.6 million views and has become a reference document in enterprise AI agent adoption discussions.

The organizational thesis is direct: hierarchy is a lossy compression algorithm. Every management layer filters information before passing it upward, so by the time signal reaches decision-makers it has degraded through five or six rounds of human interpretation. Block's bet is that AI agents maintaining a continuously updated model of the whole company can replace that compression function entirely — giving every person at the edge the same context a manager chain used to deliver, without the latency.

[Source](../raw/tweets/jack-from-hierarchy-to-intelligence.md)

## The Four-Layer Architecture

Block's "From Hierarchy to Intelligence" describes a specific implementation structure:

**Layer 1 — Capabilities:** Atomic financial primitives (payments, lending, card issuance, banking, BNPL, payroll). These carry no user interfaces. They have reliability, compliance, and performance targets. They are building blocks, not products.

**Layer 2 — World Model:** Two sides. The *company world model* tracks internal operations, what's being built, what's blocked, resource allocation, and what's working — the information that used to flow through management layers. The *customer world model* is a per-customer, per-merchant representation built from transaction data across both sides of millions of transactions (Cash App buyer side + Square merchant side). Block claims this dual-sided view is the rare signal that makes the model valuable.

**Layer 3 — Intelligence Layer:** Composes capabilities into solutions for specific customers at specific moments. The essay's concrete example: a merchant's cash flow tightens before a seasonal dip the model has seen before. The intelligence layer composes a short-term loan, adjusts repayment using the payments capability, and surfaces it proactively — without a product manager specifying it. When this layer *can't* compose a solution because a capability doesn't exist, that failure signal becomes the roadmap.

**Layer 4 — Interfaces:** Square, Cash App, Afterpay, TIDAL, Bitkey, Proto. Delivery surfaces, not where value is created.

## Role Structure

The essay describes eliminating permanent middle management in favor of three roles:

- **Individual Contributors** who build and operate the four layers. The world model provides the context that managers used to provide.
- **Directly Responsible Individuals (DRIs)** who own specific cross-cutting problems for defined time windows (e.g., merchant churn in a specific segment for 90 days), with authority to pull resources cross-functionally.
- **Player-coaches** who combine building with people development. They do not run status meetings or alignment sessions — the world model handles alignment, the DRI structure handles priority.

## One Implementation Account

Eric Siu of Single Grain documented four months of running a similar architecture at smaller scale. His "Single Brain" is a unified vector database ingesting Slack, CRM records, Gong call transcripts, GA4, Search Console, and financial data every 15 minutes. Specialized agents (Alfred for CEO operations, Arrow for sales, Oracle for SEO, Flash for content, Cyborg for recruiting) all query the same database. A World Agent sits above them as coordinator.

Key observations from that implementation: agent coordination produces real conflicts — a sales agent promises timelines the SEO data says are impossible, a content agent works from keywords the SEO agent deprioritized hours earlier. He had to build a conflict resolution layer and a security system with kernel-level sandboxing after one agent nearly sent client financial data to the wrong contact. The first two months degraded productivity before it improved. Month three showed compounding: the system surfaced a correlation between specific early-call language and 3x close rates that no human had noticed.

His cost note: moving from cloud API endpoints to local inference cut costs roughly 70%.

[Source](../raw/tweets/ericosiu-how-to-practically-deploy-jack-dorsey-s-world-int.md)

## The Underlying Claim About Moat

The essay argues that the economic graph — transaction data from both sides of millions of financial interactions in real time — compounds every second the system runs. A competitor cannot buy or fast-forward that accumulation. This makes the world model itself the moat, not the AI models sitting on top of it. The richer the signal, the better the model; the better the model, the more transactions; the more transactions, the richer the signal.

The parallel argument at the smaller-company level: months of continuous data ingestion create a world model that cannot be quickly replicated regardless of stack, because the data is proprietary and cumulative.

## Strengths

Block's position in this architecture has genuine advantages. The dual-sided transaction data (buyer behavior via Cash App, merchant behavior via Square) is structurally rare — most financial data players see one side. The remote-first operational model means work already exists as machine-readable artifacts: decisions, code, designs, plans. That's the raw material the world model requires. Many large companies attempting a similar architecture would need to first instrument their operations to generate this data; Block largely has it.

The DRI structure, borrowed from Amazon's "single-threaded owner" model, maps onto AI-augmented coordination more naturally than traditional matrix management, because it gives a named person authority to pull cross-functional resources without requiring management approval chains.

## Critical Limitations

**One concrete failure mode:** The intelligence layer's capability-composition model assumes the right primitives already exist. When a customer moment arises requiring a capability Block hasn't built, the system generates a failure signal — but that signal still requires a human to recognize it as a product insight, prioritize it against competing signals, and commission the build. The claim that "customer reality generates the backlog directly" obscures this human judgment step. At scale, the system generates many such signals simultaneously, and prioritization between them requires exactly the kind of organizational judgment the essay describes distributing to the edge.

**One unspoken infrastructure assumption:** The entire model depends on work being machine-readable and continuously logged. Block is remote-first, and the essay treats this as a prerequisite ("everything we do creates artifacts"). Organizations with significant in-person work, oral decision-making culture, or sensitive discussions that never get written down cannot build this world model from existing data. The architecture assumes a pre-existing data substrate that most traditional enterprises lack and cannot retrofit cheaply.

## When NOT to Use This Framework

Block's design is a research-and-implementation project for a specific organization type, not a product someone adopts. But as a *model* to emulate:

Don't attempt this if your organization's valuable knowledge is primarily tacit, relational, or oral. The world model only captures what gets written down.

Don't attempt this if you need the system to work within months. The Single Grain implementation suggests the first two months go backwards before improving. Organizations with short planning horizons, tight board timelines, or low tolerance for agent errors during the learning period will abort before the compounding starts.

Don't attempt this if your regulatory environment requires documented human decision accountability at each step. The intelligence layer composing products without a named product manager creates auditability challenges in regulated industries — including, notably, financial services, which is Block's own sector.

## Unresolved Questions

The essay does not address how Block resolves conflicts when multiple agents or DRIs reach incompatible conclusions about the same customer situation. Conflict resolution in multi-agent systems is a known hard problem — see [Multi-Agent Systems](../concepts/multi-agent-systems.md) — and the essay's framing of "the world model handles alignment" does not specify the mechanism.

The essay also does not address what happens to the world model's accuracy when the organization is in a rapid-change state (major acquisition, product line shutdown, crisis response). A world model trained on stable operational patterns may confidently surface wrong recommendations during discontinuous events. No fallback mechanism is described.

Finally: the essay is co-authored by Dorsey and a Sequoia partner whose firm has a significant financial stake in Block's success. The framing that this architecture "will reshape how companies of all kinds operate" is not a neutral prediction.

## Related Concepts

- [Context Graphs](../concepts/context-graphs.md) — the infrastructure layer the world model depends on
- [Organizational Memory](../concepts/organizational-memory.md) — the broader problem this addresses
- [Multi-Agent Systems](../concepts/multi-agent-systems.md) — coordination challenges at the intelligence layer
- [Human-in-the-Loop](../concepts/human-in-the-loop.md) — what the edge role becomes in this architecture
- [Tobi Lütke](../concepts/tobi-lutke.md) — Shopify CEO with a parallel AI-native org thesis

## Alternatives

For organizations wanting to implement AI coordination without full restructuring: [LangGraph](../projects/langgraph.md) provides multi-agent orchestration infrastructure. [Mem0](../projects/mem0.md) and [Letta](../projects/letta.md) address persistent agent memory. [AutoGen](../projects/autogen.md) handles multi-agent workflow coordination. None of these implement Block's world-model-as-org-infrastructure thesis — they are tooling, not organizational models.
