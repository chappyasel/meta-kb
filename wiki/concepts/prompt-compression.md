---
entity_id: prompt-compression
type: concept
bucket: context-engineering
abstract: >-
  Prompt compression reduces token count in LLM inputs while preserving semantic
  content, using perplexity scoring, trained token classifiers, or
  gradient-optimized prompts to lower inference cost and extend effective
  context windows.
sources:
  - repos/aiming-lab-simplemem.md
  - repos/microsoft-llmlingua.md
  - repos/ayanami1314-swe-pruner.md
  - repos/martian-engineering-lossless-claw.md
  - repos/laurian-context-compression-experiments-2508.md
  - deep/repos/microsoft-llmlingua.md
  - deep/repos/martian-engineering-lossless-claw.md
related: []
last_compiled: '2026-04-06T02:12:58.677Z'
---
# Prompt Compression

## What It Is

Prompt compression removes tokens from LLM inputs that carry little information, reducing cost and latency without changing the answer the model produces. A 10,000-token RAG context might compress to 1,000 tokens with the model answering the question just as accurately — or more accurately, because irrelevant tokens no longer distract attention.

The core observation is information-theoretic: tokens that are predictable given surrounding context carry less information than surprising tokens. A language model's cross-entropy loss on a token is a proxy for how much information that token contributes. Low-loss tokens are candidates for removal.

Prompt compression sits within [Context Engineering](../concepts/context-engineering.md) as one of several strategies for managing the token budget — alongside [Progressive Disclosure](../concepts/progressive-disclosure.md), chunking strategies, and [Retrieval-Augmented Generation](../concepts/rag.md) designs that retrieve less content to begin with.

## Why It Matters

Three pressures make prompt compression practically relevant:

**Cost**: GPT-4-class models charge per input token. A RAG pipeline that retrieves 20 documents per query, each 500 tokens, spends 10,000 tokens on context alone. At scale, compressing to 2,000 tokens cuts that cost by 80%.

**Context window saturation**: Even with 128K or 1M token windows, filling them hurts performance. Models lose focus on relevant content when buried in irrelevant material — the "lost in the middle" problem documented in the LongLLMLingua research. Compression concentrates signal.

**Latency**: Time-to-first-token scales with input length. Compressed prompts produce faster responses, which matters for interactive agents.

## How It Works

Three distinct technical approaches have emerged, each with different tradeoffs.

### Perplexity-Based Token Filtering (LLMLingua v1, LongLLMLingua)

[Source](../raw/deep/repos/microsoft-llmlingua.md)

Microsoft's LLMLingua uses a small language model (default: Llama-2-7B) to score each token's cross-entropy loss, then removes low-loss tokens. The architecture is a three-tier cascade:

1. **Context-level filter** (`control_context_budget()`): Ranks entire retrieved passages by mean perplexity and drops the least informative ones first. A passage with low average surprisal is probably generic or redundant.

2. **Sentence-level filter** (`control_sentence_budget()`): Within surviving passages, ranks sentences by perplexity and removes the weakest. Configurable to preserve first/last sentences for structural coherence.

3. **Token-level filter** (`iterative_compress_prompt()`): Processes tokens in 200-token windows, computes per-token cross-entropy via `get_ppl()` with KV-cache, and removes tokens below a dynamic threshold.

LongLLMLingua adds question conditioning: perplexity is computed with the question as context, so the model keeps tokens that are informative *relative to the question* rather than informative in the abstract. This is controlled by `condition_in_question="after_condition"` and improves RAG recall on long documents by up to 21.4% (self-reported, ACL 2024).

The key method, `get_ppl()`, runs the scoring model with `past_key_values` KV-cache enabled, computes cross-entropy per position, and optionally splits at a `condition_pos_id` for question-conditioned scoring.

### Trained Token Classification (LLMLingua-2)

LLMLingua-2 replaces the causal language model with a token classification model (XLM-RoBERTa-large, ~350M parameters) trained to output a binary keep/drop label per token.

Training data comes from GPT-4: GPT-4 compresses documents from MeetingBank, GSM8K, and BBH, producing word-level keep/drop labels. These labels train the RoBERTa classifier. This is knowledge distillation: a small classifier learns GPT-4's compression judgment.

At inference, the method (`compress_prompt_llmlingua2()`) runs:
1. Split context into chunks at sentence boundaries, respecting the 512-token BERT limit
2. Run each chunk through the classifier to get per-token keep probabilities
3. Aggregate subword token probabilities to word level (mean by default)
4. Threshold at the target rate to produce binary keep/drop decisions
5. Optionally filter entire passages by mean keep probability before token-level work

LLMLingua-2 is 3x-6x faster than v1 (smaller model, no autoregressive generation) but requires training data, so it's less accurate on out-of-domain text. The `force_tokens` mechanism handles structural tokens like `\n` and `?` that should always be preserved regardless of score.

### Gradient-Based Prompt Optimization (TextGrad / DSPy GEPA)

[Source](../raw/repos/laurian-context-compression-experiments-2508.md)

A third approach treats the compression *instructions* — not the compressed text — as the optimization target. Rather than building a general compressor, you optimize the prompt that tells a model how to compress for your specific domain.

One production case: a RAG pipeline using GPT-4o with a hand-written extraction prompt worked well, but fell back to GPT-4o-mini under rate limits, where the original prompt failed (0% extraction success on a 296-document test set). The same documents succeeded with GPT-4o.

Two optimizer pipelines were applied:

- **DSPy GEPA** (genetic algorithm): Evolves prompt variants over generations, selecting survivors on validation accuracy. After 75 iterations (~1 hour), validation accuracy improved from 32% to 45%, and test success on the 296-document set reached 62%.

- **TextGrad**: Computes "text gradients" — natural language feedback from a stronger model describing how the prompt should change — and applies them iteratively. Starting from the original prompt, TextGrad reached 79% extraction success.

- **Hybrid (GEPA → TextGrad)**: Running TextGrad to refine the GEPA-optimized output reached 100% extraction success on the 296-document set.

Note: 100% here means "extracted something rather than outputting NO_OUTPUT" — coverage quality (how well the extracted content matches GPT-4's output) was measured separately via sentence-level semantic similarity. The coverage map in the source shows substantial overlap between the optimized GPT-4o-mini output and the GPT-4o baseline, but not perfect agreement.

### Hierarchical Summarization (LCM / lossless-claw)

[Source](../raw/deep/repos/martian-engineering-lossless-claw.md)

A fourth approach abandons token removal in favor of abstractive compression organized into a DAG. Lossless-claw (an OpenClaw plugin implementing the LCM architecture) persists every message in SQLite, then summarizes chunks into leaf nodes and condenses leaf nodes into higher-depth summaries. Each depth level represents a progressively more abstract view.

This is less about prompt compression in the traditional sense and more about managing conversation history over sessions that exceed any context window. At depth 0, a summary represents ~20K tokens of raw messages. At depth 2, a summary might represent an entire day's session in 2,000 tokens. The model can expand any summary back to source via the `lcm_expand_query` tool.

The compression mechanism uses a three-level escalation: normal summarization prompt → aggressive prompt requesting only durable facts → deterministic 512-token truncation as fallback. This guarantees compaction always makes progress even when the LLM produces poor output.

Volt (Martian Engineering's coding agent using LCM) outperforms Claude Code on the OOLONG benchmark at 256K context (+10.0) and 512K context (+12.6), using the same base model. (Self-reported from Martian Engineering; independently validated benchmarking not confirmed.)

## Key Design Tradeoffs

**Perplexity scoring model size**: LLMLingua v1 uses a 7B model, accurate but slow and memory-intensive. LLMLingua-2 uses ~350M parameters, 3-6x faster, but loses accuracy outside its training distribution (MeetingBank, GSM8K, BBH domains).

**Zero-shot vs. trained**: Perplexity-based methods work immediately on any domain. Trained classifiers and optimized prompts require domain-representative training data or a sample of production failures.

**Extractive vs. abstractive**: Token removal (LLMLingua) preserves exact text but can produce grammatically broken output. Summarization (LCM) produces fluent output but introduces paraphrase and potential factual drift.

**Global vs. local scoring**: LLMLingua v1 processes tokens in 200-token windows, so a token's importance is judged relative to its local neighbors, not the full document. A token that looks redundant locally might be globally critical.

**Compression rate targeting**: The `rate` parameter sets a target compression ratio, but actual ratio depends on tokenizer differences between the scoring model and the target model. LLMLingua reports token counts using tiktoken (GPT pricing units) while compressing with Llama tokenization — the numbers may not match.

## Failure Modes

**Structured data corruption**: JSON, code, and tables contain syntactically necessary tokens that score as low-perplexity. A closing bracket is entirely predictable, so the model may remove it, breaking the structure. LLMLingua includes a `compress_json()` method and a `force_tokens` list for known delimiters, but general structured data handling is fragile.

**Domain mismatch for trained classifiers**: LLMLingua-2 trained on MeetingBank transcripts performs well on conversational text and math word problems. Applied to domain-specific technical documentation, code, or legal text, compression quality degrades without retraining.

**Cheap model recall failures**: As the production case above demonstrates, a compression prompt that works with GPT-4o may fail with GPT-4o-mini on the same inputs. The semantic signal that a weaker model misses is exactly the signal compression depends on. This failure mode is invisible in development if you test only with the strong model.

**Retrieval formatting bugs** (DAG-based systems): Lossless-claw's production experience surfaced a class of bugs where content stored correctly in the database became inaccessible after passing through multiple formatting normalization layers. Storage correctness and retrieval correctness are separate properties that require separate testing.

**Over-compression of context needed for multi-hop reasoning**: If answering a question requires combining information from two passages, compressing either passage independently may remove the token that creates the connection. Question-conditioned compression (LongLLMLingua) mitigates this, but doesn't eliminate it.

## Benchmarks

Published numbers:

- LLMLingua: up to 20x compression with "minimal performance loss" on RAG QA tasks. (Self-reported, EMNLP 2023.)
- LongLLMLingua: up to 21.4% improvement in RAG performance at 1/4 token count. (Self-reported, ACL 2024.)
- LLMLingua-2: 3x-6x speedup over v1, maintained accuracy on MeetingBank/LongBench. (Self-reported, ACL Findings 2024.)
- DSPy GEPA + TextGrad hybrid: 0% → 100% extraction success on 296-document test set for GPT-4o-mini. (Self-reported, single production case, small sample.)
- Volt/LCM vs. Claude Code on OOLONG: +4.5 average, +10.0 at 256K context, +12.6 at 512K context. (Self-reported by Martian Engineering.)

All benchmarks above are self-reported by the publishing teams. No independent third-party replication was found in the source material.

## When to Use Each Approach

**Use perplexity-based compression (LLMLingua v1)** for general-purpose contexts where you cannot collect training data and the domain is unpredictable. Expect 3-10x compression at moderate accuracy cost, with latency overhead from the 7B scoring model.

**Use LLMLingua-2** for high-throughput pipelines in domains similar to its training data (conversational, QA, math reasoning). The 3-6x speed advantage over v1 matters at scale. Budget for accuracy degradation on technical or domain-specific content.

**Use gradient-optimized compression prompts (TextGrad/GEPA)** when you have production failure traces — a corpus of (document, query) pairs where your current prompt fails and a stronger model succeeds. The hybrid GEPA → TextGrad approach maximizes success rate on the training distribution, but may not generalize beyond it.

**Use hierarchical summarization (LCM-style)** for long-running agent sessions, not single-query RAG. The overhead of maintaining a SQLite DAG and running summarization LLM calls is unjustified for a pipeline that processes each document once. It pays off when an agent needs to reason over its entire interaction history across thousands of turns.

## When Not to Use Prompt Compression

- When your prompt is primarily code or structured data: token removal corrupts syntax. Use a dedicated code summarizer or structural chunking instead.
- When your compressed output feeds into downstream retrieval or semantic matching: removing tokens changes embedding representations, breaking similarity scores.
- When latency matters more than cost at small scale: loading a 7B scoring model adds 2-5 seconds of startup time and hundreds of milliseconds per compression call. At low query volumes, skipping compression and paying token costs is faster.
- When accuracy is safety-critical and you cannot validate compression quality on your specific domain.

## Integration Points

LLMLingua integrates directly with [LangChain](../projects/langchain.md) (as a retriever post-processor) and [LlamaIndex](../projects/llamaindex.md) (as a node post-processor). The standard pattern: retrieve documents, pass through `PromptCompressor.compress_prompt()`, send compressed context to the target LLM.

The `structured_compress_prompt()` method supports `<llmlingua rate=0.3 compress=True>...</llmlingua>` XML tags inline in the prompt, allowing per-section compression rates. Instructions can be excluded from compression entirely while retrieved passages are compressed aggressively.

[DSPy](../projects/dspy.md)'s GEPA optimizer provides a production-grade interface for gradient-free prompt optimization when direct gradient access is unavailable. TextGrad provides a gradient-based alternative when a differentiable feedback signal is available.

## Unresolved Questions

- What is the accuracy cost of compression when the model must perform multi-hop reasoning across compressed passages? The LongLLMLingua question-conditioning helps, but no benchmark covers chains requiring three or more cross-document inferences.
- How does compression interact with [Chain-of-Thought](../concepts/chain-of-thought.md) prompting? Removing reasoning scaffold tokens likely hurts more than removing context tokens.
- What fraction of LLMLingua-2's accuracy improvement is due to the training data versus the classification architecture? The distillation dataset uses GPT-4 labels on MeetingBank; performance on out-of-domain data without retraining is underreported.
- For the gradient-optimized prompts, how stable is the 100% success rate across document distributions beyond the 296-document training set? The coverage map suggests the optimized prompt extracts something from every document but does not establish that the extraction matches GPT-4's output.
