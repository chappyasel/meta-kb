---
entity_id: entity-extraction
type: approach
bucket: knowledge-bases
sources:
  - deep/repos/getzep-graphiti.md
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - deep/repos/infiniflow-ragflow.md
  - deep/repos/mem0ai-mem0.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
related:
  - Retrieval-Augmented Generation
last_compiled: '2026-04-05T05:36:13.208Z'
---
# Entity Extraction

Entity extraction is the process of automatically identifying and classifying named entities from unstructured text. In knowledge base and agent memory systems, it functions as the boundary layer between raw text and structured representation: raw documents go in, typed, named objects come out, ready to become nodes in a graph or entries in a structured store.

The term covers a spectrum from simple named-entity recognition (NER), which identifies person names, locations, and organizations using statistical classifiers, to full knowledge graph triple extraction, which identifies entities AND the typed relationships between them. Modern LLM-based systems blur this distinction, often extracting entities and their relationships in a single pass.

## Why It Matters

Without entity extraction, retrieval systems operate over text chunks. A question like "Where does Alice work?" requires the retrieval system to find a chunk that happens to mention Alice and employment in the same window. With entity extraction, the same question can be answered by traversing a graph edge: `Alice -> WORKS_AT -> Google`. The structured representation survives context window boundaries, supports multi-hop reasoning, and enables temporal tracking of facts as they change.

The [RAG vs. GraphRAG evaluation](../../raw/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md) quantifies this directly: GraphRAG outperforms dense retrieval by 23.33 points on temporal reasoning questions and by 3.85 points on comparison questions. The advantage disappears on single-hop factual lookups, where dense retrieval wins. The gap between the two approaches is largely explained by whether relevant information was successfully extracted into the graph during ingestion.

## How It Works

### Statistical and Rule-Based NER

Classical NER uses sequence labeling models (BiLSTM-CRF, BERT fine-tuned on CoNLL datasets) that assign an IOB tag to each token: `B-PER` (beginning of person), `I-PER` (inside person), `O` (outside any entity). These models run fast (milliseconds per sentence) and require no LLM call, but their entity types are fixed to the training distribution. SpaCy's `en_core_web_sm` recognizes roughly 18 entity types; expanding to domain-specific types requires fine-tuning on labeled data. [Graphiti integrates GLiNER2 as a local NER option](../../raw/repos/getzep-graphiti.md), a lightweight model that can identify arbitrary entity types at inference time without fine-tuning, by framing NER as a span prediction problem conditioned on entity type descriptions.

### LLM-Based Triple Extraction

Contemporary knowledge graph systems use LLMs to extract not just entities but full triples: `(entity, relation, entity)`. Graphiti's `extract_nodes` and `extract_edges` functions in `utils/maintenance/node_operations.py` and `utils/maintenance/edge_operations.py` demonstrate the current state of the art.

The entity extraction prompt (`prompts/extract_nodes.py`) receives:
- The current episode text
- The four preceding episodes as context
- Entity type definitions (default or custom Pydantic models)

It returns `ExtractedEntity` objects with names and type classifications. The prompt is notably prescriptive about what NOT to extract: pronouns, abstract concepts, generic nouns, bare kinship terms. "Nisha's dad" qualifies; "dad" does not. This precision matters because downstream deduplication and graph traversal break down if entities are underspecified.

[RAGFlow's GraphRAG module](../../raw/repos/infiniflow-ragflow.md) runs entity extraction per document through `GeneralKGExt` and `LightKGExt` extractors, with users able to specify target entity types (organization, person, location). A key design decision: RAGFlow submits each document to the LLM only once for extraction, reducing cost versus Microsoft GraphRAG's multi-pass approach.

### The Deduplication Problem

Entity extraction produces raw strings: "NYC", "New York City", "New York", "the City" might all appear in a corpus and refer to the same node. Without deduplication, the graph fragments into disconnected islands.

Graphiti's `resolve_extracted_nodes` runs a three-stage resolution pipeline:
1. Embed each extracted entity into 1024-dimensional vectors
2. Run cosine similarity search against existing graph nodes plus fulltext search on names and summaries
3. Feed candidate pairs to an LLM cross-encoder that makes the final deduplication decision

The LLM uses an integer candidate_id mapping pattern to reference candidates, keeping token counts manageable. When a duplicate is detected, the system generates an updated name and summary incorporating the new information, then uses the merged node going forward.

RAGFlow's `entity_resolution.py` addresses the same problem and explicitly identifies it as a limitation of Microsoft's original GraphRAG: treating "2024" and "Year 2024" as distinct entities. RAGFlow uses embedding similarity to identify near-duplicates, then resolves them with an LLM.

### Temporal Bounds on Relations

A distinguishing feature of Graphiti's extraction is that the LLM assigns temporal bounds to each extracted edge during `extract_edges`. The `EntityEdge` carries four timestamps: when the fact became true (`valid_at`), when it stopped being true (`invalid_at`), when the system recorded it (`created_at`), and when the system invalidated it (`expired_at`). The reference_time parameter allows resolution of relative temporal expressions ("last week" becomes a concrete date).

This bi-temporal model makes entity extraction a time-aware process, not just a snapshot. When new information contradicts an existing edge (Alice now works at Meta, not Google), `resolve_extracted_edges` sets `expired_at` on the old edge rather than deleting it. The historical record persists for time-travel queries: "What did the system believe about Alice's employer in January?"

## The Extraction Ceiling

The [RAG vs. GraphRAG paper](../../raw/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md) identifies entity extraction quality as the binding constraint on GraphRAG performance: only 65.8% of answer-relevant entities exist in constructed knowledge graphs on HotPotQA, and 65.5% on NQ. This ~34% miss rate creates a hard ceiling independent of retrieval algorithm quality. If an entity was not extracted during ingestion, graph traversal cannot find it.

The miss rate worsens for specialized domains. General-purpose LLMs trained on web text extract person names, companies, and locations reliably. Domain-specific entities (drug names, legal concepts, product SKUs, internal project codenames) require either fine-tuned models, explicit type definitions in the extraction prompt, or hybrid approaches that fall back to source text when graph traversal fails.

The "triplets+text" GraphRAG variant tested in the paper partially addresses this by maintaining links from graph nodes back to their source passages. When graph retrieval misses, the system can fall back to dense retrieval over the source text. This hybrid is consistently better than pure KG retrieval.

## Implementation Patterns

### Structured Output with Pydantic

LLM-based extraction systems universally use structured output to ensure the LLM returns parseable entity objects. Graphiti's extraction prompts specify Pydantic models as the response schema, enforcing field presence and type. Custom entity types extend this:

```python
class PersonModel(BaseModel):
    name: str
    role: str | None = None

class CompanyModel(BaseModel):
    name: str
    industry: str | None = None

result = await graphiti.add_episode(
    ...,
    entity_types={"Person": PersonModel, "Company": CompanyModel},
)
```

Without structured output, downstream parsing becomes fragile. LLMs occasionally hallucinate field names or omit required fields; Pydantic validation catches these and enables retries.

### Negative Examples in Prompts

Graphiti's extraction prompt demonstrates a technique that meaningfully improves precision: extensive negative examples specifying what NOT to extract. The prompt tells the LLM to avoid pronouns, abstract concepts, generic nouns, and bare kinship terms, with concrete examples of each. This reduces false positive extractions that create noise in the graph.

### Concurrency Control

Entity extraction for large corpora involves many parallel LLM calls. Graphiti uses `semaphore_gather` with a configurable `SEMAPHORE_LIMIT` (default 10) to prevent rate-limit errors. RAGFlow's RAPTOR implementation uses async semaphores (`chat_limiter`) for the same reason. Both systems treat extraction as a background task, not a synchronous operation.

### Reflection and Self-Correction

Graphiti's paper (arXiv:2501.13956) mentions a "reflection technique" to minimize hallucinations during entity and summary extraction. The LLM reviews its own extraction output before finalizing, reducing invented entities. The implementation lives in the extraction prompts rather than as a separate code stage.

## Failure Modes

**Over-extraction with weak prompts.** Without explicit negative examples, LLMs extract pronouns, vague references, and abstract concepts as entities. These create spurious nodes that degrade graph quality and increase deduplication cost.

**Deduplication failure on domain jargon.** "BERT" (the model) and "Bert" (a name) look similar to embedding similarity but refer to distinct entities. Domain-specific abbreviations, acronyms, and technical terms require either custom entity type definitions or a cross-encoder reranker in the deduplication step.

**Stale edges from missed contradictions.** Graphiti's edge resolution relies on the LLM to identify when new information contradicts existing edges. If the LLM misses a contradiction (Alice moved from Google to Meta, but the LLM doesn't recognize this as contradicting the WORKS_AT edge), the stale edge persists as valid. There is no deterministic contradiction detection as a backstop.

**Extraction ceiling in specialized domains.** As documented in the RAG vs. GraphRAG evaluation, ~34% of answer-relevant entities are missed by LLM-based extraction on general benchmarks. Domain-specific corpora perform worse. Applications that depend on complete entity coverage need either validated extraction pipelines or hybrid retrieval that falls back to dense search.

**Cross-document entity linking.** [RAGFlow's GraphRAG](../../raw/repos/infiniflow-ragflow.md) explicitly documents that knowledge graph generation operates per-document. The system cannot link graphs across documents within a knowledge base due to memory and computational constraints. This limits multi-hop reasoning to within-document relationships, which is a significant constraint for enterprise knowledge bases with thousands of documents.

## Practical Guidance

Entity extraction is worth the investment when your retrieval queries require multi-hop reasoning, temporal tracking, or comparison across entities. The [RAG vs. GraphRAG benchmark](../../raw/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md) shows it adds 23+ points on temporal questions and 4+ points on comparison questions, but subtracts points on single-hop factual lookups. Profile your query distribution before committing to a graph-based retrieval architecture.

For production systems, validate extraction recall on a sample of your corpus before building the full pipeline. If your answer-relevant entity coverage is below 80%, improve extraction before tuning retrieval. The RAG vs. GraphRAG paper's finding that the "triplets+text" variant consistently outperforms "triplets-only" suggests keeping links to source passages as a standard practice, regardless of whether you use pure graph retrieval or hybrid.

When using LLM-based extraction, custom entity type definitions with Pydantic schemas significantly improve precision over generic extraction. The investment in defining your domain's entity taxonomy pays off in cleaner graphs and cheaper deduplication downstream.

## Related Concepts and Projects

- Retrieval-Augmented Generation: Entity extraction feeds the knowledge graph layer of GraphRAG, extending RAG with structured relational retrieval
- [Graphiti](../projects/graphiti.md): The most complete implementation of LLM-based entity extraction with bi-temporal edge tracking
- [RAGFlow](../projects/ragflow.md): Production RAG engine with document-scoped GraphRAG entity extraction and entity resolution
