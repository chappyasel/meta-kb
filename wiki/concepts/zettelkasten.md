---
entity_id: zettelkasten
type: approach
bucket: knowledge-substrate
abstract: >-
  Zettelkasten is a note-taking method built on atomic, uniquely-identified
  notes linked bidirectionally; its core insight—that knowledge value comes from
  connections, not storage—now directly shapes how LLM agents organize,
  retrieve, and evolve memory.
sources:
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - papers/xu-a-mem-agentic-memory-for-llm-agents.md
  - deep/repos/agenticnotetaking-arscontexta.md
  - deep/repos/kepano-obsidian-skills.md
  - deep/repos/michaelliv-napkin.md
  - deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md
related:
  - obsidian
  - andrej-karpathy
  - retrieval-augmented-generation
  - synthetic-data-generation
  - markdown-wiki
  - marp
  - claude-code
  - synthetic-data-generation
last_compiled: '2026-04-08T03:00:33.587Z'
---
# Zettelkasten

## What It Is

Zettelkasten (German: "slip box") is a knowledge management method developed by sociologist Niklas Luhmann, who used it to produce over 70 books and 400+ academic papers across 30 years. The system has two physical components: a reference box (bibliographic notes on sources) and an idea box (atomic concept notes). Each note in the idea box gets a unique identifier, contains one idea, links to related notes via those identifiers, and accumulates context through continued use.

The method's core claim is that knowledge value lives in connections between ideas, not in the ideas themselves. A note isolated from other notes is nearly worthless. A note with twenty inbound and outbound links is a conceptual hub that surfaces relationships the author never explicitly planned.

Luhmann reportedly had 90,000 notes at his death. He described the slip box not as a filing cabinet but as a conversation partner—something that surfaced unexpected connections and generated novel questions.

## Why It Matters for Agent Systems

Zettelkasten is the intellectual ancestor of several architectural patterns now appearing in LLM agent memory systems. Three properties of the method translate directly:

**Atomicity.** One idea per note forces disambiguation. In agent memory, atomic memory units enable precise retrieval—a chunk about "project X deadline" surfaces on deadline queries without dragging along unrelated project history. [A-MEM](../concepts/agent-memory.md) implements this explicitly, with each memory note containing exactly one coherent piece of information plus generated metadata.

**Unique identifiers.** Luhmann used a hierarchical alphanumeric scheme (1/1, 1/1a, 1/1a1) that allowed arbitrary insertion between existing notes. In agent systems, this maps to stable memory addresses—IDs that survive content updates, enabling reliable bidirectional linking.

**Emergent structure.** Zettelkasten accumulates structure bottom-up from content relationships rather than top-down from predetermined categories. This matches the retrieval pattern that outperforms keyword-matching in multi-hop reasoning: follow semantic links, not folder hierarchies.

## How It Works: Implementation Details

### The Physical System

Each note card contains:
- A unique ID (written in the corner)
- A single discrete claim or observation
- Source citation if derived from external material
- Explicit references to other note IDs ("see also 23/4a")
- No predetermined category assignment

Notes get filed by their ID, not by topic. Topic structure emerges from the link graph, not from the filing location. A note can belong to multiple conceptual clusters simultaneously without being physically copied—the links handle membership.

### The Three Note Types

**Fleeting notes** capture raw ideas quickly, with no formatting requirements. These get processed within a day or two and discarded.

**Literature notes** summarize source material in the author's own words, stored in the reference box with full bibliographic data. These serve as the bridge between external sources and the idea network.

**Permanent notes** are the core of the system: one idea per card, written in complete sentences, explicitly linked to existing permanent notes. These are never discarded.

The transition from literature to permanent note requires active reformulation—not copying quotes, but synthesizing what the source means in relation to what you already know. This cognitive step is where understanding consolidates.

### Link Semantics

Luhmann used several link types without formalizing them:
- Direct reference ("see 23/4a")
- Sequence links (1/1, 1/1a, 1/1b—branching from a parent idea)
- Index entries (topic-keyed pointers to entry notes for a cluster)

The index was sparse by design. Luhmann kept only a few entry points per topic, relying on the link network to surface related material once he entered the graph at any node. Dense indexes recreate the categorical filing problem the system was designed to avoid.

## Agent System Implementations

### A-MEM's Zettelkasten-Inspired Architecture

The [A-MEM paper](../concepts/agent-memory.md) directly cites Zettelkasten as the design basis for its memory note structure. Each memory note contains seven components: original content, timestamp, LLM-generated keywords, tags, a contextual description, a dense vector embedding computed over all textual components, and a bidirectional link set.

The critical innovation is **memory evolution**: when a new memory arrives, it triggers updates to the contextual representations of related existing memories. A new note about a project cancellation causes existing notes about that project's timeline to update their contextual descriptions. This is Zettelkasten's "conversation partner" property implemented computationally—the network reorganizes in response to new information.

Results on the LoCoMo dataset show 149% improvement on multi-hop reasoning (18.41 → 45.85 F1 with GPT-4o-mini) and 85% token reduction compared to full-context approaches. The ablation confirms both link generation and memory evolution are required—removing either degrades multi-hop performance significantly. [Source](../raw/deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md)

### Ars Contexta's Claim Graph

[Ars Contexta](../projects/marp.md) implements Zettelkasten principles at the meta-level: its `methodology/` directory contains 249 markdown files where each filename *is* the claim (e.g., `derivation generates knowledge systems from composable research claims not template customization.md`). Notes link to each other via wikilinks, forming a traversable claim graph. The derivation engine navigates this graph to compose domain-specific knowledge system architectures.

The claim graph encodes not just conclusions but justification chains—each architectural decision traces to the specific research claims that support it. This makes the system self-documenting in the Zettelkasten sense: the knowledge base is its own argument. [Source](../raw/deep/repos/agenticnotetaking-arscontexta.md)

### Karpathy's Markdown Wiki Workflow

Andrej Karpathy's [described workflow](../concepts/andrej-karpathy.md) applies Zettelkasten structure at the document level rather than the atomic-note level. Raw sources index into a `raw/` directory; an LLM compiles these into a wiki of interconnected `.md` files with backlinks, concept articles, and cross-references. The LLM maintains all wiki content—the human rarely edits directly.

The backlink structure enables Q&A at ~100 articles and ~400K words without RAG infrastructure. Crucially, query outputs get filed back into the wiki, creating a compounding loop: each exploration enhances the knowledge base for future queries. This is Luhmann's "slip box as conversation partner" realized with an LLM as the note-taker. [Source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)

### Napkin's BM25 + Backlink Retrieval

[Napkin](../projects/obsidian.md) implements a retrieval signal that directly encodes Zettelkasten's link-centrality principle. Its composite search ranking is:

```
composite = BM25_score + backlink_count * 0.5 + recency_normalized * 1.0
```

The backlink count signal functions as simplified PageRank over the wikilink graph—notes with more inbound references rank higher, reflecting Zettelkasten's insight that highly-connected notes are conceptually central. On LongMemEval-S, this BM25 + backlink approach achieves 91% accuracy versus 86% for the best prior embedding-based system. [Source](../raw/deep/repos/michaelliv-napkin.md)

## Zettelkasten vs. Competing Approaches

### vs. Hierarchical Filing

Traditional hierarchical folder systems force a note into exactly one location. Zettelkasten allows a note to participate in multiple conceptual clusters through links. The practical difference: a note about "trust in distributed systems" belongs under both "distributed systems" and "security" in a hierarchy, requiring either duplication or an arbitrary placement decision. In a link-based system, it connects to both clusters without moving.

### vs. [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)

RAG retrieves chunks via embedding similarity, independent of explicit relationships. Zettelkasten-style systems retrieve via the link graph, following relationships that the author (or LLM) explicitly established. The two approaches perform differently on different query types:

- Single-hop factual recall: RAG and Zettelkasten-style are comparable
- Multi-hop reasoning: Zettelkasten-style link traversal outperforms RAG substantially (see A-MEM's 149% multi-hop improvement)
- Semantic synonym matching: RAG outperforms BM25-based Zettelkasten (BM25 requires term overlap; embeddings handle "authentication" matching "login")

### vs. [Knowledge Graph](../concepts/knowledge-graph.md)

Knowledge graphs use typed, directed edges between entities with formal ontologies. Zettelkasten uses untyped, informal links between atomic notes. Knowledge graphs support structured queries ("find all people related to project X via budget approval"); Zettelkasten supports exploratory traversal ("follow the connections from this concept and see what emerges"). Ars Contexta explicitly claims that wikilinks "implement GraphRAG without the infrastructure"—an informal knowledge graph that costs nothing to maintain.

### vs. [Semantic Memory](../concepts/semantic-memory.md)

Semantic memory in cognitive science refers to general world knowledge (facts, concepts, meanings) as distinct from episodic memory (personal experiences). Zettelkasten implements a kind of semantic memory externalization—general claims and concept relationships, not personal event logs. The distinction matters for agent systems: [Episodic Memory](../concepts/episodic-memory.md) systems track what happened when; Zettelkasten-style systems track what concepts mean and how they relate.

## Practical Implementation Patterns

### The Atomic Note Discipline

The hardest part of implementing Zettelkasten is enforcing atomicity. Beginners write multi-idea notes because atomicity requires deciding where one idea ends and another begins. For agent systems, the same tension exists: smaller notes improve retrieval precision but increase storage overhead and link maintenance cost.

Napkin's benchmark design reveals an empirical answer: per-round notes (~2,500 characters each) outperform per-session notes (~15,000 characters each) for BM25 retrieval. Smaller units concentrate term frequency, making individual notes more distinguishable. For agent memory, this argues for splitting aggressively.

### Index Sparsity

Luhmann's sparse index is counterintuitive but critical. Dense indexes recreate hierarchical filing; sparse indexes force reliance on the link network. For agent systems, this translates to keeping [Maps of Content](../concepts/markdown-wiki.md) high-level (entry points to clusters) rather than exhaustive (full topic taxonomies). Ars Contexta's MOC hierarchy deliberately provides navigation anchors rather than comprehensive topic trees.

### The Evolution/Maintenance Problem

Zettelkasten requires ongoing maintenance: new links added as connections emerge, old notes updated when understanding deepens. Luhmann did this manually over decades. Agent systems face the same problem at higher velocity.

A-MEM's memory evolution mechanism automates this: new memories trigger contextual updates in linked existing memories. The cost is that evolution updates are destructive—no version history, no rollback. If an LLM misinterprets a relationship and updates existing memories incorrectly, the error propagates through the link network. This is the Zettelkasten maintenance problem made worse by automation speed.

### The Bootstrap Problem

A new Zettelkasten has no links. The backlink retrieval signal requires an established link graph before it provides value. New agent memory systems using Zettelkasten-style architectures start with the same bootstrapping problem: early sessions retrieve poorly because there are no connections to follow.

Mitigation approaches: pre-seeding with domain knowledge (Ars Contexta's 249-claim methodology graph), distillation processes that create links during initial knowledge capture (Napkin's auto-distillation), or accepting degraded performance during an accumulation period.

## Failure Modes

**Vocabulary mismatch.** BM25-based Zettelkasten retrieval fails when query terms differ from note terms. A note using "authn" won't match a query for "authentication." Embedding-based retrieval handles this; link-traversal-based retrieval does not. This is the primary weakness in Napkin's approach and motivates hybrid BM25+embeddings in systems like GraphRAG.

**Link rot.** As knowledge bases grow and notes evolve, links accumulate that point to outdated or superseded content. Luhmann could physically inspect his slip box; agent systems accumulate broken semantic links invisibly. Ars Contexta's `/reweave` command addresses this with a backward-pass step that updates older notes when new connections emerge, but requires active invocation.

**Adversarial brittleness.** A-MEM's -28% regression on adversarial tasks suggests that rich semantic connections make the system more susceptible to leading questions—the same link network that enables multi-hop reasoning also amplifies misleading signals.

**Cognitive outsourcing.** Zettelkasten with LLM-mediated note-taking risks a failure mode Luhmann couldn't encounter: the human loses understanding of their own knowledge base because the LLM handles all organization. Ars Contexta acknowledges this with its `/rethink` meta-cognitive audit command, but this requires intentional invocation.

## When NOT to Use It

Zettelkasten-style organization adds overhead that doesn't pay off in every context:

- **Short-lived projects** where accumulated connections never compound
- **Highly structured domains** where a formal ontology fits naturally (legal citation networks, medical taxonomies)—typed knowledge graphs outperform informal links here
- **Real-time retrieval requirements** where link-traversal latency is unacceptable and pre-indexed embeddings are required
- **Large-scale multi-modal content** where text-centric link semantics don't capture image/audio/structured data relationships

## Unresolved Questions

The agent systems literature applying Zettelkasten principles leaves several questions open:

**Optimal granularity.** Empirical evidence (Napkin's per-round notes) suggests smaller is better for BM25 retrieval, but no systematic study compares note granularity across memory task types. Multi-hop reasoning might favor different granularity than single-hop recall.

**Link quality vs. link quantity.** A-MEM generates links via LLM semantic analysis; Zettelkasten generates links via human judgment. No study compares LLM-generated link quality to human-generated links for downstream retrieval or reasoning tasks.

**Evolution correctness.** A-MEM's memory evolution produces better benchmark results, but no paper reports the false-positive rate for evolution updates—how often does a new memory incorrectly update an existing memory's contextual description?

**Scale ceilings.** Most benchmarks test at hundreds to low thousands of notes. Production deployments of Luhmann-style systems at 90,000+ notes face retrieval complexity that current agent memory papers haven't addressed.

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md)
- [Semantic Memory](../concepts/semantic-memory.md)
- [Long-Term Memory](../concepts/long-term-memory.md)
- [Knowledge Graph](../concepts/knowledge-graph.md)
- [Context Engineering](../concepts/context-engineering.md)
- [Markdown Wiki](../concepts/markdown-wiki.md)
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)
- [Obsidian](../projects/obsidian.md)
- [Synthetic Data Generation](../concepts/synthetic-data-generation.md)
- [Andrej Karpathy](../concepts/andrej-karpathy.md)
