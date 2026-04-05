# HippoRAG

> Neurobiologically inspired RAG framework that uses knowledge graphs with personalized PageRank for multi-hop associative retrieval, mimicking human hippocampal memory consolidation -- accepted at NeurIPS'24 and ICML'25.

## What It Does

HippoRAG bridges RAG and genuine long-term memory by building knowledge graphs from ingested documents and using personalized PageRank to traverse them during retrieval. This enables multi-hop associativity (connecting facts across documents that share no surface-level similarity) and sense-making (integrating large, complex contexts). When a query arrives, the system doesn't just find similar chunks -- it follows associative paths through the knowledge graph, the way human memory connects "Erik Hort's birthplace is Montebello" to "Montebello is in Rockland County" to answer "What county is Erik Hort's birthplace in?" The framework supports continual learning: new documents enrich the graph without requiring reindexing.

## Architecture

Python library installable via pip. The pipeline has two phases: offline indexing builds a knowledge graph from documents using an LLM for entity/relation extraction and an embedding model (NV-Embed, GritLM, or Contriever) for node embeddings. Online retrieval uses personalized PageRank on the knowledge graph to find relevant passages. HippoRAG 2 adds improved sense-making and associativity while remaining cost and latency efficient for online queries. Uses significantly fewer resources for offline indexing than GraphRAG, RAPTOR, or LightRAG. Supports OpenAI models and local models via configurable LLM/embedding backends.

## Key Numbers

- 3,332 GitHub stars, 333 forks
- NeurIPS'24 paper (HippoRAG 1), ICML'25 paper (HippoRAG 2)
- Surpasses other methods on factual memory (NaturalQuestions, PopQA), sense-making (NarrativeQA), and associativity (MuSiQue, 2Wiki, HotpotQA, LV-Eval)
- Significantly lower offline indexing cost than GraphRAG
- MIT license

## Strengths

- Multi-hop retrieval that connects facts across separate documents -- something vector RAG fundamentally cannot do
- Neurobiologically grounded design (hippocampal indexing theory) produces an architecture that handles both simple lookups and complex reasoning
- Continual learning without reindexing -- new documents integrate into the existing graph
- Much cheaper than GraphRAG for offline processing while achieving comparable or better retrieval quality

## Limitations

- Knowledge graph construction requires LLM calls for entity/relation extraction, adding upfront cost and latency
- Graph quality depends on extraction accuracy -- missed or hallucinated relations degrade retrieval
- No built-in user memory or profiling -- purely document-oriented
- Smaller community and ecosystem compared to commercial memory solutions

## Alternatives

- [supermemory.md](supermemory.md) -- use when you need user profiling and temporal memory alongside document retrieval
- [pageindex.md](pageindex.md) -- use when documents have strong hierarchical structure and you want explainable single-document retrieval
- [memori.md](memori.md) -- use when you need SQL-native agent memory rather than document-level knowledge graphs

## Sources

- [Source](../../raw/repos/osu-nlp-group-hipporag.md) -- "HippoRAG is a novel RAG framework inspired by human long-term memory that enables LLMs to continuously integrate knowledge across external documents."
