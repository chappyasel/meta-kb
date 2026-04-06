---
entity_id: entity-extraction
type: approach
bucket: knowledge-bases
abstract: >-
  Entity extraction identifies named entities and relationships from text to
  populate knowledge graphs; key differentiator is the multi-stage LLM pipeline
  (extract, deduplicate, resolve contradictions) with temporal validation
  replacing simpler NER approaches.
sources:
  - repos/supermemoryai-supermemory.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/mem0ai-mem0.md
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
related: []
last_compiled: '2026-04-05T23:16:37.281Z'
---
# Entity Extraction

## What It Is

Entity extraction is the process of automatically identifying meaningful named objects in text (people, organizations, locations, products, concepts) and the relationships between them. In the context of knowledge bases and agent memory, it goes beyond traditional Named Entity Recognition (NER) by extracting structured fact triples: *entity → relationship → entity*.

A plain NER model tags spans of text with categories ("Google" = ORG, "Alice" = PERSON). Entity extraction for knowledge graphs does more: it produces the triple `Alice WORKS_AT Google` along with temporal bounds (`valid_at`, `invalid_at`), confidence scores, and provenance linking back to the source text.

This shift from span tagging to triple extraction is what makes entity extraction the foundation of knowledge graphs rather than just a preprocessing step.

## Why It Matters

Static vector search retrieves document chunks. Entity extraction produces a structured representation of *what is true*, enabling queries no chunk-retrieval system can answer:

- "What entities are connected to Alice through at most 2 hops?"
- "What changed about Bob's employment status between January and March?"
- "Which facts contradict each other?"

The [RAG vs GraphRAG benchmark study](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md) makes the tradeoff concrete: on temporal reasoning queries, GraphRAG (which depends on entity extraction) outperforms RAG by 23.33 F1 points (49.06 vs 25.73). For multi-hop reasoning queries, GraphRAG gains 1-2 F1 points. For single-hop factual lookups, RAG wins. Entity extraction is the mechanism behind every one of those GraphRAG advantages.

## How It Works

### The Basic Pipeline

Every entity extraction system runs some variant of this sequence:

1. **Span detection**: Identify candidate entity mentions in text
2. **Type classification**: Assign categories (Person, Organization, Location, or domain-specific types)
3. **Normalization**: Resolve surface form variations ("NYC" = "New York City", "Google LLC" = "Google")
4. **Relationship extraction**: Identify predicates connecting entity pairs
5. **Deduplication**: Match new entities against existing graph nodes
6. **Temporal annotation**: Assign validity windows to facts

Traditional pipelines ran each stage as a separate model (BiLSTM-CRF for NER, separate RE model for relation extraction). Modern LLM-based systems collapse most of these stages into a single structured-output call, then run deduplication and temporal resolution as separate LLM passes.

### LLM-Based Extraction: The Multi-Stage Pipeline

[Graphiti](../raw/deep/repos/getzep-graphiti.md) implements the most thorough documented version of this pipeline, using 4-5 sequential LLM calls per episode:

**Stage 1 — Entity Extraction** (`extract_nodes` in `graphiti_core/utils/maintenance/node_operations.py`)

The LLM receives the current text plus the 4 previous messages for context and returns structured `ExtractedEntity` objects via Pydantic. The extraction prompt includes extensive negative examples: do not extract pronouns, abstract concepts, generic nouns, bare kinship terms. Entity names must be specific and qualified ("Nisha's dad" not "dad").

This specificity is deliberate. Overly broad extraction creates resolution noise; every vague noun becomes a candidate entity that the deduplication stage must sort out. The paper describes a "reflection technique" to minimize hallucinations and extract accurate entity summaries.

**Stage 2 — Node Deduplication** (`resolve_extracted_nodes`)

Each extracted entity gets embedded into a 1024-dimensional vector, then compared against existing graph nodes through hybrid matching:

- Cosine similarity finds semantically similar entities
- Full-text search on names and summaries provides lexical matching
- A final LLM cross-encoder call makes the deduplication decision

The LLM handles semantic equivalence ("NYC" = "New York City") and disambiguation ("Java programming language" vs "Java island"). When duplicates are detected, the system generates updated, complete names and summaries incorporating new information.

**Stage 3 — Relationship Extraction** (`extract_edges` in `graphiti_core/utils/maintenance/edge_operations.py`)

The LLM extracts fact triples as structured `Edge` objects containing:
- Source and target entity names
- Relation type in SCREAMING_SNAKE_CASE (e.g., `WORKS_AT`, `LIVES_IN`, `MARRIED_TO`)
- Natural language description of the relationship
- `valid_at` and `invalid_at` temporal bounds

The `reference_time` parameter lets the LLM resolve relative expressions ("last week") into absolute timestamps.

**Stage 4 — Edge Resolution / Contradiction Detection** (`resolve_extracted_edges`)

New edges are compared against existing edges between the same entity pairs. The LLM produces `EdgeDuplicate` objects identifying:
- `duplicate_facts`: Existing edges representing identical information
- `contradicted_facts`: Existing edges that the new fact supersedes

Contradicted edges get their `expired_at` set to the current time rather than being deleted. This preserves temporal history: you can query what the system believed at any past point.

**Stage 5 — Attribute Extraction**

Entity nodes receive updated summaries incorporating information from new edges. Only applied to new (non-duplicate) edges to avoid redundant summary updates.

### Simpler Variants

[Mem0](../raw/deep/repos/mem0ai-mem0.md) runs a two-pass variant: first extracting atomic facts from conversation (`{"facts": ["Name is John", "Is a Software Engineer"]}`), then reconciling those facts against existing vector-stored memories to decide ADD/UPDATE/DELETE/NONE operations. It skips typed entity classification and relationship triples entirely, storing facts as flat strings rather than graph edges.

This is faster and simpler, but cannot answer relationship queries or do temporal reasoning. The system handles "what the LLM decides is important" rather than structured entity-relation triples.

[Mem0's optional graph layer](../raw/deep/repos/mem0ai-mem0.md) adds proper entity extraction when Neo4j is configured, running entity extraction plus relation establishment as separate LLM calls with function calling, then a third call for deletion checking. This adds 3+ LLM calls beyond the base pipeline.

### Traditional NER vs. LLM-Based Extraction

Pre-LLM approaches used supervised sequence labeling (BiLSTM-CRF, BERT-based taggers) trained on annotated corpora. [Graphiti's GLiNER2 client](../raw/deep/repos/getzep-graphiti.md) (`graphiti_core/llm_client/`) exposes this as an option: a local NER model instead of an API call, trading flexibility for speed and cost.

The tradeoffs:

| Approach | Speed | Cost | Custom Entity Types | Temporal Reasoning | Accuracy on Domain Text |
|---|---|---|---|---|---|
| Rule-based NER | Fast | None | No | No | Low |
| Supervised NER (BiLSTM, BERT) | Fast | Inference only | Requires retraining | No | High if in-domain |
| GLiNER2 (local) | Medium | GPU/inference | Yes, zero-shot | No | Good |
| LLM with structured output | Slow (network) | Per-call | Yes, via prompt | Yes | High, general |
| Multi-stage LLM pipeline | Slowest | 4-5x per-call cost | Yes, via Pydantic | Yes | Highest |

### The Entity Extraction Ceiling

The [RAG vs GraphRAG paper](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md) identifies the most important empirical constraint: only 65.8% of answer-relevant entities exist in constructed knowledge graphs on HotPotQA, and 65.5% on NQ. This ~34% entity miss rate is a hard ceiling for graph-only approaches. If an entity was not extracted during ingestion, graph traversal cannot find it.

The miss rate is not primarily a model quality problem. It reflects structural issues:
- Entities mentioned implicitly ("the company she founded") without explicit surface forms
- Coreference chains the extractor fails to resolve
- Domain-specific terminology requiring specialized extraction
- Entities that appear only in image captions or tables if processing multimodal content

The `triplets+text` variant (keeping source text linked to extracted triples) partially compensates: retrieval falls back to the source chunk when the graph lookup misses.

## Practical Design Considerations

### Ontology: Prescribed vs. Emergent

Systems support two modes. In prescribed ontology, developers define entity types as Pydantic models upfront:

```python
class PersonModel(BaseModel):
    name: str
    role: str | None = None

class CompanyModel(BaseModel):
    name: str
    industry: str | None = None
```

This enforces schema but requires knowing your domain's entity types in advance.

In emergent ontology, the LLM assigns types based on context without a predefined schema. Types emerge from the data. This handles novel domains but produces inconsistent type names ("software_engineer" vs "SoftwareEngineer" vs "engineer") that complicate downstream queries.

Production systems typically combine both: prescribed types for known high-value entities, emergent classification for everything else.

### Temporal Annotation

Bi-temporal annotation is the distinguishing feature of production-quality entity extraction versus basic NER. [Graphiti's bi-temporal model](../raw/deep/repos/getzep-graphiti.md) tracks four timestamps per edge:

```python
expired_at: datetime | None   # When this edge record was invalidated (transaction time)
valid_at: datetime | None     # When the fact became true (event time)  
invalid_at: datetime | None   # When the fact stopped being true (event time)
reference_time: datetime | None  # Reference timestamp from source episode
```

This enables time-travel queries: "what did the system believe about Alice's employer as of January 2023?" The distinction between transaction time (when data entered the system) and event time (when the fact was true in the world) comes from database theory and is standard in financial audit systems.

Without temporal annotation, contradiction resolution degrades to last-write-wins, which produces incorrect answers for questions like "where did Alice work before Google?"

### Deduplication: The Hardest Part

Entity resolution (deciding whether "Apple" in one document refers to the same entity as "Apple Inc." in another) is where most entity extraction pipelines fail. Three strategies exist:

**Embedding similarity alone**: Fast but misses acronym resolution and multi-word aliases. "FBI" and "Federal Bureau of Investigation" may not be close in embedding space.

**String matching**: Catches exact and near-exact matches but misses semantic equivalence entirely.

**LLM cross-encoder**: Most accurate, highest cost. Given two candidate entities, the LLM decides whether they refer to the same thing. This is what [Graphiti uses](../raw/deep/repos/getzep-graphiti.md) after candidate retrieval via embedding + BM25.

The integer ID mapping trick (used by both Graphiti and mem0) addresses UUID hallucination: real UUIDs are mapped to sequential integers (0, 1, 2...) before the LLM sees them, preventing the LLM from inventing plausible-looking UUIDs for entities that don't exist.

### Concurrency and Cost

Multi-stage LLM pipelines are expensive. Graphiti's `add_episode()` makes minimum 4-5 LLM calls; with community updates enabled, the count scales with the number of affected community nodes. The `SEMAPHORE_LIMIT` environment variable (default 10) controls concurrent LLM calls to prevent rate-limit errors.

Cost mitigation strategies:
- Use a smaller model (`gpt-4.1-nano` vs `gpt-4.1-mini`) for simpler stages like attribute extraction
- Run bulk ingestion with `add_episode_bulk()` which skips edge invalidation for speed, accepting reduced temporal accuracy
- Cache entity embeddings across calls
- Use a local NER model (GLiNER2) for initial candidate detection before the LLM cross-encoder

## Failure Modes

**Silent data loss from JSON parse failures**: If the LLM returns malformed JSON, both Graphiti and mem0 log the error and continue, producing no memory updates for that episode. No exception is raised to the caller. This requires active monitoring of extraction success rates.

**Contradiction detection is entirely LLM-dependent**: Whether a new fact contradicts an existing edge is decided by the LLM in `resolve_extracted_edges`. A missed contradiction leaves stale edges marked as valid. There is no deterministic fallback.

**Entity extraction is too strict for some domains**: Graphiti's extraction prompt deliberately excludes abstract concepts and generic nouns. For medical notes, legal text, or scientific literature where abstract concepts carry semantic weight ("hypertension" as an entity linked to "Alice" is meaningful), this strictness reduces recall.

**Community detection drift**: [Graphiti's label propagation](../raw/deep/repos/getzep-graphiti.md) produces incrementally updated communities that gradually diverge from what a full recomputation would yield. The paper acknowledges this requires periodic full refreshes but does not specify detection criteria for when drift becomes problematic.

**~34% entity miss rate is structural**: The RAG vs GraphRAG paper's finding is not fixable through prompt tuning alone. Entities mentioned implicitly, through coreference, or across modalities require architectural changes (coreference resolution, multimodal extraction, multi-pass reading) that add significant complexity and cost.

**Bulk ingestion breaks temporal consistency**: Graphiti's `add_episode_bulk` explicitly skips edge invalidation. For historical imports, this means temporal ordering of facts is not maintained. Users importing legacy data must use individual `add_episode` calls if temporal accuracy matters.

## When Not to Use LLM-Based Entity Extraction

**High-volume, low-latency pipelines**: 4-5 LLM calls per document at API rates cannot scale to thousands of documents per minute. Traditional NER (BiLSTM, BERT fine-tuned on domain data) runs at thousands of documents per second on a single GPU.

**Well-defined, stable ontologies**: If you know exactly which entity types and relationship types you need and have labeled training data, a fine-tuned NER model outperforms zero-shot LLM extraction on in-domain text. The LLM's general-purpose understanding is a liability when you need narrow precision.

**Simple factual retrieval**: If your queries are single-hop lookups ("what is Alice's email address?"), the 34% entity miss rate plus the multi-stage pipeline cost makes entity extraction the wrong tool. RAG over flat documents wins on these queries per the benchmark evidence.

**Cost-sensitive applications**: A single `add_episode` call in Graphiti generates more LLM tokens than many complete query-response cycles. For consumer applications where millions of users each send hundreds of messages, the economics do not work.

## Alternatives and Selection Guidance

**Use RAG (no entity extraction)** when queries are predominantly single-hop factual lookups, your corpus is static, and you cannot afford the ~34% entity miss rate risk on critical queries.

**Use supervised NER (spaCy, flair, BERT-NER)** when your domain is well-defined, you have labeled training data, and latency or cost constraints preclude LLM calls per document.

**Use GLiNER2 / local NER** when you need zero-shot custom entity types without API costs and can accept lower accuracy than a fine-tuned model.

**Use LLM multi-stage extraction (Graphiti)** when temporal reasoning, contradiction detection, and relationship queries matter more than ingestion speed or cost, and your query volume is bounded (agent memory, enterprise knowledge management).

**Use simple fact extraction (mem0)** when you want automatic personalization without graph infrastructure, temporal reasoning is not required, and you need drop-in simplicity over maximum accuracy.

**Use hybrid retrieval (RAG + GraphRAG)** when your query distribution is mixed: the [RAG vs GraphRAG paper](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md) shows concatenating both retrieval results yields +6.4% on multi-hop tasks over either alone.

## Unresolved Questions

**Extraction quality measurement in production**: Neither Graphiti nor mem0 ships with built-in extraction quality metrics. How many entities were missed? How many duplicates were incorrectly merged? Without instrumentation, extraction quality degrades silently.

**Optimal chunking for extraction**: The RAG vs GraphRAG paper tests 256-token chunks but does not ablate. Graphiti processes episodes whole without chunking very long inputs. The relationship between chunk size, entity miss rate, and extraction cost is not characterized in the literature for LLM-based extraction.

**Cross-language entity resolution**: All documented implementations assume English. Entity resolution across languages ("München" = "Munich") requires multilingual embeddings and adds complexity to the deduplication prompts.

**When to refresh community detection**: Graphiti's label propagation drift problem lacks operational guidance. No production monitoring criteria for detecting when communities have diverged enough to require full recomputation.

**Governance for emergent entity types**: In systems without prescribed ontology, the set of entity types grows unbounded as the LLM invents new type names. No documented approach handles cleanup, merging, or governance of emergent type proliferation at scale.
