---
entity_id: knowledge-graph
type: concept
bucket: knowledge-bases
abstract: >-
  Knowledge graphs represent entities and relationships as nodes and edges,
  enabling multi-hop reasoning and semantic retrieval that flat vector search
  cannot provide for connected knowledge domains.
sources:
  - tweets/heygurisingh-breaking-someone-open-sourced-a-knowledge-graph.md
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
  - repos/aiming-lab-simplemem.md
  - repos/osu-nlp-group-hipporag.md
  - repos/origintrail-dkg-v9.md
  - papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - deep/repos/osu-nlp-group-hipporag.md
  - deep/repos/topoteretes-cognee.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
related:
  - rag
  - cursor
  - mcp
  - graphrag
  - hipporag
  - claude-code
last_compiled: '2026-04-06T02:03:31.376Z'
---
# Knowledge Graph

## What It Is

A knowledge graph is a directed graph G = (V, E) where nodes V represent entities (people, places, concepts, events) and edges E represent typed relationships between them. Each edge carries a predicate: (subject, predicate, object) triplets such as (Cinderella, attended, royal\_ball) or (Montebello, part\_of, Rockland\_County).

This structure is fundamentally different from a vector database, which stores embeddings of text chunks and retrieves by similarity. A knowledge graph stores the semantic structure of information itself, not just compressed representations of it. Retrieval can follow relationship chains across many hops, not just proximity in embedding space.

Knowledge graphs appear throughout the AI knowledge management ecosystem as the connective tissue between documents. [HippoRAG](../projects/hipporag.md) builds them via OpenIE extraction and traverses them with Personalized PageRank. [GraphRAG](../projects/graphrag.md) builds community-level graph summaries. [Graphiti](../projects/graphiti.md) and [Zep](../projects/zep.md) maintain temporal knowledge graphs for agent memory. [Cognee](../projects/cognee.md) combines graph stores with vector and relational stores in a three-layer architecture.

## Why It Matters for LLM Systems

Vector search finds documents similar to the query. Knowledge graphs find documents connected to the query through chains of meaning.

Consider the query "What county is Erik Hort's birthplace a part of?" Three separate documents contain the relevant facts: "Erik Hort's birthplace is Montebello," "Montebello is a part of Rockland County," and potentially "Erik Hort is a Norwegian musician." A vector search for this query may retrieve the first document (high similarity) but miss the second (lower similarity, no lexical overlap with the query). A knowledge graph with edges (Hort, birthplace, Montebello) and (Montebello, part\_of, Rockland\_County) retrieves both through traversal, regardless of their individual similarity scores.

This multi-hop capability matters most when:
- Questions require synthesizing information spread across multiple documents
- Domain knowledge is highly interconnected (scientific literature, legal databases, codebases)
- Entities appear under different names (aliasing, coreference)
- Temporal or causal chains span many facts

The [Context Engineering](../concepts/context-engineering.md) survey formalizes context as C = A(c\_instr, c\_know, c\_tools, c\_mem, c\_state, c\_query). Knowledge graphs specifically enrich c\_know by providing structured, relational knowledge that dense retrieval misses, with demonstrated 10-20% improvements on multi-hop reasoning benchmarks over vanilla RAG approaches.

## How It Works

### Construction

**Entity extraction.** A document corpus is processed through Named Entity Recognition (NER) to identify entities. [HippoRAG](../projects/hipporag.md) runs a two-pass extraction: first extracting entities, then using those entities to guide triple extraction. This conditioning reduces hallucinated relations because the model can only produce triples over known entities. The extraction prompt goes through `prompts/templates/ner.py` and `prompts/templates/triple_extraction.py`, with results cached to avoid redundant LLM calls.

**Triple extraction.** Extracted entities anchor subject-predicate-object triples. "Oliver Badman is a politician" becomes (Oliver\_Badman, is\_a, politician). Triples are validated through a filter (`filter_invalid_triples()`) that removes structurally malformed entries.

**Graph assembly.** Nodes are created for entities; edges are created for predicates. Most implementations add three edge types: fact edges (entity-to-entity via extracted triples), passage edges (entity-to-source-chunk provenance), and synonymy edges (entity-to-entity via embedding similarity). Synonymy edges connect "Barack Obama" to "Obama" and "President Obama" even when they appear as separate extracted entities, enabling the graph to bridge coreference automatically.

**Entity embeddings.** All entity strings are embedded and stored. KNN retrieval over these embeddings populates synonymy edges for entity pairs above a similarity threshold. In HippoRAG, this is configured by `synonymy_edge_sim_threshold`, `synonymy_edge_topk`, and related parameters. This is the most computationally expensive indexing step and requires recomputation when the entity set changes significantly.

**Ontology grounding (optional).** Some systems validate extracted entities against OWL/RDF ontologies using fuzzy matching (Cognee uses 80% threshold by default). This canonicalizes terminology and marks nodes as `ontology_valid=True`. It reduces extraction noise but requires up-front schema design.

### Retrieval

**Query entity linking.** The query is processed to identify entity mentions. These mentions are linked to nodes in the graph through embedding similarity, exact match, or a recognition memory filter.

**Graph traversal.** Starting from query-linked nodes, the system propagates relevance through the graph. The dominant approach is Personalized PageRank (PPR): starting from query-relevant seed nodes, PPR iteratively distributes relevance to neighboring nodes weighted by edge structure. This naturally performs multi-hop traversal, following chains like (Hort → Montebello → Rockland\_County) even when no single document spans the full chain.

**Document scoring.** Passage nodes in the graph (which link entities to source chunks) receive PPR scores. These scores combine with dense passage retrieval scores using a configurable weight (`passage_node_weight`). The hybrid score determines which chunks are included in context.

**Fallback.** If no entities survive query linking, most implementations fall back to pure dense retrieval. This is important: a knowledge graph that fails to link the query to any nodes returns nothing useful, and the fallback prevents complete retrieval failure.

### Querying the Graph Directly

For systems with graph databases (Neo4j, Kuzu, Memgraph, Neptune), structured graph queries in Cypher or SPARQL can retrieve entities and paths directly, bypassing the embedding-similarity pathway entirely. This enables precise lookups like "all documents mentioning entities within 2 hops of 'Montebello'" that no similarity search can replicate. [Cognee](../projects/cognee.md) exposes this as the `CYPHER` search type. The tradeoff is query complexity: Cypher requires the user to know graph schema details.

## Storage Backends

Knowledge graphs in production use several storage approaches with distinct tradeoffs:

**In-memory (igraph, NetworkX).** Used by HippoRAG. Fast for moderate graphs, loaded entirely into RAM. Not externally queryable, not shareable across processes. Pickle serialization for persistence is fast but not portable across Python versions. Practical limit: tens of millions of edges before memory becomes a bottleneck.

**Embedded graph databases (Kuzu).** Used by Cognee as default. Runs in-process, no server required, queryable via Cypher. Better than pickle for correctness and queryability, still limited to single-machine deployments.

**Server-based graph databases (Neo4j, Memgraph, Neptune).** Used by enterprise deployments. Support distributed operation, ACID transactions, rich Cypher query surface, external access. Required when multiple services need to read/write the same graph or when graph exceeds single-machine memory. Adds deployment complexity and operational overhead.

**Property graphs vs. RDF triplestores.** Property graphs (Neo4j, Kuzu) store arbitrary key-value properties on nodes and edges, with Cypher as the query language. RDF triplestores (Apache Jena, Stardog) store subject-predicate-object triples with SPARQL as the query language. Property graphs are more flexible for application development; RDF triplestores integrate more naturally with OWL ontologies and semantic web standards. Most AI knowledge base implementations use property graphs.

## Relationship to Other Retrieval Concepts

Knowledge graphs and [Vector Databases](../concepts/vector-database.md) are complementary, not competing. Production systems almost always use both: vector search for semantic similarity retrieval, graph traversal for multi-hop relational retrieval. This is [Hybrid Retrieval](../concepts/hybrid-retrieval.md): combining graph-derived scores with dense retrieval scores, weighted to suit the task.

Knowledge graphs implement a form of [Semantic Memory](../concepts/semantic-memory.md) -- the structured knowledge of facts and relationships, as distinct from [Episodic Memory](../concepts/episodic-memory.md) (specific past events) or [Procedural Memory](../concepts/procedural-memory.md) (how to do things). In the [Agent Memory](../concepts/agent-memory.md) taxonomy, knowledge graphs typically serve as the semantic memory layer.

[GraphRAG](../projects/graphrag.md) extends basic knowledge graph retrieval by building community summaries -- clustering graph nodes into thematic communities and pre-generating summaries at multiple granularities. This enables both local (entity-level) and global (theme-level) retrieval, addressing the failure mode where individual entity connections miss broader conceptual relationships.

[HippoRAG](../projects/hipporag.md) draws the explicit analogy to hippocampal memory indexing theory: the graph represents the associative memory structure of the hippocampus, and PPR traversal mimics pattern completion -- the brain's ability to reconstruct a full memory from a partial cue.

## Who Implements This

**HippoRAG** ([project](../projects/hipporag.md)): Academic implementation. OpenIE extraction, igraph + PPR retrieval, DSPy-optimized recognition memory filter. Primary use case: multi-hop QA benchmarks. Published at NeurIPS '24 and ICML '25.

**GraphRAG** ([project](../projects/graphrag.md)): Microsoft research release. Community detection via Leiden algorithm on top of entity graphs. Two-mode retrieval: local (entity traversal) and global (community summarization). Intended for large corpora where thematic overview matters alongside entity-level lookup.

**Cognee** ([project](../projects/cognee.md)): Production-oriented. ECL pipeline (Extract, Cognify, Load) with ontology grounding, three-store architecture (relational + vector + graph), multiple graph backend options (Kuzu default, Neo4j, Neptune, Memgraph). Feedback weight system on DataPoints enables the graph to self-reinforce based on retrieval quality ratings.

**Graphiti / Zep** ([Graphiti project](../projects/graphiti.md), [Zep project](../projects/zep.md)): Temporal knowledge graphs for agent memory. Track when facts were asserted and when they became invalid, enabling queries like "what did the agent know at time T?" Primary use case: long-running agents that need to reason about changing facts.

**[LangChain](../projects/langchain.md) / [LlamaIndex](../projects/llamaindex.md)**: Both provide knowledge graph integrations as part of broader RAG toolkits. LlamaIndex has a `KnowledgeGraphIndex` that builds graphs from documents and uses them for retrieval. These are higher-level abstractions -- useful for getting started, less configurable than purpose-built implementations.

**[Cursor](../projects/cursor.md) / [Model Context Protocol](../concepts/mcp.md)**: MCP-based tools increasingly expose knowledge graph endpoints, letting agents query structured knowledge through tool calls rather than embedding similarity. This brings graph querying into the tool-use loop of agent architectures.

## Strengths

**Multi-hop reasoning.** The core strength: following chains of relationships across documents to answer questions that no single document answers. Benchmarks on MuSiQue, HotpotQA, and 2WikiMultiHopQA consistently show 10-20% improvements over dense retrieval for multi-hop questions (self-reported by HippoRAG; validated by publication at NeurIPS '24 and ICML '25).

**Associative retrieval.** Synonymy edges and PPR together implement a form of spreading activation: starting from one entity, the traversal naturally reaches related entities even without direct edges. This mirrors how human associative memory works and enables the system to find relevant documents that share no lexical overlap with the query.

**Explainability.** The graph structure is interpretable. When retrieval produces a result, you can trace the path through the graph that led there. This matters for debugging and for high-stakes domains where "the model retrieved this" is insufficient justification.

**Incremental indexing.** New documents add new entities and edges without requiring full re-indexing of existing documents. HippoRAG's `load_existing_openie()` loads previously processed results; Cognee's DataPoint system supports similar incremental addition. This matters for knowledge bases that grow continuously.

**Entity deduplication.** A properly maintained knowledge graph merges references to the same entity across documents, preventing the fragmentation that plagues chunk-based retrieval. "The US," "the United States," and "America" can all resolve to a single entity node with edges from all source documents.

## Limitations

**Construction cost.** Building a knowledge graph requires LLM calls for entity and triple extraction on every document. At scale (thousands of documents), this cost dominates the indexing budget. A corpus that would cost $10 to embed for vector search might cost $100-500 to process through OpenIE for graph construction. Cognee reports 1 GB processed in 40 minutes using 100+ containers -- a significant infrastructure requirement.

**Extraction quality dependency.** Graph quality is entirely downstream of extraction quality. A weak NER model produces incomplete or incorrect entities; a weak triple extractor produces spurious or missed relationships. The 16.3% false positive rate in self-generated unit tests observed in Reflexion-style evaluation applies here too: errors compound. Entities missed during NER stay missing forever because the triple extractor can only produce triples over known entities.

**Concrete failure mode -- entity aliasing.** Short or ambiguous entity names often fail synonymy edge expansion. "US" and "United States of America" may not embed similarly enough to exceed the synonymy threshold, creating disconnected graph components. A query about "US policy" finds "US" nodes; documents discussing "United States of America policy" remain unreachable through traversal. The graph appears complete but has silent gaps. No system has fully solved this; HippoRAG configures around it through threshold tuning.

**Unspoken infrastructure assumption.** Most knowledge graph implementations assume a single-machine, batch-processing workflow. The igraph in HippoRAG loads entirely into RAM; Cognee's brute-force triplet search (`brute_force_triplet_search`) fetches all triplets and filters in memory. Production deployments serving concurrent queries with frequent graph updates require migration to server-based graph databases (Neo4j, Memgraph) and explicit cache invalidation strategies. This migration is non-trivial and rarely documented.

**PPR at scale.** Personalized PageRank computation on large graphs (millions of entities) is expensive. HippoRAG instruments `self.ppr_time` for profiling, and the documentation acknowledges this can be too slow for real-time applications. The `passage_node_weight` parameter provides a dial from pure PPR to pure dense retrieval, but tuning this requires understanding how your specific graph behaves under query load.

**Temporal reasoning is underdeveloped.** Standard knowledge graphs treat facts as static: (Montebello, part\_of, Rockland\_County) has no timestamp. When facts change, the graph requires explicit delete-and-replace operations. Systems like Graphiti/Zep add temporal validity ranges to edges, but this adds schema complexity and query complexity. For knowledge bases covering evolving facts, this is a meaningful gap.

## When NOT to Use a Knowledge Graph

**Simple factual retrieval over isolated documents.** If your queries rarely require connecting information across multiple documents, the construction cost of a knowledge graph exceeds its retrieval benefit. Dense retrieval with [BM25](../concepts/bm25.md) hybrid scoring is cheaper, faster to build, and easier to maintain for this use case.

**Very small corpora.** Below a few thousand documents, the overhead of graph construction and maintenance rarely pays off. Simple vector search over small corpora is fast enough that the added retrieval quality of graph traversal provides marginal practical benefit.

**High update frequency.** If documents change frequently (live news feeds, real-time operational data), the delete-and-replace pattern for graph updates introduces latency and consistency problems. Streaming vector databases handle high-frequency updates more gracefully.

**Latency-sensitive applications.** PPR traversal on large graphs adds 50-500ms of retrieval latency beyond embedding lookup. If your application requires sub-100ms end-to-end retrieval, knowledge graph traversal may not fit the budget. HippoRAG's fallback to pure dense retrieval is a recognition of this tradeoff.

**Unstructured, narrative-heavy content.** Knowledge graphs work best on content with clear entities and relationships. Philosophical texts, creative writing, and dense narratives produce noisy extractions with many spurious triples. The graph adds noise rather than structure. For this content type, chunk-based retrieval with [RAPTOR](../projects/raptor.md)-style hierarchical summarization may perform better.

## Unresolved Questions

**Optimal extraction model size.** HippoRAG ships pre-computed OpenIE results using both GPT-4o-mini and Llama-3.3-70B-Instruct. The documentation does not characterize how extraction quality degrades with smaller models, or whether the downstream retrieval improvement holds for lower-quality graphs. Practitioners must empirically determine the minimum model quality for acceptable extraction in their domain.

**Synonymy threshold tuning.** The synonymy edge threshold and top-k parameters have significant impact on graph connectivity and retrieval quality, but no systematic guidance exists for setting them. Documentation acknowledges the tradeoff ("too aggressive: false synonymy connections corrupt the graph; too conservative: multi-hop reasoning fails") without providing domain-specific heuristics.

**Governance at scale.** For organizational knowledge bases, who decides which entities are canonical? How are conflicting relationships between documents resolved? (Document A says X is true; Document B says X is false.) Most implementations store both assertions and let the query layer surface the conflict, but no system provides systematic conflict detection or resolution workflows.

**Cost at scale in production.** Published benchmarks cover research datasets (MuSiQue, HotpotQA). No published analysis covers the operational cost of maintaining a knowledge graph over a large production corpus with continuous document updates, schema evolution, and concurrent query load.

## Alternatives

**Use [Vector Database](../concepts/vector-database.md) alone** when queries are primarily semantic similarity tasks over independent documents, construction cost is a constraint, or retrieval latency must stay under 50ms.

**Use [GraphRAG](../projects/graphrag.md)** when you need both entity-level graph traversal and thematic overview queries over large corpora. GraphRAG's community summaries enable "what are the main themes?" queries that knowledge graphs without summarization cannot answer.

**Use [HippoRAG](../projects/hipporag.md)** when multi-hop QA accuracy is the primary metric and you can afford the OpenIE indexing cost. The PPR approach is the most benchmarked implementation for associative multi-hop retrieval.

**Use [Graphiti](../projects/graphiti.md) / [Zep](../projects/zep.md)** when your agent needs to track how facts evolve over time. Standard knowledge graphs treat all facts as equally current; temporal graphs let you query "what did the agent know at time T?"

**Use [RAPTOR](../projects/raptor.md)** when the primary retrieval challenge is hierarchical abstraction (needing both specific facts and thematic summaries) rather than multi-hop entity relationships.

**Use [Hybrid Retrieval](../concepts/hybrid-retrieval.md) combining vector + graph** for production systems where neither pure approach is sufficient. Score fusion with configurable weights (analogous to HippoRAG's `passage_node_weight`) lets you tune the balance per task type.

## Related Concepts

- [Retrieval-Augmented Generation](../concepts/rag.md): Knowledge graphs extend RAG by adding graph traversal to the retrieval step
- [Semantic Memory](../concepts/semantic-memory.md): Knowledge graphs implement structured semantic memory for agents
- [Hybrid Retrieval](../concepts/hybrid-retrieval.md): Combining graph scores with dense retrieval scores
- [Agent Memory](../concepts/agent-memory.md): How knowledge graphs fit into broader agent memory architectures
- [Context Engineering](../concepts/context-engineering.md): Knowledge graphs enrich the c\_know component of context assembly
- [Agentic RAG](../concepts/agentic-rag.md): Agents that query knowledge graphs dynamically through tool calls
- [Memory Consolidation](../concepts/memory-consolidation.md): How facts from new documents integrate into existing graph structure
