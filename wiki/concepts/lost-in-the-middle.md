---
entity_id: lost-in-the-middle
type: concept
bucket: context-engineering
abstract: >-
  Lost in the Middle: LLMs systematically underperform on information placed in
  the center of long contexts, degrading up to 30%+ below performance on
  beginning/end-positioned content.
sources:
  - repos/microsoft-llmlingua.md
  - tweets/akshay-pachaar-the-anatomy-of-an-agent-harness.md
  - articles/gustycube-an-annoyed-computer-scientist-markdown-is-not-memory.md
  - >-
    articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md
related:
  - claude-code
  - retrieval-augmented-generation
  - react
last_compiled: '2026-04-08T02:51:56.116Z'
---
# Lost in the Middle

## What It Is

Lost in the Middle is a documented failure mode in transformer-based language models: when relevant information appears in the center of a long input context, models retrieve and use it substantially less reliably than information placed at the beginning or end. The effect was formally characterized in a 2023 paper from Stanford and Meta ("Lost in the Middle: How Language Models Use Long Contexts," Liu et al.), but practitioners had encountered it informally for years before that.

The phenomenon matters because it directly undermines the assumption that a longer context window equals more usable information. A model with a 128K token window does not give you 128K tokens of equally accessible memory. You get strong attention at the primacy and recency positions, with a trough of degraded recall in between.

## How It Works

### The Attention Pattern

Transformer attention is not uniform across sequence positions. Models develop positional biases during pretraining that cause them to attend more strongly to early tokens (primacy effect) and recent tokens (recency effect). Content in the middle competes with both, and tends to lose.

The Liu et al. study measured this precisely on multi-document question answering tasks. Accuracy did not fall gradually as context grew: it fell sharply as relevant documents moved toward the center of the context window, then partially recovered as they approached the end. With 20 retrieved documents included, accuracy on some configurations fell *below closed-book performance*, meaning the retrieved context actively hurt the model by burying the answer under irrelevant material.

The quantified drop: performance degradation of 20+ percentage points between best-case (relevant document first) and worst-case (relevant document at position 10 of 20) placement. This is not a marginal effect. It is large enough to change whether a production system works.

[Source](../raw/articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md)

### Why Middle Content Suffers

Three factors compound:

**Attention dilution.** With more tokens in the window, the softmax attention distribution spreads across more keys. Middle tokens compete with more neighbors than end tokens do.

**Positional encoding.** Most modern models use RoPE or ALiBi positional encodings that assign structural significance to distance from sequence boundaries. A token at position 512 in a 1024-token sequence has different rotational or distance encoding than position 512 in a 100-token sequence.

**Training data distribution.** During pretraining, models see many documents where the key claim appears early (abstracts, topic sentences) or at the end (conclusions, punchlines). Middle-heavy information patterns are underrepresented relative to their frequency in real retrieval contexts.

### Context Length Does Not Fix It

Longer windows make the problem geometrically worse, not better. A 4K model with the answer at position 2K has it at 50% depth. A 128K model with the answer at position 64K has it at 50% depth with 127,998 other tokens competing for attention. The trough scales with context size.

Some model families (Gemini Ultra, Claude 3 series) have shown improvements on specific needle-in-a-haystack benchmarks, but these benchmarks test single-item retrieval from synthetic positions. Multi-hop reasoning across middle-positioned content remains degraded even in frontier models.

## The RAG Connection

Lost in the Middle is where [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) breaks silently. A RAG system retrieves 10–20 documents and concatenates them into a context window. The model's actual accuracy depends heavily on whether the most relevant chunk landed first, last, or in the middle, which retrieval ranking does not control for.

The practical failure mode: a retriever with high recall (finds the right document) paired with a reranker that sorts by semantic similarity, which places documents in a unimodal relevance order. The top document goes first, the second goes second, and so on. If the system needs information from documents 3–8, those land in the middle. The model reads them but weighs them less. The answer degrades.

Agentic RAG amplifies this: each retrieval loop appends new context. By iteration 3, earlier retrieved material has migrated toward the middle of an expanding window, even if it was high-signal at retrieval time. [Source](../raw/articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md)

## Mitigations in Practice

### Context Position Engineering

The most direct response is to treat position as a design variable rather than an accident of document ordering. Anthropic's context engineering guidance explicitly recommends placing high-priority content at the beginning and end of the assembled context. [ReAct](../concepts/react.md) implementations from practitioners apply the same logic: system-critical instructions go in the first few hundred tokens of the system prompt, not buried after tool descriptions.

[Context Engineering](../concepts/context-engineering.md) and [Context Management](../concepts/context-management.md) formalize these practices. The canonical rule: never place critical information where the model is least likely to attend to it.

### LongLLMLingua

Microsoft's LongLLMLingua (ACL 2024) directly targets this failure mode. Rather than compressing tokens uniformly, it reorders document chunks based on query relevance before injecting them into the context, placing the most relevant material at primacy and recency positions. The system reports up to 21.4% RAG performance improvement using 1/4 of the original tokens, and the improvement comes partly from position manipulation, not just compression. [Source](../raw/repos/microsoft-llmlingua.md)

The `rank_method="longllmlingua"` parameter and `reorder_context="sort"` option implement this. The compressor uses a small surrogate model (GPT-2-scale) to score chunk relevance conditioned on the question, then reorders before concatenation.

### Chunk Deduplication and Top-K Reduction

More retrieved documents means more middle space. Reducing top-k from 20 to 5–10 shrinks the window, moves all material closer to the boundaries, and cuts the degradation zone. This trades recall for per-document attention quality. For most production RAG use cases, 5–7 chunks outperform 15–20 on end-to-end accuracy, even when recall metrics suggest the larger set should win.

### Memory Architecture Alternatives

Flat context injection is the architectural condition that makes Lost in the Middle damaging. Systems that avoid loading everything into a single flat window reduce exposure. [Core Memory](../concepts/core-memory.md), [MemGPT](../projects/memgpt.md), and [Letta](../projects/letta.md) treat the context window as a paging space: load specific items on demand rather than dumping all retrieved content at once. [Agent Memory](../concepts/agent-memory.md) systems with typed stores and selective retrieval replace the "stuff everything" pattern with targeted loading.

MEMORY.md-style architectures are particularly vulnerable: an agent that appends all learned facts to a flat file and loads the whole file on each turn will progressively bury older, potentially more important facts in the middle of a growing blob. Stanford research cited in practitioner analysis finds 30%+ degradation on middle-positioned content. A 200-line MEMORY.md almost guarantees the most important learned facts sit at line 87, in the trough. [Source](../raw/articles/gustycube-an-annoyed-computer-scientist-markdown-is-not-memory.md)

### Structural Prompt Layout

For agent harnesses that must assemble long contexts, the mitigation is structural: separate high-priority items (task instructions, verified facts, active constraints) from reference material (retrieved documents, tool outputs), and position the high-priority block at the top of the prompt. Tool outputs and retrieved chunks go below. This keeps instructions in primacy position regardless of how long the reference section grows.

## Who Has Addressed This

[Claude](../projects/claude.md)'s context engineering guidance and [Claude Code](../projects/claude-code.md)'s three-tier memory hierarchy (always-loaded lightweight index, on-demand topic files, search-only transcripts) both reflect awareness of this constraint. The 150-character index entries that always load are precisely sized to stay in primacy without consuming the window.

[LangChain](../projects/langchain.md)'s observation masking in agentic loops hides old tool outputs while keeping tool call metadata visible, preventing context from growing into a middle-heavy blob.

[LLMLingua](../raw/repos/microsoft-llmlingua.md) is the most explicit software response, with LongLLMLingua designed specifically to reorder and compress for position-aware injection.

## Failure Modes That Persist

**Benchmark overfitting.** "Needle in a haystack" tests measure single-item retrieval at specified depths. They do not measure multi-hop reasoning across several middle-positioned documents, which is closer to production reality. Models that ace needle tests still degrade on multi-document synthesis where relevant content is distributed across the middle of long contexts.

**Reranking does not solve position.** A reranker orders documents by relevance but does not control final context position. The highest-relevance document goes first, but if the task requires integrating documents 2–8, those land in the trough regardless of their relevance scores.

**Instruction drift.** In agentic loops with many turns, the original system prompt migrates toward the middle as conversation history grows. Models start following later instructions (closer to the recency position) over earlier ones. This is a form of Lost in the Middle applied to instructions rather than retrieved content.

## Relation to Adjacent Concepts

[Context Compression](../concepts/context-compression.md) addresses the token budget side of the problem. [Context Management](../concepts/context-management.md) addresses the architectural side. [Progressive Disclosure](../concepts/progressive-disclosure.md) addresses load-on-demand strategies. [Semantic Search](../concepts/semantic-search.md) and [Hybrid Search](../concepts/hybrid-search.md) affect which chunks get retrieved, but not their position once retrieved.

Lost in the Middle sits at the intersection of all of these: it is the specific failure that happens when retrieval, compression, and context assembly each work correctly in isolation but produce degraded outcomes because no one managed position.

## What the Research Does Not Settle

The original Liu et al. paper used GPT-3.5 and earlier models. Frontier model behavior has improved on specific benchmarks, but independent validation of the magnitude of improvement under realistic multi-document conditions (not synthetic needle tests) remains sparse. Vendors report internal improvements without publishing the full evaluation methodology.

The interaction between attention mechanism variants (full attention vs. sliding window vs. sparse attention) and positional degradation is underexplored. Models using sliding-window attention have different degradation profiles than full-attention models, but practitioners lack published guidance on which variants are most affected.

Whether instruction-following degradation follows the same positional curve as factual recall degradation is also not clearly established. These may be different mechanisms with different mitigations.


## Related

- [Claude Code](../projects/claude-code.md) — part_of (0.5)
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — part_of (0.6)
- [ReAct](../concepts/react.md) — part_of (0.5)
