---
entity_id: context-compression
type: concept
bucket: context-engineering
abstract: >-
  Context compression reduces tokens fed to LLMs by removing low-information
  content, enabling longer effective context, lower inference costs, and better
  retrieval quality in RAG systems.
sources:
  - repos/helloruru-claude-memory-engine.md
  - repos/microsoft-llmlingua.md
  - repos/thedotmack-claude-mem.md
  - repos/laurian-context-compression-experiments-2508.md
  - deep/repos/microsoft-llmlingua.md
related:
  - rag
  - claude
  - langchain
last_compiled: '2026-04-07T11:51:51.304Z'
---
# Context Compression

## What It Is

Context compression encompasses techniques that reduce the token count of text passed to an LLM while preserving the information needed to answer a query or complete a task. The core problem is that LLMs have finite context windows, charge per token, and degrade in quality when context is too long (the "lost in the middle" phenomenon). Compression addresses all three.

The concept spans several distinct mechanisms: token-level removal (deleting individual tokens judged unimportant), sentence or paragraph filtering (dropping entire spans), extractive compression (pulling only relevant passages), abstractive summarization (paraphrasing into shorter text), and prompt distillation (rewriting instructions more concisely). Each trades different resources: extraction preserves fidelity but requires a model call; summarization reduces tokens more aggressively but can hallucinate; token-level removal is fastest but can corrupt structure.

Context compression is a subcomponent of [Context Engineering](../concepts/context-engineering.md) and the primary mechanism for keeping [Context Windows](../concepts/context-window.md) manageable in production [Retrieval-Augmented Generation](../concepts/rag.md) systems.

---

## Why It Matters

A production RAG system retrieving 10 documents at 2,000 tokens each passes 20,000 tokens to the model before any instruction. At GPT-4 pricing, that's material cost per query. More concretely: if the answer lives in document 3, the model still pays to process documents 1–2 and 4–10. Compression can cut that to the 400 tokens that actually matter.

Three pressure points drive adoption:

**Cost.** Token pricing is linear. At 20x compression (the upper bound LLMLingua claims for favorable inputs), a $0.20 call becomes $0.01. The savings are real; whether 20x is achievable on your data is a different question.

**Quality.** Counterintuitively, shorter context often improves accuracy. When the answer is buried in noise, models sometimes ignore it. LongLLMLingua reported up to 21.4% RAG performance improvement using question-conditioned compression on 25% of the original tokens — though this is self-reported against their own benchmarks. [Source](../raw/repos/microsoft-llmlingua.md)

**Latency.** Fewer tokens means faster prefill and faster generation. For streaming applications, this compounds.

---

## How It Works

### Perplexity-Based Token Removal (LLMLingua)

The most principled approach treats compression as an information-theoretic problem. Tokens that a small language model finds surprising (high cross-entropy loss) carry more information than predictable tokens. Remove the predictable ones.

Microsoft's LLMLingua implements this in `llmlingua/prompt_compressor.py` with a three-tier hierarchy:

1. **Context-level filter** (`control_context_budget()`): Scores entire retrieved documents by mean perplexity. Drops lowest-scoring contexts wholesale to meet a coarse token budget.

2. **Sentence-level filter** (`control_sentence_budget()`): Within surviving contexts, ranks and drops sentences. Uses NLTK's sentence tokenizer, which fails on code, URLs, and abbreviations.

3. **Token-level filter** (`iterative_compress_prompt()`): Processes text in 200-token windows, computing per-token cross-entropy loss via `get_ppl()`, and drops tokens below a dynamic threshold. The window size means importance is evaluated locally, not globally — a globally important token in a low-salience local window can get dropped.

The scoring model (default: Llama-2-7B) runs inference to compute perplexity. This adds latency and requires GPU memory, though quantized models reduce the cost.

**Question-conditioned compression (LongLLMLingua)** extends this by computing perplexity conditional on the user query. Tokens that become more surprising in the presence of the question are query-relevant; tokens that stay predictable regardless of the question can be removed. This is the mechanism behind the RAG quality improvements. [Source](../raw/deep/repos/microsoft-llmlingua.md)

### Trained Token Classification (LLMLingua-2)

Rather than computing perplexity at inference time, LLMLingua-2 trains an XLM-RoBERTa-large model to directly predict binary keep/drop labels per token. GPT-4 generates training labels by compressing MeetingBank transcripts and other datasets.

The result: 3–6x faster compression with better out-of-domain generalization than the perplexity approach. The tradeoff is that it requires task-specific training data and a fixed context window (RoBERTa's 512 tokens), which forces chunking at sentence boundaries via `__chunk_context()`. [Source](../raw/deep/repos/microsoft-llmlingua.md)

### Extractive LLM Compression

A simpler and often more reliable approach: pass the document and query to an LLM, ask it to return only the relevant spans verbatim. LangChain's `LLMChainExtractor` uses this pattern. The prompt instructs the model to copy text exactly ("NO_OUTPUT" if nothing is relevant), avoiding paraphrase.

This is the approach used in the context-compression-experiments case study, which compressed documents for an internal RAG system. The baseline prompt worked well with GPT-4 but produced empty outputs with GPT-4o-mini. Key finding: **prompt optimization via DSPy GEPA (genetic algorithm) improved GPT-4o-mini success from 0% to 62% on the same compression task; TextGrad optimization reached 79%; the hybrid (GEPA prompt then TextGrad refinement) reached 100%** on the 296-document test set. These numbers are self-reported from a single production deployment and should be treated as directional, not universal. [Source](../raw/repos/laurian-context-compression-experiments-2508.md)

### Session-Level Compression

For agentic systems that accumulate context across a long session, compression runs on conversation history rather than retrieved documents. Claude-mem (44,950 stars, though rapid accumulation suggests some social amplification) implements this via Claude Code lifecycle hooks: at `pre-compact` (before Claude's built-in context compression fires), `mid-session-checkpoint` (every 20 messages), and `session-end`. Each checkpoint calls the Claude API to summarize what happened and stores it in SQLite with ChromaDB for semantic retrieval. [Source](../raw/repos/thedotmack-claude-mem.md)

The claude-memory-engine project takes a simpler approach: markdown files, no database, zero dependencies. It tracks mistake-fix pairs explicitly — when the model makes an error and the user corrects it, the pair gets logged. Before each new task, the model reviews its error notebook. This is shallow compared to true continual learning but avoids the costs of gradient-based approaches, and the files remain human-readable. [Source](../raw/repos/helloruru-claude-memory-engine.md)

---

## Implementations

| Approach | Tool | Mechanism | Speed |
|---|---|---|---|
| Perplexity token removal | LLMLingua v1 | 7B LM scoring | Slow |
| Trained classifier | LLMLingua-2 | RoBERTa token classification | 3–6x faster |
| LLM extraction | LangChain LLMChainExtractor | Prompted GPT call | API-bound |
| Session summarization | Claude-mem, claude-memory-engine | LLM summary + storage | Per-session overhead |
| Prompt optimization | DSPy GEPA, TextGrad | Genetic / gradient prompt search | Offline; amortized |

[LangChain](../projects/langchain.md) and [LlamaIndex](../projects/llamaindex.md) both integrate LLMLingua as a node postprocessor — retrieve documents, compress them, pass compressed context to the generation LLM. [DSPy](../projects/dspy.md)'s [GEPA optimizer](../concepts/gepa.md) can optimize the compression prompt itself rather than just the compression ratio.

---

## Strengths

**Cost reduction at scale.** For high-volume RAG systems, even 3x compression on retrieved context translates to real savings. The reduction compounds: shorter context also produces shorter generations.

**Quality improvement in long-context scenarios.** Models with 10+ retrieved documents often perform worse than models with 2–3 relevant documents. Compression that drops irrelevant documents improves signal-to-noise.

**Modularity.** Compression sits between retrieval and generation. It requires no changes to the retrieval index, the embedding model, or the generation model. It can be added to or removed from a pipeline independently.

---

## Limitations

### Concrete Failure Mode: Structured Data Corruption

Token-level compression breaks structured content. JSON objects, code, and tables have tokens that carry no semantic weight (brackets, commas, indentation) but are syntactically load-bearing. Removing `}` from a JSON object makes it unparseable. LLMLingua's `compress_json()` method attempts to handle this, but general structured data handling is fragile. The `force_tokens` parameter in LLMLingua-2 lets you pin specific tokens (e.g., `\n`, `?`) — useful but requires knowing which tokens matter in advance.

### Unspoken Infrastructure Assumption

Token-level compression with LLMLingua assumes you can run a 7B parameter model (or load a RoBERTa-large classifier) alongside your serving infrastructure. This is a substantial memory requirement. In CPU-only environments, compression becomes slower than just passing the full context. LLMLingua-2's smaller model helps, but you're still running two models per request.

---

## When NOT to Use It

**Short, stable documents.** If your knowledge base consists of 200-word entries, compression adds latency without meaningful savings. The overhead of the scoring model exceeds the benefit.

**Structured data sources.** Code repositories, database schemas, configuration files, and API specs are fragile under token-level compression. Use extractive approaches (asking the LLM to return relevant sections) rather than perplexity-based removal.

**Single-document queries.** Context compression is most valuable when retrieving many documents. If your RAG system reliably retrieves one or two relevant passages, compression doesn't help much and risks dropping the answer.

**Latency-critical paths.** Adding a compression model call increases P50 and P99 latency. For interactive applications where the user waits, the tradeoff may not hold. Session compression that runs asynchronously (as in claude-mem) sidesteps this.

**Small model downstream.** If the target LLM is already a small model, the compression model may be comparable in size or capability. The information loss from compression may hurt more than the context reduction helps.

---

## Unresolved Questions

**Optimal compression rate for a given task.** The LLMLingua literature reports accuracy vs. compression tradeoffs, but these are aggregate benchmarks. For a specific domain and query distribution, the right rate is unknown without measurement. The experiments cited above (0% → 62% → 79% → 100% with different prompts) suggest that prompt quality matters as much as compression rate — and optimal prompts are domain-specific.

**Interaction with retrieval scoring.** Compression and retrieval are often tuned independently. A high-BM25-score document that compresses poorly (because it's structured) may end up providing less useful context than a medium-score document that compresses cleanly. No standard framework coordinates these decisions.

**Cost accounting across the pipeline.** Compression adds a model call. The net cost depends on whether the savings in the target LLM call exceed the compression call cost. For cheap small models as compressors against expensive large models as generators, this works. For GPT-4o-mini compressing for GPT-4o-mini, the math is less clear.

**Faithfulness vs. coverage.** Extractive compression ("copy text verbatim") is faithful but may miss relevant content phrased differently from the query. Abstractive compression has better coverage but can introduce errors. No benchmark cleanly measures both dimensions simultaneously.

---

## Alternatives and Selection Guidance

**[Hybrid Search](../concepts/hybrid-search.md)**: Better retrieval precision reduces how much context needs compression. If you retrieve only one truly relevant document instead of ten mediocre ones, compression becomes less necessary. Use hybrid search first; add compression if token budgets remain tight.

**[Progressive Disclosure](../concepts/progressive-disclosure.md)**: Rather than compressing everything upfront, serve context in layers — summaries first, details on demand. Avoids compression artifacts while keeping initial context short.

**[GraphRAG](../concepts/graphrag.md)**: For knowledge bases where relationships matter, graph-based retrieval can return structured summaries rather than raw documents. This sidesteps compression by changing what gets retrieved.

**[Agentic RAG](../concepts/agentic-rag.md)**: An agent that iteratively retrieves and reasons can avoid loading all documents simultaneously. More expensive in LLM calls, but avoids compression quality tradeoffs.

**Use LLMLingua-2 when** you have training data for your domain and need fast, repeatable compression at scale.  
**Use extractive LLM compression when** fidelity matters more than speed and you can afford the generation call.  
**Use prompt optimization (GEPA/TextGrad) when** your compression prompt fails on a specific model tier and you have labeled examples of failures.  
**Use session summarization when** the context problem is conversation length rather than retrieved document length.

---

## Key Numbers

- LLMLingua claims up to 20x compression with "minimal performance loss" (self-reported, EMNLP 2023 / ACL 2024). [Source](../raw/repos/microsoft-llmlingua.md)
- LLMLingua-2 is 3–6x faster than LLMLingua v1 (self-reported, ACL 2024 Findings).
- LongLLMLingua reported up to 21.4% RAG performance improvement at 25% token usage (self-reported).
- Production experiment: extractive compression prompt optimized via GEPA + TextGrad went from 0% to 100% success rate on GPT-4o-mini across 296 documents (single deployment, not independently validated). [Source](../raw/repos/laurian-context-compression-experiments-2508.md)
- LLMLingua: 5,985 GitHub stars, MIT license. [Source](../raw/repos/microsoft-llmlingua.md)

---

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md) — parent concept
- [Context Window](../concepts/context-window.md) — what compression manages
- [Retrieval-Augmented Generation](../concepts/rag.md) — primary use case
- [Agentic RAG](../concepts/agentic-rag.md) — alternative to compression
- [Progressive Disclosure](../concepts/progressive-disclosure.md) — layered alternative
- [Hybrid Search](../concepts/hybrid-search.md) — upstream complement
- [GEPA](../concepts/gepa.md) — prompt optimization for compression tasks
- [Agent Memory](../concepts/agent-memory.md) — session compression targets
- [Episodic Memory](../concepts/episodic-memory.md) — what session compression preserves
- [DSPy](../projects/dspy.md) — optimization framework used for compression prompt tuning
- [LangChain](../projects/langchain.md) — integrates LLMLingua as retriever postprocessor
