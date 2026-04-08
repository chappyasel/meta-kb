---
entity_id: context-compression
type: concept
bucket: context-engineering
abstract: >-
  Context compression reduces token count of prompts/context while preserving
  task-relevant information, using perplexity scoring, trained classifiers, or
  summarization; key differentiator is that it enables RAG and long-context
  workloads to fit cheaper/faster models at lower cost.
sources:
  - repos/helloruru-claude-memory-engine.md
  - repos/microsoft-llmlingua.md
  - repos/thedotmack-claude-mem.md
  - repos/laurian-context-compression-experiments-2508.md
  - deep/repos/microsoft-llmlingua.md
related:
  - context-management
  - claude-code
  - retrieval-augmented-generation
  - anthropic
  - context-management
last_compiled: '2026-04-08T02:55:36.157Z'
---
# Context Compression

## What It Is

Context compression refers to techniques that reduce the token length of context fed to a language model while keeping enough information for the model to complete its task. The motivation is direct: LLM inference costs scale with token count, context windows are finite, and the [Lost in the Middle](../concepts/lost-in-the-middle.md) phenomenon means more tokens do not monotonically improve quality. Compression addresses all three.

Compression operates on several distinct objects:

- **Prompts**: system instructions, few-shot examples, retrieved documents
- **Conversation history**: prior turns in a multi-turn session
- **Retrieved passages**: chunks returned by a [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) pipeline before they reach the model
- **KV caches**: intermediate attention state in long-context inference (a related but distinct problem)

The field distinguishes between *lossy* compression (information is discarded; acceptable when the discarded content is irrelevant to the query) and *lossless* compression (structural reformatting, deduplication, whitespace removal; preserves all content). Most practical systems use lossy compression with a relevance signal to decide what to discard.

## Why It Matters

A [RAG](../concepts/retrieval-augmented-generation.md) pipeline might retrieve ten documents, each 2,000 tokens. Feeding all 20,000 tokens to GPT-4o costs roughly $0.10 per query; compressing to 4,000 tokens reduces that to $0.02 and cuts latency. At scale — thousands of queries per day — the cost difference is substantial.

Beyond cost, compression can *improve* answer quality. A model given 20,000 tokens of loosely relevant context often performs worse than one given 3,000 tokens of tightly relevant excerpts. Noise suppresses signal. LongLLMLingua reported up to 21.4% RAG performance improvement at 1/4 of the original token count — though this is self-reported by Microsoft Research and the improvement depends heavily on baseline retrieval quality.

For agent systems with long sessions, compression is also how you manage [Context Management](../concepts/context-management.md) without discarding conversation history entirely. A session that accumulates 50,000 tokens of tool calls, outputs, and intermediate reasoning needs a way to fit in a 128k context window across multiple turns.

## Core Mechanisms

### Perplexity-Based Token Filtering (LLMLingua)

The foundational insight from [Microsoft's LLMLingua](https://aclanthology.org/2023.emnlp-main.825/) (EMNLP 2023): run a small language model over the prompt and compute per-token cross-entropy loss (perplexity). Tokens with low perplexity are predictable given their context — the model could reconstruct them. High-perplexity tokens carry information. Remove the predictable ones.

LLMLingua implements this through a three-tier filter in `llmlingua/prompt_compressor.py`:

1. **Context-level**: rank entire retrieved documents by mean perplexity; drop the least informative ones entirely
2. **Sentence-level**: within surviving documents, rank and drop low-perplexity sentences
3. **Token-level**: within surviving sentences, remove low-perplexity individual tokens via `iterative_compress_prompt()`

The `get_ppl()` method does the actual work: it runs the scoring model (default `NousResearch/Llama-2-7b-hf`) with KV-cache enabled, computes cross-entropy loss per position, and optionally conditions the loss on the question (`condition_in_question` parameter). LongLLMLingua extends this by computing perplexity *conditioned on the question*, so tokens that are informative relative to the specific query get higher scores.

The compression rate target (`rate` parameter) sets the ratio of compressed to original tokens. Actual achieved rates can differ due to tokenizer mismatch: the scoring model uses its own tokenizer, but the system reports token counts using GPT-3.5's tiktoken tokenizer.

Reported performance: up to 20x compression with "minimal performance loss" on benchmarks including MeetingBank QA, LongBench, GSM8K, and BBH. These are self-reported by the authors; independent reproduction shows task-dependent variance.

### Trained Token Classification (LLMLingua-2)

LLMLingua-2 (ACL 2024 Findings) replaces perplexity scoring with a trained binary classifier. A RoBERTa-based token classification model (`microsoft/llmlingua-2-xlm-roberta-large-meetingbank`) predicts keep/drop for each token directly. Training data comes from GPT-4 labels on MeetingBank transcripts and other corpora — a knowledge distillation setup.

This changes the tradeoff profile: the model is 3-6x faster than LLMLingua v1 (smaller model, no sliding-window perplexity computation), but requires training data and generalizes less well to out-of-domain inputs. The `compress_prompt_llmlingua2()` method in `PromptCompressor` handles this path; initialization via `use_llmlingua2=True` loads the classification model instead of a causal LM.

The `force_tokens` parameter in LLMLingua-2 addresses structural data: tokens you name explicitly (newlines, brackets, commas) get mapped to special `[NEWi]` tokens before classification and restored after, preventing deletion of syntactically necessary elements. This is a workaround, not a solution — it requires knowing in advance which tokens are load-bearing.

### Extractive Compression (LLMChainExtractor pattern)

A simpler approach: prompt an LLM with the retrieved document and the query, and ask it to extract only the passages relevant to the query. The [LangChain LLMChainExtractor](../projects/langchain.md) uses this pattern. The prompt instructs the model to copy text verbatim rather than paraphrase, then output `NO_OUTPUT` if nothing is relevant.

This approach is highly accurate when the extraction model is capable (GPT-4o), but degrades significantly on smaller/cheaper models. Practical experiments ([Source](../raw/repos/laurian-context-compression-experiments-2508.md)) with a production RAG system showed gpt-4o-mini producing `NO_OUTPUT` on cases where gpt-4o extracted successfully. The fix — optimizing the extraction prompt using [DSPy](../projects/dspy.md) GEPA (genetic-pareto optimization) and TextGrad (gradient-based prompt tuning) — recovered substantial performance on the cheaper model:

- Original prompt on gpt-4o-mini: 0% success rate (296 failure cases)
- GEPA-optimized prompt on gpt-4o-mini: ~62% success rate
- TextGrad-optimized prompt: ~79% success rate
- Hybrid GEPA→TextGrad pipeline: ~100% success rate (extracting something vs. nothing)

The key finding: prompt optimization is a viable alternative to model upgrading for compression tasks. GEPA runs for roughly 75 iterations over a validation set; TextGrad runs textual gradient descent over ~8 iterations. Both optimize the extraction prompt rather than the model weights.

### Summarization-Based Compression

Instead of extracting verbatim spans, generate a compressed summary. Used in conversational memory systems like [Mem0](../projects/mem0.md), [Letta](../projects/letta.md)/[MemGPT](../projects/memgpt.md), and [claude-mem](../projects/claude-code.md). The summarization model reads accumulated context and produces a condensed version that preserves the facts and decisions while discarding the verbosity.

[claude-mem](../raw/repos/thedotmack-claude-mem.md) implements this pattern with Claude lifecycle hooks: on `pre-compact` (triggered before context compression), the system saves a session snapshot and runs pitfall detection; on `mid-session-checkpoint` (every 20 messages), it saves a compressed summary. On next session start, the compressed summary reloads instead of the full history.

The risk with summarization: paraphrase introduces interpretation. A verbatim extraction of "the deployment failed due to a race condition in the cache invalidation logic" is unambiguous; a summary of "there was a deployment issue" loses the diagnostic specificity an agent needs to avoid repeating the error.

## Implementation Patterns

**Structured compression**: LLMLingua supports `<llmlingua rate=0.3 compress=True>...</llmlingua>` XML tags inline in prompts. Sections marked `compress=False` pass through untouched; sections marked with a rate get per-section compression. Useful when prompts mix fixed instructions (don't compress) with variable retrieved content (compress aggressively).

**Progressive disclosure**: Rather than compressing everything upfront, retrieve compressed summaries first and expand to full text only for items the agent selects. [claude-mem](../raw/repos/thedotmack-claude-mem.md) implements a three-layer MCP workflow: `search` returns a compact index (~50-100 tokens/result), `timeline` adds chronological context, `get_observations` fetches full detail only for filtered IDs. Claimed ~10x token savings vs. loading all observations at query time. This is the [Progressive Disclosure](../concepts/progressive-disclosure.md) pattern applied to memory retrieval.

**Compression as RAG postprocessing**: The standard integration point is after retrieval, before the LLM call. Retrieve k documents, compress each against the query, concatenate compressed results. LLMLingua integrates with [LangChain](../projects/langchain.md) and [LlamaIndex](../projects/llamaindex.md) as a node postprocessor in this position.

## Failure Modes

**Structured data corruption**: Token-level compression destroys JSON, code, and tables. Removing a comma from a JSON array produces invalid syntax. The `force_tokens` mechanism in LLMLingua-2 mitigates this for known delimiters, but you must enumerate them. Code compression is particularly risky — perplexity-based scoring has no concept of syntactic validity.

**Cross-context information loss**: LLMLingua's context-level filter drops entire documents. If the answer spans two documents and one gets dropped, no downstream recovery is possible. The `force_context_ids` parameter overrides this, but requires knowing which documents matter before compression — which defeats part of the purpose.

**Query-agnostic compression**: LLMLingua v1's default mode computes perplexity without conditioning on the query. The compressed prompt may discard tokens that are low-perplexity in isolation but critical given the specific question. LongLLMLingua's `condition_in_question="after_condition"` flag addresses this but requires the question to be known at compression time — not always true in multi-turn conversations.

**Model dependency**: LLMLingua-2 models are trained on MeetingBank data. Performance on code, legal documents, or technical specifications is untested and likely worse than on the training domain.

**Summarization hallucination**: Summarization-based compression can introduce facts not present in the original. An agent relying on compressed session memory may act on plausible-sounding but fabricated context. Extractive methods avoid this; abstractive summarization does not.

## When Not to Use Context Compression

Skip compression when:

- **The task is sensitive to exact wording**: Legal, medical, or compliance contexts where paraphrase changes meaning. Stick to verbatim retrieval or use extractive methods with `compress=False` on critical sections.
- **Context is already small**: Compressing a 1,000-token prompt is rarely worth the added latency and risk of information loss.
- **Structured data dominates**: If your context is primarily JSON, code, or tabular data, token-level compression is more likely to corrupt than help. Handle structured data with schema-aware selection instead.
- **The scoring model is slow and the target model is cheap**: Loading a 7B parameter scoring model to save tokens on a model priced at $0.0001/1k tokens inverts the cost calculus.
- **Multi-hop reasoning is required**: If the answer requires reasoning across multiple retrieved passages in sequence, aggressive context-level filtering may drop intermediate reasoning steps. [HotpotQA](../projects/hotpotqa.md)-style tasks are particularly vulnerable.

## Unresolved Questions

- **Verification of independence claims**: Most benchmark results for LLMLingua and LongLLMLingua come from the original authors. Independent reproduction across diverse domains and task types is limited.
- **Compression + fine-tuned models**: LLMLingua-2 is trained on GPT-4 compression labels. If the target LLM has different attention patterns (fine-tuned, quantized), the compression model's token importance scores may not transfer.
- **Optimal compression rate selection**: The `rate` parameter requires manual tuning per task type. There is no principled automatic method for choosing it given a query and document. Setting it too aggressively loses information; too conservatively wastes the optimization.
- **Interaction with long-context models**: As native context windows grow (1M tokens in Gemini), the cost/quality tradeoff for compression shifts. At some window size, the [Lost in the Middle](../concepts/lost-in-the-middle.md) problem dominates cost savings, and compression is net negative.

## Alternatives

| Method | When to Choose |
|---|---|
| **Chunking + top-k retrieval** | Query is precise; retrieved chunks are already small. Avoid compression overhead entirely. |
| **[RAPTOR](../projects/raptor.md) hierarchical summarization** | Need multi-granularity retrieval; willing to precompute summaries at index time. |
| **[GraphRAG](../projects/graphrag.md) entity graphs** | Context is relationship-dense; need to navigate entity connections rather than compress text. |
| **Native long-context models** | Budget permits; task requires reasoning across the full context without selective attention. |
| **[Progressive Disclosure](../concepts/progressive-disclosure.md)** | Agent can query for detail on demand; compression latency is acceptable upfront but per-turn retrieval is better. |
| **[Semantic Search](../concepts/semantic-search.md) + reranking** | The compression problem is actually a retrieval problem — you're compressing because you retrieved too much. Improve retrieval precision instead. |

## Related Concepts

- [Context Management](../concepts/context-management.md): broader strategies for what enters and exits context
- [Context Engineering](../concepts/context-engineering.md): the design discipline of which information to provide, when
- [Lost in the Middle](../concepts/lost-in-the-middle.md): why more context degrades performance, motivating compression
- [Progressive Disclosure](../concepts/progressive-disclosure.md): retrieval pattern that defers full context until needed
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md): primary production context for compression
- [Prompt Optimization](../concepts/prompt-optimization.md): DSPy GEPA and TextGrad approaches to improving extraction prompts
- [Short-Term Memory](../concepts/short-term-memory.md): in-context storage that compression directly manages
