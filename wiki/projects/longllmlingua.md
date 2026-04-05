---
entity_id: longllmlingua
type: project
bucket: context-engineering
sources:
  - repos/microsoft-llmlingua.md
  - >-
    articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md
  - deep/repos/microsoft-llmlingua.md
related: []
last_compiled: '2026-04-05T05:35:33.294Z'
---
# LLMLingua

**A family of prompt compression methods from Microsoft Research that reduce token counts by identifying and dropping low-information tokens before sending prompts to LLMs.**

[Source](../../raw/repos/microsoft-llmlingua.md) | [Deep Analysis](../../raw/repos/microsoft-llmlingua.md)

---

## What It Does

LLMLingua runs your prompt through a small language model to score each token's importance, drops the low-scoring ones, then sends the compressed result to your target LLM. The core claim: tokens that are predictable (low perplexity) carry less information and can be safely removed. At 20x compression, you reduce a 2,000-token prompt to ~100 tokens.

The library ships three distinct algorithms under one `PromptCompressor` class, plus a SecurityLingua variant for jailbreak detection. You pick which algorithm via constructor flags and method calls, not separate packages.

---

## Architecture

The entire library is two files: `llmlingua/prompt_compressor.py` (~1,500 lines) and `utils.py`. That's it.

### LLMLingua (v1): Three-Tier Perplexity Filtering

The original algorithm runs a three-stage hierarchy over `instruction + context[] + question`:

1. **Context-level** (`control_context_budget()`): Scores entire context strings by mean perplexity, drops the lowest-scoring ones wholesale. The `context_budget="+100"` default adds slack so downstream tiers have material to work with.

2. **Sentence-level** (`control_sentence_budget()`): Within surviving contexts, drops low-perplexity sentences. `token_budget_ratio=1.4` inflates the budget here to account for the next stage.

3. **Token-level** (`iterative_compress_prompt()`): Processes tokens in 200-token windows. For each window, `get_ppl()` computes per-token cross-entropy loss via the small LM, then removes tokens below a dynamic threshold.

`get_ppl()` is the computational core. It runs the scoring model with KV-cache enabled, computes cross-entropy loss per token position, and optionally splits loss at `condition_pos_id` for question-conditioned scoring.

### LongLLMLingua: Question-Conditioned Compression

When `rank_method="longllmlingua"`, perplexity is computed conditioned on the question. Tokens that become more surprising given the question are preserved. This targets the "lost in the middle" problem by weighting tokens that matter for the specific query.

The `condition_compare` flag computes importance both with and without the question, preserving only tokens whose importance increases with conditioning.

### LLMLingua-2: Trained Token Classification

A different approach entirely. Instead of a causal LM computing perplexity, a RoBERTa-based model (`microsoft/llmlingua-2-xlm-roberta-large-meetingbank`) predicts binary keep/drop labels per token.

Key implementation details in `compress_prompt_llmlingua2()`:

- **`init_llmlingua2()`**: Loads an `AutoModelForTokenClassification` model. Adds up to 100 special tokens (`[NEW0]`...`[NEW99]`) to the tokenizer for force-preserved tokens; resizes the embedding layer accordingly.
- **`__chunk_context()`**: Splits contexts at sentence boundaries to fit within RoBERTa's 512-token window.
- **`__get_context_prob()`**: Runs the classifier, aggregates subword probabilities to word level via mean pooling.
- **`__compress()`**: Drops tokens below the keep-probability threshold. `force_tokens` maps specified tokens to `[NEWi]` special tokens before classification, ensuring they survive.

Training data comes from GPT-4 labeling MeetingBank transcripts, GSM8K, and BBH benchmarks. The model learns from GPT-4's compression decisions rather than from perplexity signals.

Speed gain over v1: 3-6x. The smaller model (350M vs. 7B parameters) explains most of this.

---

## Key Numbers

| Metric | Value | Credibility |
|---|---|---|
| GitHub stars | ~6,000 | Observed |
| Max compression ratio | 20x | Self-reported (Microsoft Research papers, EMNLP 2023, ACL 2024) |
| LLMLingua-2 speed gain | 3-6x over v1 | Self-reported |
| LongLLMLingua RAG improvement | +21.4% using 1/4 tokens | Self-reported (ACL 2024) |
| Task performance retention | 80-95% at 2-20x compression | Self-reported across benchmarks |

The 20x compression claim comes from specific benchmark tasks (math word problems like GSM8K) where prompts are particularly redundant. Production RAG scenarios with heterogeneous retrieved text will land materially lower. The 80-95% performance retention figure is benchmark-specific and varies widely by task type.

---

## Strengths

**RAG cost reduction**: The library integrates directly into LangChain and LlamaIndex as a node post-processor. You retrieve 20 chunks, compress them down to 5-chunk equivalents, pay for 5-chunk equivalents. The `structured_compress_prompt()` method lets you pin instructions (no compression) while aggressively compressing retrieved passages.

**No target LLM changes**: The compression runs entirely on the scoring model. Your GPT-4 or Claude endpoint sees a shorter prompt and needs no modification. No fine-tuning, no prompting changes on the output side.

**Selective compression control**: The `<llmlingua rate=0.3 compress=False>...</llmlingua>` XML tag system gives per-section compression budgets. Useful for prompts mixing boilerplate instructions (preserve) with variable retrieved context (compress hard).

**Addresses context bloat in agentic pipelines**: Each retrieval iteration in an agentic loop accumulates tokens. LLMLingua compression between iterations can prevent the "Lost in the Middle" degradation that Stanford/Meta research documented at 20+ document contexts.

---

## Critical Limitations

**Structured data corruption**: The token-level filter removes tokens based on perplexity, not syntax. A comma in JSON or a colon in a key-value pair can be low-perplexity (predictable) but syntactically required. `compress_json()` handles this for JSON specifically, but general code, tables, and configuration blocks are fragile. The `force_tokens` mechanism helps for known delimiters, but you must enumerate them manually.

**Unspoken infrastructure assumption**: The default scoring model (`NousResearch/Llama-2-7b-hf`) requires ~14GB GPU memory. LLMLingua-2's XLM-RoBERTa-large needs ~2GB. Neither runs cheaply on CPU in production. If your inference stack runs on CPU-only instances or tiny containers, you're either adding GPU infrastructure for the compressor or accepting very slow compression that may exceed the latency savings from shorter prompts to the target LLM. The `device_map` parameter supports CPU inference but the README does not discuss the latency tradeoff.

---

## When Not to Use It

**Short prompts**: If your average prompt is under 500 tokens, compression overhead (model loading, forward pass, token reconstruction) exceeds savings. The break-even point depends on how many queries you run against how expensive the target model is.

**High-fidelity structured output pipelines**: If your prompt contains JSON schemas, function signatures, SQL, or regex patterns that the LLM must reference exactly, compression is likely to corrupt them. Even with `force_tokens`, you need to know every token that matters.

**Domain-specific tasks without matching training data (LLMLingua-2)**: LLMLingua-2's classification model trained on MeetingBank transcripts. If your corpus is medical records, legal documents, or code, the keep/drop predictions may misfire. LLMLingua v1's perplexity approach generalizes better across domains at the cost of speed.

**Latency-critical paths where compression isn't pre-cached**: Compression adds a forward pass through a separate model. If you cannot pre-compress retrieval results (e.g., dynamic queries over live data), you add a full model inference round-trip to every query latency.

---

## Unresolved Questions

**Tokenizer mismatch is unaddressed in production guidance**: `get_ppl()` uses the scoring model's tokenizer; the output's `saving` and `ratio` fields use GPT-3.5's tiktoken tokenizer (`self.oai_tokenizer`). The reported savings may not match actual token counts for GPT-4, Claude, or Gemini. The documentation does not explain how to calibrate this for non-OpenAI targets.

**Compression quality degrades at the window boundary**: Token-level compression processes 200-token windows independently. A token that's redundant within its local window may be globally important. There is no cross-window information sharing. The documentation doesn't characterize how badly this affects outputs in practice or what `iterative_size` tuning looks like.

**LLMLingua-2's domain transfer**: The models on HuggingFace are trained on MeetingBank. The `experiments/llmlingua2/` directory contains a training pipeline for custom data, but the documentation gives no guidance on how much training data you need, what quality looks like, or how to evaluate whether your custom model is working. Teams that need domain-specific compression are on their own.

**Governance and maintenance trajectory**: The repo's most recent updates focus on adjacent projects (RetrievalAttention, MInference, SCBench). LLMLingua itself appears to be in maintenance mode. No roadmap is published for handling newer model architectures as scoring models or addressing the structured data problem systematically.

---

## Alternatives

| Tool | When to prefer it |
|---|---|
| **LLMLingua v1** (perplexity-based) | Zero-shot, cross-domain, or when you can't fine-tune a classifier. Slower but no training required. |
| **LLMLingua-2** (classification-based) | Production RAG on meeting transcripts or similar domains; need 3-6x faster compression; can accept a domain-matched training set. |
| **Semantic chunking + top-k reduction** | Simpler RAG setups where you control retrieval. Reduce retrieved chunks from 20 to 5 before they ever enter the prompt. No additional model required. |
| **MInference** (same Microsoft lab) | Long-context inference acceleration via sparse attention; targets 1M token prompts; operates at inference time rather than pre-processing. |
| **Native model context windows** | If your target model is Gemini 1.5 Pro or Claude with 200K tokens, compression ROI drops significantly for typical RAG payloads. |

---

*Published: EMNLP 2023 (LLMLingua), ACL 2024 (LongLLMLingua, LLMLingua-2). MIT license. Microsoft Research.*
