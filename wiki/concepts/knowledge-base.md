---
entity_id: knowledge-base
type: concept
bucket: knowledge-bases
abstract: >-
  A structured repository of information that grounds AI agents during retrieval
  and reasoning, ranging from flat document stores to linked markdown wikis to
  vector databases and knowledge graphs.
sources:
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - repos/agenticnotetaking-arscontexta.md
  - repos/aiming-lab-agent0.md
  - deep/repos/michaelliv-napkin.md
related:
  - obsidian
  - agent-memory
last_compiled: '2026-04-06T02:16:12.334Z'
---
# Knowledge Base

## What It Is

A knowledge base is a structured collection of information that an AI agent reads from, writes to, and reasons over. The term covers a wide range of implementations: flat collections of markdown files, relational databases, vector stores, property graphs, and hybrid systems combining several of these. What distinguishes a knowledge base from raw data is structure that supports retrieval — some mechanism for finding relevant information without scanning everything.

In agent systems, the knowledge base plays the role that long-term memory plays in human cognition. The model's weights encode general knowledge baked in at training time; the knowledge base supplies domain-specific, project-specific, or session-accumulated knowledge that the model cannot have learned during training. The boundary between [Agent Memory](../concepts/agent-memory.md) and knowledge base is porous — many frameworks treat them as the same system. The distinction that holds up is temporal: agent memory typically captures what happened during an interaction, while a knowledge base captures what is durably true about a domain.

## Why It Matters

Models have fixed context windows. Any project with more relevant information than fits in one context requires selective retrieval. The knowledge base is the structure that makes selection possible without discarding everything.

The failure mode without a knowledge base is one of two bad choices: stuff the entire corpus into context on every query (expensive, often impossible, and increasingly counterproductive as context fills with irrelevant material), or answer without the relevant information (hallucination, stale knowledge, wrong answers). A well-structured knowledge base enables a third option: retrieve what is relevant, ignore the rest.

Beyond storage, knowledge bases serve as the accumulation layer for agent learning. Andrej Karpathy described this pattern directly in a widely-circulated 2024 post: dump raw sources into a `raw/` directory, use an LLM to compile them into a markdown wiki, then run agents against the wiki for Q&A and incremental enhancement. Each query adds back to the base. The knowledge compounds rather than evaporating at session end. [Source](../raw/tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md)

## Storage Architectures

Four primary storage patterns appear in production systems, each with different retrieval tradeoffs.

### Flat Document Stores

Files on disk — markdown, PDF, plain text — organized in a directory structure. Retrieval happens through keyword search ([BM25](../concepts/bm25.md)), filename matching, or agent navigation of the directory tree. The Karpathy pattern uses this architecture: `raw/` for source documents, `wiki/` for LLM-compiled summaries and cross-references.

Advantages: human-readable, version-controllable, no infrastructure dependencies, immediately editable by both agents and humans. Flat document stores are the substrate that [Obsidian](../projects/obsidian.md) exposes as an IDE, and what the napkin project ([Source](../raw/deep/repos/michaelliv-napkin.md)) shows can outperform vector databases on long-term memory benchmarks when combined with TF-IDF keyword extraction and backlink counting.

### Vector Databases

Documents chunked into segments, embedded into high-dimensional vectors, stored in a database that supports approximate nearest-neighbor search. Retrieval returns semantically similar chunks regardless of keyword overlap. Standard infrastructure: [ChromaDB](../projects/chromadb.md), [Qdrant](../projects/qdrant.md), [Pinecone](../projects/pinecone.md).

The retrieval mechanism is [Retrieval-Augmented Generation](../concepts/rag.md): embed the query, find cosine-similar chunks, inject them into the model's context. Handles synonym matching and conceptual queries that BM25 misses ("authentication" matching "login"). The cost is an embedding model dependency, preprocessing latency, and a retrieval step that makes decisions before the full-capability LLM ever sees the question.

### Knowledge Graphs

Entities and relationships stored as nodes and edges. [Knowledge Graph](../concepts/knowledge-graph.md) systems like [Graphiti](../projects/graphiti.md) maintain typed edges (`KNOWS`, `CAUSED`, `PART_OF`) that enable multi-hop traversal — answering questions that require chaining through several relationships. [GraphRAG](../projects/graphrag.md) combines graph traversal with vector retrieval to handle queries requiring synthesis across an entire document corpus.

Graphs encode relational structure that flat stores lose. A markdown file can mention that Alice and Bob worked on project X, but a graph stores that relationship as a traversable edge. The cost is construction: building and maintaining a knowledge graph from raw text requires entity extraction and relationship parsing, either by pipeline (expensive, lossy) or LLM (accurate, slow). [Zep](../projects/zep.md) automates this for conversational memory.

### Hybrid Systems

Most production systems combine at least two of the above. [Hybrid Retrieval](../concepts/hybrid-retrieval.md) typically means BM25 keyword search plus vector similarity search, with scores merged via Reciprocal Rank Fusion. The motivation: keyword search handles precise term matching; semantic search handles conceptual similarity. Neither alone covers all queries.

The napkin benchmark demonstrates a counter-argument: for structured, well-organized markdown knowledge bases, BM25 plus backlink counting plus recency weighting achieves 91% on LongMemEval-S, beating hybrid systems at a fraction of the infrastructure cost. This result holds for tightly-curated, domain-specific knowledge bases — it likely does not generalize to large heterogeneous corpora where vocabulary gaps are common.

## Retrieval Mechanisms

How the agent gets from a question to relevant content determines the knowledge base's practical utility more than how the data is stored.

**Keyword Search (BM25):** Term frequency times inverse document frequency, the statistical backbone of traditional search. Fast, interpretable, zero preprocessing. Fails when query and document use different vocabulary.

**Semantic Search:** Embedding-based similarity. Handles vocabulary mismatches, finds conceptually related content. Requires an embedding model and a vector store. The embedding model makes retrieval decisions before the full LLM reasons over results — a design choice worth scrutinizing.

**Progressive Disclosure:** Rather than one retrieval step, a tiered approach. [Progressive Disclosure](../concepts/progressive-disclosure.md) starts with a compressed overview (keyword map of the knowledge base, ~1-2K tokens), narrows to search results (~2-5K tokens), then reads full documents only as needed. The napkin architecture formalizes this as L0 through L3: always-loaded orientation note, TF-IDF keyword overview, BM25 search, full file read. This respects context window budgets and lets the full-capability LLM navigate rather than delegating navigation to a smaller embedding model.

**Agentic Retrieval:** The agent itself controls retrieval, issuing search calls, following links, synthesizing across sources. [Agentic RAG](../concepts/agentic-rag.md) systems like [LlamaIndex](../projects/llamaindex.md) and [LangChain](../projects/langchain.md) provide tool interfaces for this. The agent queries, reads results, decides what to read next. More expensive in tokens and latency; better suited to complex multi-hop questions.

**Graph Traversal:** For knowledge graphs, retrieval means following edges from seed entities. Spreading activation — starting from a matched node and traversing to nearby nodes — surfaces related information that keyword or vector search misses. [HippoRAG](../projects/hipporag.md) models this on hippocampal memory processes.

## The Write Side

Most knowledge base discussions focus on retrieval. The write side matters as much for systems that accumulate knowledge over time.

**Manual Curation:** A human writes documents, edits them, maintains structure. High quality, low automation. The Zettelkasten method ([Zettelkasten](../concepts/zettelkasten.md)) is the systematic version of this: atomic notes, explicit links, no large aggregated files.

**LLM Compilation:** An agent reads raw sources and synthesizes them into structured wiki articles. Karpathy's pattern: dump PDFs, web clips, and papers into `raw/`, run an LLM compilation step to produce `wiki/*.md` files with cross-references. The agent writes; the human reviews. Knowledge accumulates without manual note-taking. [Source](../raw/tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md)

**Auto-Distillation:** At session end, a background process extracts knowledge from the conversation and writes it back to the knowledge base. Napkin's distill system does this: a sub-agent receives the full conversation, explores existing vault content to find relevant notes, identifies gaps, and creates new notes with wikilinks to existing ones. The read/write loop — inject context at session start, distill knowledge at session end — makes the base accumulate without user intervention.

**Continuous Extraction:** Systems like Zep and Graphiti maintain a graph by extracting entities and facts from every message in real time. The graph grows as conversations happen. This is [Organizational Memory](../concepts/organizational-memory.md) at the infrastructure layer.

## The Linting Problem

Raw accumulation degrades quality. Inconsistent terminology, duplicate facts, stale entries, broken links, and orphaned notes accumulate faster than any agent catches them in normal operation. Knowledge bases require maintenance.

Karpathy calls this "linting": running LLM health checks over the wiki to find inconsistent data, impute missing facts via web search, identify new article candidates, and suggest further questions. This is not a one-time cleanup but an ongoing process. [DataChaz's analysis](../raw/tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md) highlights self-healing as the feature that makes the system sustainable — the agent maintains its own memory layer rather than requiring constant human intervention.

The ars contexta project formalizes this as the `/reweave` and `/verify` commands: backward passes that update older notes with new connections, and quality checks that validate schema compliance. [Source](../raw/repos/agenticnotetaking-arscontexta.md)

## Granularity

Note size significantly affects retrieval quality. Large aggregated documents dilute term frequency across many topics, making BM25 less discriminating. Napkin's benchmark design uses per-round notes (~2,500 characters each) rather than full session logs (~15,000 characters), organized in day directories. This concentrates terms per note and enables temporal keyword extraction in the overview. The principle generalizes: many small, focused notes outperform few large aggregated ones for keyword retrieval. The tradeoff is management overhead — a vault with 50,000 atomic notes requires robust navigation support.

## Grounding and Hallucination

A knowledge base grounds model responses in specific documents. When the agent cites content from the base, the response is checkable — someone can read the source and verify the claim. This does not eliminate hallucination, but it changes the failure mode from fabrication to misquotation, which is easier to detect and correct.

[Context Engineering](../concepts/context-engineering.md) treats knowledge base content as one input to context construction alongside system prompts, conversation history, and tool outputs. The knowledge base provides factual grounding; the other inputs provide task framing. Together they populate the context window with relevant, accurate, structured information.

## Failure Modes

**Vocabulary mismatch:** BM25-only retrieval fails when query and document use different terms for the same concept. Embedding-based retrieval handles this but requires infrastructure. No retrieval approach handles all cases.

**Staleness:** A knowledge base that grows but never prunes accumulates stale information. A fact added six months ago may contradict a fact added last week. Without explicit versioning or temporal metadata, the agent has no way to prefer the newer claim. [Memory Consolidation](../concepts/memory-consolidation.md) systems address this by periodically merging and reconciling entries.

**Context collapse:** As the knowledge base grows and the agent injects more retrieved content, context fills with marginally relevant material. [Context Collapse](../concepts/context-collapse.md) — where the context window contains too much noise — degrades response quality. Progressive disclosure architectures mitigate this; naive "stuff everything relevant" approaches do not.

**False confidence:** A knowledge base returns results regardless of whether they actually answer the question. Napkin scores 50% on abstention tasks — when the right answer is "I don't know," the system still retrieves something and tends to use it. Systems without calibrated confidence thresholds fail silently on out-of-scope queries.

**Distillation quality dependence:** Auto-distillation produces a knowledge base whose quality depends on the LLM's extraction judgment. Poor distillation writes irrelevant notes, misses connections, and corrupts the vocabulary consistency that retrieval relies on. There is no standard validation layer for knowledge written by agents.

## Implementations in This Space

- [Obsidian](../projects/obsidian.md): Markdown vault IDE with graph visualization, backlinks, and an ecosystem of plugins. The front-end for LLM-driven knowledge base workflows.
- [LlamaIndex](../projects/llamaindex.md) and [LangChain](../projects/langchain.md): Framework-level abstractions for connecting LLMs to document stores, vector databases, and graph systems.
- [Graphiti](../projects/graphiti.md) and [Zep](../projects/zep.md): Knowledge graph construction from conversational data, supporting temporal queries and relationship traversal.
- [GraphRAG](../projects/graphrag.md): Microsoft's system for graph-enhanced retrieval, suited to large corpora requiring cross-document synthesis.
- [HippoRAG](../projects/hipporag.md) and [RAPTOR](../projects/raptor.md): Research systems extending RAG with biologically-inspired retrieval and hierarchical tree structures respectively.
- [Mem0](../projects/mem0.md) and [Letta](../projects/letta.md): Agent memory systems that maintain knowledge bases as first-class infrastructure.

## When Not to Use a Dedicated Knowledge Base

For tasks that fit within a single context window, a knowledge base adds latency and complexity without benefit. Load the documents directly. The retrieval overhead only pays off when the corpus exceeds what the context window can hold, when the same information will be queried many times across sessions, or when multiple agents need shared access to the same information.

For purely ephemeral agents — one-shot queries with no continuity — session memory suffices. Knowledge bases earn their cost in systems where learning compounds across sessions.

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md) — the broader category of how agents store and access information
- [Semantic Memory](../concepts/semantic-memory.md) — factual, declarative knowledge; the type most knowledge bases store
- [Retrieval-Augmented Generation](../concepts/rag.md) — the standard retrieval pattern for grounding LLM outputs
- [Vector Database](../concepts/vector-database.md) — the infrastructure layer for embedding-based retrieval
- [Knowledge Graph](../concepts/knowledge-graph.md) — relational structure enabling multi-hop reasoning
- [Progressive Disclosure](../concepts/progressive-disclosure.md) — tiered retrieval that respects context budgets
- [Context Engineering](../concepts/context-engineering.md) — the discipline of constructing effective context windows
- [Zettelkasten](../concepts/zettelkasten.md) — the note-taking methodology that informs atomic knowledge base design
- [Organizational Memory](../concepts/organizational-memory.md) — knowledge bases at team and enterprise scale
