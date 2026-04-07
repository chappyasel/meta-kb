---
entity_id: entity-extraction
type: approach
bucket: knowledge-bases
abstract: >-
  Entity extraction identifies named entities and their relationships from text,
  converting unstructured language into structured triples and facts that
  knowledge graphs and memory systems can store, query, and reason over.
sources:
  - repos/getzep-graphiti.md
  - repos/supermemoryai-supermemory.md
  - deep/repos/getzep-graphiti.md
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - deep/repos/mem0ai-mem0.md
related:
  - openai
  - knowledge-graph
  - hybrid-search
  - rag
  - anthropic
  - mcp
  - mem0
last_compiled: '2026-04-07T11:58:17.436Z'
---
# Entity Extraction

## What It Is

Entity extraction is the process of identifying discrete named things (people, organizations, locations, concepts, events) and the relationships between them from unstructured text. The output is structured data: either flat facts ("Alice works at Google") or typed triples (Alice --WORKS_AT--> Google) that downstream systems can store, index, and query.

In the context of [Knowledge Graph](../concepts/knowledge-graph.md) construction and [Agent Memory](../concepts/agent-memory.md), entity extraction is the first transformation step: it converts raw text into the structured representation that makes information retrievable, comparable, and updatable rather than buried in document chunks.

Two distinct subtasks compose the full process. Named Entity Recognition (NER) identifies spans of text and assigns them types (PERSON, ORG, LOC, DATE). Relation Extraction (RE) identifies the semantic connection between two entities within the same context window. Most modern LLM-based pipelines handle both in a single prompt pass using structured output schemas.

## Why It Matters for Knowledge Bases

[Retrieval-Augmented Generation](../concepts/rag.md) retrieves document chunks. Entity extraction enables something different: retrieval of facts about specific entities and the traversal of relationships between them. The distinction matters when queries require multi-hop reasoning ("Who manages the team that owns the product Alice uses?") or temporal tracking ("What was Alice's employer before Google?").

Without entity extraction, a memory system can only answer queries when the answer appears verbatim in a stored chunk. With it, the system can answer from any combination of extracted facts, even when no single document contains the full answer.

The [Hybrid Search](../concepts/hybrid-search.md) approaches used in production memory systems combine embedding similarity (semantic search over chunks), BM25 (lexical search), and graph traversal (relationship-based search). The third component requires extracted entities and relationships to exist in the graph before traversal is possible.

## How It Works

### LLM-Based Extraction Pipelines

The dominant approach in agent memory systems uses LLMs with structured output to extract entities and relationships from text. The core pattern:

1. Feed the text (plus context, if available) to an LLM
2. Request structured output conforming to a Pydantic schema defining entity types and relationship types
3. Parse the response into typed objects
4. Run a deduplication pass to resolve new entities against existing ones

[Graphiti](../projects/graphiti.md) implements this as a multi-stage pipeline inside `graphiti_core/utils/maintenance/`. The `extract_nodes` function sends the current episode plus the previous four messages to the LLM with a prompt that specifies what to extract and, critically, what NOT to extract. The extraction prompt (`prompts/extract_nodes.py`) includes extensive negative examples: no pronouns, no abstract concepts like "team" without qualification, no bare kinship terms like "dad" without context. The entity name must be specific: "Nisha's dad" passes; "dad" does not.

A second function, `extract_edges`, runs separately to extract fact triples. Each triple carries source entity, target entity, relation type in SCREAMING_SNAKE_CASE, a natural language description, and temporal bounds (`valid_at`, `invalid_at`). This temporal annotation is what separates a knowledge graph memory system from a simple lookup table.

[Mem0](../projects/mem0.md) uses a simpler two-pass approach in `mem0/memory/main.py`. Pass one extracts atomic facts as strings ("Name is John", "Likes cheese pizza") using `USER_MEMORY_EXTRACTION_PROMPT`. Pass two reconciles these against existing memories using `DEFAULT_UPDATE_MEMORY_PROMPT`, which returns ADD/UPDATE/DELETE/NONE decisions. Mem0 stores flat facts in a vector store rather than typed triples in a graph, which makes the extraction simpler but limits relationship traversal.

### Deduplication and Entity Resolution

Extraction quality alone is insufficient. The harder problem is resolving "NYC" and "New York City" to the same node, or distinguishing "Java the language" from "Java the island." This is entity resolution, and it requires a combination of embedding similarity, lexical matching, and LLM judgment.

Graphiti's `resolve_extracted_nodes` function handles this with three steps:
1. Cosine similarity search against existing entity embeddings to find candidates
2. Full-text search on entity names and summaries for lexical candidates
3. An LLM cross-encoder call to make the final deduplication decision

Mem0 delegates the same decision to a single LLM prompt, passing existing memories and new facts to the model and asking it to determine which operation applies. The integer ID mapping trick (`temp_uuid_mapping`) prevents UUID hallucination: before sending existing memory IDs to the LLM, mem0 maps them to sequential integers (0, 1, 2, ...) and remaps back after the response.

### Traditional vs. LLM-Based NER

Before LLMs, entity extraction used dedicated NER models (SpaCy, BERT-based taggers, Stanford NER) trained on annotated corpora. These are faster and cheaper per document but handle only predefined entity types and struggle with domain-specific terminology.

LLM-based extraction generalizes across domains without retraining, supports custom entity schemas defined by the developer, and handles ambiguous or context-dependent entities better. The cost is latency and LLM API calls per document.

Graphiti supports a hybrid option: GLiNER2, a local NER model that runs without an external LLM API call, available as one of its seven LLM client implementations in `graphiti_core/llm_client/`.

## Entity Types and Ontology

Production systems support two modes of entity typing:

**Prescribed ontology** (developer-defined): The developer defines entity types and their required attributes using Pydantic models before ingestion begins. Graphiti accepts custom entity types as a dict passed to `add_episode()`. Mem0 applies separate extraction prompts for users versus agents. This approach yields cleaner, more consistent structured output but requires upfront schema design.

**Learned structure** (emergent): The extractor infers entity types from the data itself. Graphiti defaults to this when no custom types are provided, using a generic entity schema with name, summary, and type fields. The advantage is flexibility; the disadvantage is inconsistency across documents.

The tension between these modes is unresolved in practice. Prescribed ontology requires you to know your domain's entities before you build the system. Learned structure accumulates noise and inconsistency at scale.

## Relationship to Knowledge Graphs

Entity extraction produces the raw material that [Knowledge Graph](../concepts/knowledge-graph.md) construction pipelines consume. Each extracted triple (subject, predicate, object) becomes an edge in the graph, with subject and object as nodes. The quality ceiling of any knowledge graph is therefore the quality ceiling of its extraction pipeline.

The RAG vs. GraphRAG comparative analysis (arXiv paper analyzed in source material) identifies the practical consequence: approximately 34% of answer-relevant entities are missed during graph construction on HotPotQA. This 34% miss rate creates a hard retrieval ceiling. Queries requiring an unextracted entity will fail even if the answer exists in the source documents. GraphRAG's multi-hop reasoning advantage over standard RAG (+23 F1 points on temporal queries) only applies to entities that were successfully extracted.

For [GraphRAG](../concepts/graphrag.md) specifically, community detection (label propagation or Leiden algorithm) clusters extracted entities into higher-level summaries, which then become independently searchable. The quality of these communities depends on extraction recall: missing entities are also missing from community membership, degrading summary quality.

## Failure Modes

**Extraction specificity vs. recall tradeoff**: Strict extraction prompts (Graphiti's approach) reduce noise but miss valid entities in domains where abstract concepts carry domain significance. Medical notes, legal documents, and scientific papers often require extracting things that general-purpose prompts exclude.

**Silently dropped extractions**: LLM-based extraction can return malformed JSON or hallucinated IDs. Mem0's implementation catches `KeyError` on ID remapping per-memory but only logs errors, not surfacing them to callers. Silent data loss is a consistent failure pattern across LLM extraction pipelines.

**Entity drift across sessions**: Without strict deduplication, the same real-world entity accumulates multiple graph nodes over time ("OpenAI", "Open AI", "openai"). Graph queries then miss connections that span node variants. Deduplication LLM calls add latency and cost but are necessary for graph coherence.

**Model-dependent quality**: Extraction quality varies significantly across LLM providers. Structured output requirements (Pydantic schema validation) further constrain provider choice. Smaller or cheaper models produce more schema violations and lower-quality entity resolution. Graphiti's documentation warns that using providers without structured output support "may result in incorrect output schemas and ingestion failures."

**Domain mismatch**: General-purpose extraction prompts perform poorly on specialized corpora. Technical acronyms, proprietary product names, and domain jargon are systematically under-extracted without domain-specific prompt engineering or custom entity type definitions.

## Practical Implications for Builders

**Match extraction approach to query type**: Flat fact extraction (mem0's approach) suffices for personalization and preference tracking. Triple extraction with relationship types (Graphiti's approach) is required when queries involve relationship traversal, comparison across entities, or temporal reasoning.

**Budget for deduplication cost**: Each extracted entity requires embedding + similarity search + optional LLM resolution. At scale, deduplication becomes the dominant cost. Graphiti uses `SEMAPHORE_LIMIT` (default 10) to rate-limit concurrent LLM calls and prevent 429 errors.

**Test extraction recall on your domain before committing to a graph architecture**: The 34% entity miss rate from the RAG/GraphRAG comparison paper is for general-domain Wikipedia text. Specialized domains likely have higher miss rates. Run a sample extraction pass and manually audit which entities the pipeline misses before building the downstream retrieval system.

**Predefined queries outperform LLM-generated ones**: Graphiti's design explicitly avoids generating Cypher queries with LLMs, instead using predefined query templates. The same principle applies to extraction schemas: LLM-generated schemas are less consistent than developer-defined ones.

**Temporal annotation adds cost but enables temporal queries**: The Zep benchmark shows +38.4% improvement on temporal reasoning tasks from bi-temporal edge annotation. If your use case includes "what changed when" queries, invest in temporal extraction during the ingestion pipeline. If not, flat fact extraction is simpler and cheaper.

## Implementations

- **[Graphiti](../projects/graphiti.md)**: Multi-stage pipeline with typed triples, bi-temporal validity windows, and entity deduplication. `graphiti_core/utils/maintenance/node_operations.py` and `edge_operations.py`. Highest quality, highest cost per document.
- **[Mem0](../projects/mem0.md)**: Two-pass flat fact extraction. `mem0/memory/main.py`. Simpler schema, lower cost, no relationship typing.
- **[LangChain](../projects/langchain.md)**: Provides extraction chains and NER tools that wrap both traditional models and LLMs.
- **[LlamaIndex](../projects/llamaindex.md)**: Knowledge graph index with built-in entity extraction for graph construction.
- **GLiNER2**: Local NER model supported by Graphiti for extraction without external LLM calls.
- **SpaCy / Hugging Face NER models**: Traditional pipeline approach, faster and cheaper but limited to predefined types.

## Related Concepts

- [Knowledge Graph](../concepts/knowledge-graph.md): The primary downstream consumer of extracted entities and relationships
- [GraphRAG](../concepts/graphrag.md): Retrieval approach that depends on extraction quality for its graph construction
- [Hybrid Search](../concepts/hybrid-search.md): Combines extracted graph structure with vector and lexical search
- [Semantic Memory](../concepts/semantic-memory.md): How extracted facts persist and become queryable over time
- [Agent Memory](../concepts/agent-memory.md): The broader system context in which extraction pipelines operate
- [Retrieval-Augmented Generation](../concepts/rag.md): The alternative retrieval approach that operates without entity extraction

## Unresolved Questions

**Extraction evaluation**: No standard benchmark measures entity extraction recall and precision specifically for agent memory use cases. The 34% entity miss rate comes from QA benchmarks, not extraction-quality benchmarks. Practitioners lack tools to measure extraction quality on their own domains without building custom evaluation pipelines.

**Optimal granularity**: No consensus exists on whether to extract fine-grained facts ("Alice's manager is Bob") or coarser entities and let queries reconstruct relationships. Finer granularity improves retrieval precision but multiplies extraction costs and deduplication complexity.

**Cross-document resolution at scale**: Single-document entity resolution is reasonably solved. Resolving entities across thousands of documents ingested over months, where the same entity appears with different names, abbreviations, or context, remains an open engineering problem. Graphiti's incremental community update approach acknowledges this limits output quality over time.
