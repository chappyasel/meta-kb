---
entity_id: context-compression
type: concept
bucket: context-engineering
abstract: >-
  Context compression reduces token usage by removing low-information content
  before LLM inference, using perplexity scoring, trained classifiers, or
  learned self-compression to cut costs and extend effective context capacity.
sources:
  - deep/repos/microsoft-llmlingua.md
  - repos/helloruru-claude-memory-engine.md
  - repos/laurian-context-compression-experiments-2508.md
  - repos/microsoft-llmlingua.md
  - repos/thedotmack-claude-mem.md
  - tweets/dimitrispapail-memento-teaching-llms-to-manage-their-own-context.md
related:
  - context-management
  - retrieval-augmented-generation
  - anthropic
  - claude-code
last_compiled: '2026-04-08T23:12:56.228Z'
---
# Context Compression

Context compression covers techniques that reduce the token footprint of inputs to LLMs while preserving enough information for the model to produce correct outputs. The core tradeoff: fewer tokens mean lower cost, lower latency, and more room for other content, but aggressive compression risks dropping tokens that turn out to matter.

## Why It Matters

Token limits create hard ceilings on what an agent can attend to simultaneously. A 128K-token window sounds generous until you account for a full codebase, retrieved documents, tool outputs, and a multi-turn conversation history. Beyond hitting the ceiling, there is also a softer problem: the [Lost in the Middle](../concepts/lost-in-the-middle.md) phenomenon, where models weight tokens near the beginning and end of context more heavily than tokens buried in the middle. Compression that moves essential information toward structural positions can improve quality at the same token count.

For [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) in particular, retrieved passages are typically far wordier than the information they contain. A passage retrieved to answer a factual question might be 400 tokens, of which 40 tokens carry the answer and 360 tokens carry preamble, boilerplate, and tangential context.

## Mechanism Taxonomy

Context compression splits into three broad families based on where the compression happens.

### 1. Token-Level Prompt Compression

The most studied approach: remove tokens from the prompt before it reaches the target LLM. The compressed text is ungrammatical but often still interpretable.

**LLMLingua** (Microsoft Research, EMNLP 2023) implements a three-tier filtering hierarchy in `llmlingua/prompt_compressor.py`. The method treats compression as an information-theoretic problem: tokens with high cross-entropy loss under a small scoring LM carry more information and should be kept; low-loss tokens are predictable and can be dropped. The pipeline runs:

1. **Context-level filtering** (`control_context_budget()`): ranks entire retrieved documents by perplexity and drops the lowest-ranked ones wholesale.
2. **Sentence-level filtering** (`control_sentence_budget()`): within surviving documents, ranks sentences and drops low-information ones.
3. **Token-level filtering** (`iterative_compress_prompt()`): processes remaining text in 200-token windows, computing per-token cross-entropy loss via `get_ppl()` and removing tokens below a dynamic threshold.

The default scoring model is `NousResearch/Llama-2-7b-hf`. Loading a 7B model to score tokens for a smaller LLM is the defining awkwardness of the approach: you need GPU memory for the scorer before you can reduce the load on the target model. [Source](../raw/deep/repos/microsoft-llmlingua.md)

**LongLLMLingua** extends this by conditioning the perplexity computation on the question (`condition_in_question="after_condition"`). This shifts importance scoring from "surprising to a general LM" to "surprising given this specific question," which better preserves question-relevant tokens. Published results show up to 21.4% improvement on RAG benchmarks using 1/4 the tokens — this figure comes from the ACL 2024 paper and is peer-reviewed but evaluated on the paper's chosen benchmarks. [Source](../raw/deep/repos/microsoft-llmlingua.md)

**LLMLingua-2** replaces perplexity scoring with a trained token classification model (XLM-RoBERTa-large, ~350M parameters). The model outputs binary keep/drop probabilities per token, trained via knowledge distillation from GPT-4. This is 3-6x faster than v1 and handles out-of-domain text better, but it requires domain-specific training data. The training pipeline lives in `experiments/llmlingua2/data_collection/`. The speed claim (3-6x) is self-reported by Microsoft Research in the ACL 2024 Findings paper.

Structured inputs get special handling: `compress_json()` and `structured_compress_prompt()` allow section-level control via `<llmlingua rate=0.4>...</llmlingua>` XML tags, letting you exempt instructions from compression while aggressively compressing retrieved passages.

### 2. Summary-Based Context Management

Rather than dropping tokens from a fixed prompt, summary-based approaches replace large context chunks with compressed summaries that an agent or model produces.

**claude-mem** implements this for [Claude Code](../projects/claude-code.md) sessions: lifecycle hooks (SessionStart, PreCompact, PostToolUse, SessionEnd) capture tool outputs and conversation events, compress them via Claude's API, and inject summaries into future sessions. The PreCompact hook fires before [Anthropic](../projects/anthropic.md)'s native context compression, ensuring a backup exists when compression discards context. [Source](../raw/repos/thedotmack-claude-mem.md)

The compression quality problem is real: single-pass summarization of reasoning traces barely hits a 28% quality threshold on rubric evaluation. Iterative judge-then-refine cycles bring this to 92%, according to the Memento research. [Source](../raw/tweets/dimitrispapail-memento-teaching-llms-to-manage-their-own-context.md)

### 3. Learned Self-Compression (Memento)

The most recent approach trains the target model itself to manage its own context window during generation. **Memento** (Microsoft Research, 2025) teaches reasoning models to:

1. Segment their chain-of-thought into semantic blocks.
2. Generate a "memento" — a dense summary — at each block boundary.
3. Mask the preceding block from KV cache attention and evict its entries physically.

This produces a sawtooth pattern in KV cache usage: memory grows during a reasoning block, then drops sharply when the block completes and its KV entries are evicted. Peak KV cache drops 2-3x versus flat chain-of-thought at equivalent reasoning quality.

Two findings from this research bear on how compression works at the KV level:

**The implicit channel**: When a memento is generated, its tokens attend to the full preceding block. The KV representations of memento tokens therefore encode information from the block, even after the block's own KV entries are evicted. This implicit channel carries 15 percentage points of AIME benchmark performance — evicting it (by recomputing mementos without block access) drops accuracy from 66.1% to 50.8%. This distinguishes in-context masking from restart-based approaches, which lose this channel entirely.

**Curriculum matters**: Training directly on block-masked traces fails because the model must simultaneously learn format, compression, and masked-attention reasoning. A two-stage curriculum — standard causal attention first, then masked attention — enables the capability. About 30K training examples suffice. [Source](../raw/tweets/dimitrispapail-memento-teaching-llms-to-manage-their-own-context.md)

The Memento team implemented block masking directly in [vLLM](../projects/vllm.md) via physical KV cache compaction rather than logical masking, so standard FlashAttention kernels work unmodified. On a single B200 GPU with 240 concurrent requests, throughput reaches 4,290 tok/s versus 2,447 tok/s for vanilla generation (1.75x), with 693s batch completion versus 1,096s. These figures are self-reported from the MSR paper preprint.

## Design Tradeoffs

**Accuracy preservation vs. compression rate**: Published benchmarks for LLMLingua show 2x-20x compression ratios maintaining 80-95% of original task performance. The range is wide because it depends heavily on task type. Math and code are more sensitive to token removal than open-domain QA; structured data (JSON, tables) is most sensitive. The 20x figure requires the most favorable conditions.

**Who scores importance**: v1 LLMLingua uses a general-purpose causal LM; LongLLMLingua conditions on the question; LLMLingua-2 uses a trained classifier. Learned classifiers are faster and often more faithful but are domain-specific. General-purpose scoring is slower but zero-shot.

**Restart vs. in-context compression**: Restarting an API call with only summary text is simpler to implement but discards the implicit KV channel. Single-pass in-context compression preserves the channel but requires non-standard attention masking support from the inference framework.

**Where compression lives**: Compressing before the context window preserves model behavior exactly; compressing via KV cache eviction during generation changes what the model attends to. The former is a preprocessing step; the latter requires training or system-level support.

## Failure Modes

**Structured data corruption**: Token-level compression breaks syntactic structure in JSON, code, and tables. A comma or bracket removed because it has low perplexity can invalidate an entire payload. LLMLingua's `force_tokens` parameter mitigates this for known delimiters, but general structured data handling remains brittle. [Source](../raw/deep/repos/microsoft-llmlingua.md)

**Cross-context information loss**: Context-level filtering drops entire documents. If a critical fact exists in a document that scores as low-importance (e.g., a short, plain-language passage with low perplexity), it disappears entirely.

**Tokenizer mismatch**: LLMLingua scores tokens with one tokenizer but reports compression ratios using GPT-3.5's tiktoken. The reported ratio may not match the actual savings for the target model.

**Training distribution shift**: LLMLingua-2 and Memento both require training data from specific domains. Applied outside that domain, compression quality degrades without warning. Memento's accuracy drop partially traces to training on QwQ-32B traces and applying to different target models — the distribution mismatch costs several percentage points before RL recovery.

## Infrastructure Assumptions

**A scoring model must be available**: Token-level compression with LLMLingua requires loading a separate LLM. In serverless or memory-constrained environments, this is expensive or impossible.

**Single-forward-pass compression assumes controllable generation**: Memento-style learned compression requires the ability to mask arbitrary token positions during generation, which most production inference stacks do not support out of the box. The Memento team wrote a custom vLLM patch specifically because no existing framework handled dynamic, data-dependent attention masking.

## When Not To Use Context Compression

- When input context is already structured and dense (code, SQL, JSON): token-level compression corrupts structure faster than it saves tokens.
- When the target model has a genuinely large context window and the task uses most of it usefully: compression overhead (scoring model, pipeline complexity) may exceed the savings.
- When faithfulness is critical and you cannot validate compression quality on your specific domain.
- When operating at low volume: the engineering cost of integrating a compression pipeline rarely pays off for occasional inference.

## Practical Applications

**RAG post-processing**: Retrieve 10 documents, compress to the token budget of 3, pass to the target LLM. LLMLingua integrates with [LangChain](../projects/langchain.md) and [LlamaIndex](../projects/llamaindex.md) for this pattern.

**Session memory for coding agents**: [Claude Code](../projects/claude-code.md) uses a PreCompact hook to compress session context before Anthropic's native context window management kicks in, preserving the most task-relevant observations across sessions.

**Long reasoning efficiency**: Agents producing extended chain-of-thought (for hard math, multi-step planning) accumulate massive KV caches. Memento-style learned compression addresses this, though it requires fine-tuning the target model.

**Multi-turn conversation compression**: Older turns get summarized and injected as condensed context. This is the pattern used in [MemGPT](../projects/memgpt.md) and [Letta](../projects/letta.md) for extending effective conversation length beyond the physical context window.

## Unresolved Questions

**Compression quality measurement**: There is no standard benchmark for compression faithfulness. LLMLingua reports task accuracy on downstream benchmarks; Memento reports AIME pass rates. Neither directly measures information loss, making it hard to compare methods or predict behavior on new tasks.

**Cost at scale**: The LLMLingua-2 training pipeline uses GPT-4 for label generation. The cost of generating training data for a new domain is undocumented in the public releases.

**Interaction with quantization and speculative decoding**: How token-level prompt compression interacts with other inference optimizations (KV cache quantization, speculative decoding) is not studied in published work.

## Alternatives

- **Chunking + retrieval** ([Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)): instead of compressing all retrieved context, retrieve only the most relevant chunks. Use when you can define relevance clearly and the retrieval latency is acceptable.
- **[Progressive Disclosure](../concepts/progressive-disclosure.md)**: inject context in layers, fetching detail only when the model needs it. Use when the agent can self-direct its information needs.
- **Model with longer native context**: if the bottleneck is window size and the model supports it, simply use a model with larger context. Use when cost-per-token is not the primary constraint.
- **Hierarchical summarization** ([RAPTOR](../projects/raptor.md)): build a summary tree at index time rather than compressing at query time. Use when documents are stable and offline preprocessing is acceptable.

## Related Concepts

- [Context Management](../concepts/context-management.md)
- [Context Engineering](../concepts/context-engineering.md)
- [Lost in the Middle](../concepts/lost-in-the-middle.md)
- [Token Efficiency](../concepts/token-efficiency.md)
- [Progressive Disclosure](../concepts/progressive-disclosure.md)
- [Short-Term Memory](../concepts/short-term-memory.md)
