---
entity_id: fact-extraction
type: approach
bucket: knowledge-bases
abstract: >-
  Automated process of identifying and extracting discrete factual claims from
  unstructured text into structured representations for downstream storage,
  retrieval, and reasoning in LLM systems.
sources:
  - repos/supermemoryai-supermemory.md
  - deep/repos/getzep-graphiti.md
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - deep/repos/mem0ai-mem0.md
related:
  - openai
  - rag
  - anthropic
  - knowledge-graph
  - mem0
last_compiled: '2026-04-07T01:02:13.664Z'
---
# Fact Extraction

## What It Is

Fact extraction converts unstructured text into discrete, structured factual representations. A sentence like "Alice joined Google in 2019 as a staff engineer" becomes one or more structured claims: `(Alice, WORKS_AT, Google)`, `(Alice, JOINED_DATE, 2019)`, `(Alice, ROLE, staff engineer)`. These representations feed knowledge bases, memory systems, and knowledge graphs used by LLM applications.

The process sits at the boundary between unstructured language and structured data. Unlike classic information extraction (which relied on pattern matching and NER models trained on specific schemas), modern LLM-based fact extraction uses language models to interpret context, resolve ambiguity, and produce structured outputs across arbitrary domains without schema pre-specification.

## Why It Matters

Without fact extraction, LLM memory systems have two options: store entire conversation histories verbatim, or discard them. Both fail at scale. Verbatim storage produces context windows bloated with noise. Discarding produces agents that forget everything. Fact extraction is the third path: identify what matters, extract it as a structured claim, store it compactly, retrieve it precisely.

[Mem0](../projects/mem0.md) demonstrates the practical impact: instead of injecting 115,000-token conversation histories into prompts, it injects a few hundred tokens of extracted facts, achieving 91% latency reduction with improved accuracy on the [LongMemEval](../projects/longmemeval.md) benchmark. [Graphiti](../projects/graphiti.md) reports similar results: context reduction from 115k to ~1.6k tokens.

Fact extraction also enables capabilities that raw text retrieval cannot provide: temporal reasoning (a fact extracted with a validity window can be expired when contradicted), multi-hop reasoning (extracted entity relationships can be traversed graph-style), and contradiction detection (two extracted claims about the same entity-relation pair can be compared).

## How It Works

### The LLM-Based Pipeline

Modern fact extraction uses LLMs in a multi-stage pipeline. The canonical implementation, visible in both Mem0 (`mem0/memory/main.py`) and Graphiti (`graphiti_core/utils/maintenance/node_operations.py`, `edge_operations.py`), follows this structure:

**Stage 1: Entity detection.** The LLM receives text plus an extraction prompt and identifies named entities (people, organizations, locations, products, concepts). Graphiti's `extract_nodes` prompt is unusually specific about what NOT to extract: pronouns, bare kinship terms ("dad"), abstract generic nouns. The negative examples do real work — without them, models extract noise. Entity names must be qualified ("Nisha's dad" not "dad").

**Stage 2: Relation/fact extraction.** For each detected entity pair or across the full text, the LLM extracts relationship triples: `(subject, PREDICATE, object)`. Predicates are typically normalized to SCREAMING_SNAKE_CASE for consistency (`WORKS_AT`, `LIVES_IN`, `MARRIED_TO`). Each triple may carry a natural-language description alongside the structured form.

**Stage 3: Temporal binding.** For systems with temporal reasoning, extracted facts receive validity windows: `valid_at` (when the fact became true) and `invalid_at` (when it ceased to be true). Graphiti's edge extraction prompt resolves relative temporal expressions ("last week") against a `reference_time` parameter, converting them to absolute timestamps.

**Stage 4: Reconciliation.** New facts are compared against existing stored facts to handle updates and contradictions. Mem0's `DEFAULT_UPDATE_MEMORY_PROMPT` produces ADD/UPDATE/DELETE/NONE decisions for each new fact versus retrieved existing memories. Graphiti's `resolve_extracted_edges` identifies `duplicate_facts` and `contradicted_facts`, expiring contradicted edges rather than deleting them.

### Structured Output and Schema Enforcement

Reliable fact extraction requires the LLM to return parseable structured data. Both Mem0 and Graphiti use Pydantic models as schema definitions, passing them as `response_format` to LLM APIs that support structured output. This prevents format drift — without schema enforcement, extraction prompts degrade over time as models take formatting shortcuts.

Mem0 uses a two-field JSON schema: `{"facts": [...]}`. Graphiti uses more complex Pydantic models: `ExtractedEntity` with name, type, and attributes; `Edge` with source, target, relation_type, fact description, and temporal fields.

A practical implementation detail from Mem0: UUIDs are mapped to sequential integers before being sent to the LLM (`temp_uuid_mapping`), then mapped back afterward. LLMs hallucinate UUID strings readily but handle small integers reliably. This pattern prevents the reconciliation step from producing invalid references.

### Extraction Prompt Design

The extraction prompt is the highest-leverage component. It determines recall (what facts get captured) and precision (what noise gets filtered). Key design patterns from production implementations:

- **Negative examples reduce noise.** Listing what NOT to extract ("don't extract pronouns, generic nouns, abstract concepts") outperforms purely positive specification.
- **Context windows matter.** Graphiti passes the last 4 messages alongside the current message so the LLM can resolve references and pronouns correctly.
- **Domain-specific schemas improve quality.** Graphiti supports custom entity types via Pydantic models — passing `{"Person": PersonModel, "Company": CompanyModel}` to `add_episode()` produces substantially better extraction for those entity types than the default open-ended schema.
- **Speaker attribution is often implicit.** In conversational data, entity extraction must attribute statements to speakers. Graphiti automatically extracts the speaker as an entity.

### Granularity Decisions

A core design choice is extraction granularity: atomic facts versus composite facts. Atomic extraction ("Alice works at Google", "Alice joined in 2019", "Alice is a staff engineer") enables fine-grained temporal updates — if Alice's role changes, only the role fact needs updating. Composite extraction ("Alice is a staff engineer at Google, joined 2019") is easier to read but harder to update incrementally.

Mem0 targets atomicity explicitly. Its extraction prompt instructs the model to produce short, self-contained facts (typically 5-20 words each). Graphiti targets structured triples with natural language descriptions, which preserves atomicity at the relation level while keeping human-readable context.

## Key Implementation Variants

### Flat Fact Lists (Mem0 pattern)

Facts are stored as short natural language strings in a vector database, one vector per fact. Pros: simple to implement, works with any vector store, easy to read. Cons: no structured entity relationships, no graph traversal, reconciliation relies entirely on embedding similarity to find related facts.

Representative code path: `Memory._add_to_vector_store()` in `mem0/memory/main.py`.

### Structured Triples in a Knowledge Graph (Graphiti pattern)

Facts are stored as entity-relation-entity triples with typed nodes and typed edges, in a graph database (Neo4j, FalkorDB, Kuzu, Neptune). Pros: enables graph traversal, supports temporal queries, relations are first-class objects with metadata. Cons: requires a graph database, higher extraction complexity (4-5 LLM calls per episode vs. Mem0's 2), entity deduplication across sessions is a hard problem.

Representative code path: `add_episode()` in `graphiti_core/graphiti.py`, calling `extract_nodes`, `resolve_extracted_nodes`, `extract_edges`, `resolve_extracted_edges`.

### Hierarchical Community Summaries (GraphRAG / RAPTOR pattern)

Facts are extracted and then organized into hierarchical community summaries. Individual triples or chunks feed upward into cluster-level summaries, which feed into corpus-level summaries. Pros: supports both specific queries (leaf level) and broad reasoning (summary level). Cons: expensive to build, requires full recomputation when data changes (Leiden algorithm), latency in seconds to tens of seconds for global queries.

See [GraphRAG](../projects/graphrag.md) for this pattern.

## Who Implements It

### [Mem0](../projects/mem0.md)

Two-pass pipeline: extract atomic facts from conversation, then reconcile against existing memories with ADD/UPDATE/DELETE/NONE decisions. Graph memory is optional (requires Neo4j), runs in parallel via `ThreadPoolExecutor`. 16 LLM providers supported. The extraction quality is entirely prompt-dependent — there is no learned component.

### [Graphiti](../projects/graphiti.md)

The most sophisticated implementation. Multi-stage pipeline with typed entity extraction, node deduplication, edge extraction with temporal bounds, edge contradiction resolution, and optional community detection. Uses Pydantic structured output throughout. Bi-temporal data model on edges (`valid_at`, `invalid_at`, `expired_at`). See [Knowledge Graph](../concepts/knowledge-graph.md) for the graph context.

### [Supermemory](../projects/supermemory.md)

Claims #1 on LongMemEval, LoCoMo, and ConvoMem. Implements automatic forgetting (temporary facts like "exam tomorrow" expire after the date), contradiction resolution, and a profile system separating static facts from dynamic recent activity. Self-reported benchmark claims; methodology not independently verified at time of writing.

### [OpenAI](../projects/openai.md) / [Anthropic](../projects/anthropic.md)

Both provide the structured output APIs (Pydantic response format, function calling, tool use) that make reliable fact extraction tractable. Without structured output enforcement, extraction prompt engineering degrades. [Anthropic](../projects/anthropic.md)'s tool use and [OpenAI](../projects/openai.md)'s JSON mode / structured outputs are the infrastructure layer.

### [LangChain](../projects/langchain.md) / [LlamaIndex](../projects/llamaindex.md)

Both provide document loaders, text splitters, and entity extraction chains that implement fact extraction as pipeline components. LlamaIndex's `KnowledgeGraphIndex` extracts triples from documents for graph construction.

## Practical Considerations

### Extraction Quality vs. Cost

Each LLM call for extraction costs money and adds latency. A minimal implementation (2 calls: extract + reconcile) costs less but produces flatter, less structured facts. A full pipeline (5+ calls: extract entities, deduplicate entities, extract edges, resolve contradictions, update summaries) produces richer structure but multiplies cost and latency per ingestion.

For conversational memory at scale, Mem0's 2-call approach is often sufficient. For knowledge base construction from documents, the additional structure from a full triple-extraction pipeline pays off at query time.

### Entity Deduplication Is Hard

If a user mentions "Google" in one conversation and "Alphabet" in another, are these the same entity? If they mention "the company" as a pronoun, which company? Deduplication requires comparing new extracted entities against all existing entities using hybrid retrieval (embedding similarity + lexical matching), then an LLM cross-encoder to make the final call. Graphiti's `resolve_extracted_nodes` implements this. Skipping deduplication produces duplicate entities that fragment the knowledge graph and degrade retrieval.

### Temporal Validity Is Underimplemented

Most fact extraction implementations treat facts as timeless. A user saying "I work at Google" produces a stored fact that persists indefinitely, even if they later say "I left Google." Properly handling this requires either contradiction detection (find and expire the old fact) or temporal binding (attach validity windows to facts from extraction).

Graphiti implements both. Mem0 implements contradiction detection via the ADD/UPDATE/DELETE logic. Systems that skip this produce knowledge bases that accumulate stale facts, degrading over time.

The [research by Han et al.](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md) on RAG vs. GraphRAG shows graph-based retrieval outperforms flat vector retrieval on temporal queries by 23 points (49.06 vs 25.73 F1). Temporal fact modeling is GraphRAG's strongest advantage over RAG.

### The ~34% Entity Extraction Miss Rate

The Han et al. study found that knowledge graph construction pipelines miss roughly 34% of answer-relevant entities (65.8% presence rate on HotPotQA, 65.5% on NQ). This creates a hard ceiling for graph-only retrieval. Extraction quality varies by domain — specialized terminology, acronyms, and domain jargon are missed more often.

Mitigation: use the `triplets+text` variant that maintains links to source text, or run hybrid retrieval (vector search over source text + graph traversal) rather than graph-only retrieval. See [Hybrid Retrieval](../concepts/hybrid-retrieval.md).

### Silent Failures

Fact extraction fails silently in production. If the LLM returns malformed JSON, Mem0's fallback chain catches it and produces no memory updates — no exception is raised, no warning is surfaced. If the LLM hallucinates an entity ID during reconciliation, the fact is quietly dropped. Monitoring requires explicit logging of extraction outputs and reconciliation decisions.

## Failure Modes

**Hallucinated facts.** LLMs sometimes extract facts not present in the source text, especially when given long context. Mitigation: shorter extraction windows (Graphiti uses last 4 messages, not entire conversation history), negative examples in extraction prompts, structured output validation.

**Entity boundary errors.** "Apple" the company vs. "apple" the fruit, "Java" the language vs. "Java" the island. Without context disambiguation, extraction produces ambiguous entities. Mitigation: qualified entity names ("Apple Inc.", "Java programming language"), custom entity type schemas.

**Cascading reconciliation failures.** Extraction produces N facts. Reconciliation fetches top-K existing memories per fact for comparison. If K is too small and the relevant existing memory falls outside K, contradictions are missed and duplicate/stale facts accumulate. Mitigation: increase K, use graph-based retrieval to find related facts by entity rather than by embedding similarity.

**Contradiction detection latency.** For users with large memory stores, retrieving all facts about an entity for contradiction checking becomes expensive. Graph databases handle this better than flat vector stores (constrain search to edges between specific entity pairs) but require the graph infrastructure.

**Overfitting to explicit statements.** Extraction captures what was said, not what was implied. A user discussing their commute implies they have a job and a home address. Extracting only explicit facts misses inferences. Extraction prompts can be tuned to capture inferences, but this increases hallucination risk.

## When NOT to Use LLM-Based Fact Extraction

- **High-volume, low-latency pipelines.** 2-5 LLM calls per document is untenable at millions of documents per hour. Traditional NER + relation extraction models (SpanBERT, REBEL, GLiNER) are orders of magnitude faster and cheaper, trading some precision for throughput.
- **Narrow, well-defined schemas.** If you know exactly which entity types and relations you need, a fine-tuned extraction model outperforms general LLM extraction on precision and cost.
- **Sensitive domains with hallucination risk.** Medical, legal, and financial text require extraction precision that general LLMs cannot guarantee. Hallucinated facts in these domains cause real harm.
- **Static corpora with infrequent updates.** If the knowledge base doesn't change often, batch extraction with a high-quality model at index time is cheaper than per-document extraction at query time. See [RAPTOR](../projects/raptor.md) for tree-based hierarchical extraction optimized for static corpora.

## Unresolved Questions

**Quality measurement.** Production fact extraction systems rarely measure extraction quality. Precision and recall against ground truth are only evaluated in research settings. Practitioners rely on downstream task performance (does the agent answer questions correctly?) as a proxy, which conflates extraction quality with retrieval and reasoning quality.

**Cross-session entity resolution at scale.** Deduplicating entities across millions of sessions (enterprise-scale deployments) requires distributed entity resolution infrastructure. Current implementations assume a manageable graph size. No open-source implementation addresses this at scale.

**Adversarial inputs.** A user can inject false facts ("my boss is the CEO of Apple") that get extracted and stored. Fact extraction systems have no truth-verification layer — they extract what is said, not what is true. Enterprise deployments need explicit data provenance and trust scoring per fact.

**Schema evolution.** When the desired entity types change (you decide to track "department" as a new entity type), existing extracted facts don't retroactively gain that attribute. Re-extraction is expensive. This is an open problem in production deployments.

## Related Concepts

- [Knowledge Graph](../concepts/knowledge-graph.md): The storage target for extracted entity-relation triples
- [Retrieval-Augmented Generation](../concepts/rag.md): The retrieval layer that uses extracted facts at query time
- [Semantic Memory](../concepts/semantic-memory.md): The cognitive model that structured fact stores approximate
- [Hybrid Retrieval](../concepts/hybrid-retrieval.md): Combining extracted facts (graph traversal) with raw text retrieval (vector search)
- [Memory Decay](../concepts/memory-decay.md): Automatic expiration of extracted facts over time
- [Agent Memory](../concepts/agent-memory.md): The broader system that fact extraction feeds
- [Knowledge Base](../concepts/knowledge-base.md): Where extracted facts are organized and stored
