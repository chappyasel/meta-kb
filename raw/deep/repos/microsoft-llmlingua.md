---
url: 'https://github.com/microsoft/LLMLingua'
type: repo
author: microsoft
date: '2026-04-04'
tags:
  - context-engineering
  - knowledge-bases
key_insight: >-
  LLMLingua compresses prompts through a three-tier filtering hierarchy
  (context-level -> sentence-level -> token-level) using perplexity scores from
  a small language model to rank token importance, while LLMLingua-2 replaces
  this with a trained token classification model that achieves 3-6x faster
  compression with better fidelity by treating compression as a binary token
  labeling task.
stars: 4800
deep_research:
  method: source-code-analysis
  files_analyzed:
    - llmlingua/prompt_compressor.py
    - llmlingua/utils.py
    - llmlingua/__init__.py
    - experiments/llmlingua2/data_collection/compress.py
    - experiments/llmlingua2/model_training/train_roberta.py
    - experiments/llmlingua2/evaluation/compress.py
  analyzed_at: '2026-04-04'
  original_source: repos/microsoft-llmlingua.md
relevance_scores:
  topic_relevance: 7
  practitioner_value: 8
  novelty: 7
  signal_quality: 8
  composite: 7.5
  reason: >-
    LLMLingua's token-level compression directly addresses context engineering
    and token budgeting challenges in LLM agent systems, with a detailed
    three-tier architecture and production-ready library that practitioners can
    apply today to manage context window constraints.
---

## Architecture Overview

LLMLingua is a prompt compression library from Microsoft Research that implements three distinct compression approaches -- LLMLingua, LongLLMLingua, and LLMLingua-2 -- within a single `PromptCompressor` class (`llmlingua/prompt_compressor.py`, ~1500 lines). The entire library consists of essentially two files: the `PromptCompressor` class and a `utils.py` helper module.

The fundamental insight is that prompt compression can be modeled as an information-theoretic problem: tokens with high perplexity (surprising to a language model) carry more information and should be preserved, while low-perplexity tokens (predictable given context) can be safely removed. This is directly derived from the principle that "language modeling is compression" (Deletang et al., 2023).

The system loads a small language model (default: `NousResearch/Llama-2-7b-hf`) for perplexity computation and uses it to score tokens, sentences, and contexts for importance. When `use_llmlingua2=True`, it instead loads a token classification model (e.g., `microsoft/llmlingua-2-xlm-roberta-large-meetingbank`) that directly predicts binary keep/drop labels per token.

```
Input Prompt (instruction + context[] + question)
  -> Context-Level Filter (coarse: keep/drop entire contexts)
  -> Sentence-Level Filter (medium: keep/drop sentences within contexts)
  -> Token-Level Filter (fine: keep/drop individual tokens)
  -> Compressed Prompt
```

## Core Mechanism: Three-Tier Compression

### LLMLingua (v1): Perplexity-Based Compression

The `compress_prompt()` method implements the original LLMLingua algorithm with three filtering tiers:

**Tier 1 -- Context-Level Filter** (`control_context_budget()`): When multiple context strings are provided, this tier ranks them by perplexity and drops entire contexts to meet the token budget. The ranking uses `get_ppl()` to compute the mean cross-entropy loss for each context string. Contexts with higher perplexity (more informative) are preserved; low-perplexity contexts (redundant or generic) are dropped first.

The `context_budget` parameter (default: `"+100"`) adds slack to the budget at this stage, ensuring the next tiers have enough material to work with. Context ordering can be preserved (`reorder_context="original"`) or sorted by relevance.

**Tier 2 -- Sentence-Level Filter** (`control_sentence_budget()`): Within surviving contexts, sentences are ranked by perplexity and low-information sentences are dropped. The `token_budget_ratio` parameter (default: 1.4) inflates the budget at this tier to account for the subsequent token-level compression. Configuration options include `keep_first_sentence`, `keep_last_sentence`, and `keep_sentence_number` for preserving structural elements.

**Tier 3 -- Token-Level Filter** (`iterative_compress_prompt()`): The core compression algorithm. Tokens are processed in windows of `iterative_size` (default: 200) tokens. For each window, the model computes per-token cross-entropy loss (perplexity), and tokens below a dynamically computed threshold are removed. The `condition_in_question` parameter controls whether the question is prepended to the context during perplexity computation, providing a question-aware signal for token importance.

The `get_ppl()` method is the computational heart of the system. It runs the small LM on the input tokens with KV-cache enabled (via `past_key_values`), computes the cross-entropy loss for each token position, and optionally splits the loss at a `condition_pos_id` for conditioned compression. The implementation carefully handles position embeddings, attention masks, and the maximum position limit of the underlying model.

### LongLLMLingua: Question-Conditioned Compression

LongLLMLingua extends the base algorithm for long-context scenarios. When `rank_method="longllmlingua"`, the question is used as conditioning context: perplexity is computed conditioned on the question, so tokens that are informative relative to the question are preserved. This is set via `condition_in_question="after"`, meaning the question appears after the context during perplexity computation.

The `condition_compare` flag enables a comparison mode where tokens are evaluated with and without the question condition, and only tokens whose importance increases with the question are preserved.

### LLMLingua-2: Trained Token Classification

LLMLingua-2 represents a fundamental architecture shift. Instead of using a causal LM for perplexity computation, it trains a token classification model (RoBERTa-based) to directly predict binary labels: 1 = keep, 0 = drop.

The `compress_prompt_llmlingua2()` method implements this approach:

**Initialization** (`init_llmlingua2()`): The model is loaded as `AutoModelForTokenClassification`. Special tokens (`[NEW0]`, `[NEW1]`, ..., `[NEW99]`) are added to the tokenizer for force-preserved tokens. The model's embedding layer is resized to accommodate these new tokens.

**Context Chunking** (`__chunk_context()`): Contexts are split into chunks at sentence boundaries (`.`, `\n`, or custom `chunk_end_tokens`), respecting the model's max sequence length (512 tokens). This chunking is necessary because RoBERTa has a fixed context window, unlike the sliding-window approach of causal LMs.

**Token Probability Computation** (`__get_context_prob()`): Each chunk is fed through the classification model, which outputs per-token probabilities of being "keep" vs "drop". These probabilities are then aggregated from subword tokens to word-level probabilities using the `token_to_word` parameter (default: "mean" -- average the subword probabilities).

**Context-Level Filtering**: When `use_context_level_filter=True`, entire contexts are scored by their mean token keep-probability. Contexts below the `context_level_rate` percentile threshold are dropped.

**Token-Level Compression** (`__compress()`): For surviving contexts, tokens with keep-probability below the rate-derived threshold are removed. The `force_tokens` mechanism ensures specific tokens (like newlines, punctuation) are always preserved by mapping them to special `[NEWi]` tokens before classification and then restoring them.

**Force Reserve Features**:
- `force_tokens`: List of tokens that must always be preserved (up to `max_force_token=100`)
- `force_reserve_digit`: Boolean to always preserve tokens containing digits
- `drop_consecutive`: Boolean to drop consecutively repeated force-tokens

## Design Tradeoffs

### Small Model for Scoring vs. Direct Classification

LLMLingua v1 uses a full causal LM (7B parameters) to compute perplexity scores, which is slow but doesn't require task-specific training. LLMLingua-2 uses a much smaller classification model (~350M parameters for XLM-RoBERTa-large) that's 3-6x faster but requires training data. The training data collection pipeline (`experiments/llmlingua2/data_collection/`) uses GPT-4 as a teacher model to generate compression labels, creating a knowledge distillation setup.

The tradeoff is clear: v1 is zero-shot (works immediately with any LM), v2 requires training but is faster and more accurate for the trained domain.

### Compression Rate vs. Fidelity

The `rate` parameter defines the target compression ratio (compressed_size / original_size). Lower rates mean more aggressive compression. However, the actual compression rate may differ from the target due to tokenizer differences between the scoring model and the target model (GPT-4's tiktoken tokenizer is used for reporting). The system reports both `ratio` (original/compressed) and `rate` (compressed/original) in the output.

The `target_token` parameter overrides `rate` with an absolute token budget. This is more predictable for fixed-context-window scenarios but less portable across different inputs.

### Iterative Window Processing

The token-level filter processes tokens in fixed-size windows (`iterative_size=200`) rather than all at once. This is necessary because the scoring model's context window is limited, and KV-cache management requires bounded segments. The tradeoff is that token importance is evaluated locally within each window, not globally across the entire context. A token that's redundant within its window might be globally important.

### Three-Tier Budget Allocation

The budget is allocated across tiers using multipliers: `context_budget` adds slack at the context level, `token_budget_ratio` inflates the budget at the sentence level. This cascading budget ensures each tier has room to work, but it means the actual compression rate is a product of three independent decisions, making it harder to hit exact targets.

## Failure Modes & Limitations

### Structured Data Corruption

Prompt compression can corrupt structured data (JSON, code, tables) by removing tokens that are syntactically necessary but perplexity-low. The `compress_json()` method attempts to handle JSON specifically via `process_structured_json_data()` and `remove_consecutive_commas()`, but general structured data handling is fragile. The `force_tokens` mechanism in LLMLingua-2 mitigates this for known delimiters.

### Cross-Context Information Loss

The context-level filter drops entire contexts. If critical information is spread across a low-perplexity context, it's lost entirely. The `force_context_ids` parameter allows manual override, but requires knowing which contexts are important a priori.

### Tokenizer Mismatch

The system uses the scoring model's tokenizer for compression but reports token counts using GPT-3.5's tiktoken tokenizer (`self.oai_tokenizer`). This mismatch means the reported compression ratio may not reflect the actual token savings for the target model. The `get_token_length()` method supports both tokenizers via the `use_oai_tokenizer` flag.

### Model Loading Overhead

Loading a 7B parameter model for compression adds significant startup time and memory overhead. The LLMLingua-2 approach with its smaller model mitigates this, but still requires GPU memory. The `device_map` parameter supports CPU inference, but compression becomes very slow.

### Sentence Boundary Detection

Sentence segmentation uses NLTK's sentence tokenizer, which struggles with abbreviations, URLs, code, and non-English text. Poor sentence boundaries propagate errors through the sentence-level filter.

## Integration Patterns

The library provides a simple API: instantiate `PromptCompressor` with model configuration, then call `compress_prompt()` or `compress_prompt_llmlingua2()`. The output is a dictionary with `compressed_prompt`, `origin_tokens`, `compressed_tokens`, `ratio`, `rate`, and `saving` (estimated GPT-4 cost savings).

The `structured_compress_prompt()` method supports inline compression control via `<llmlingua rate=0.3 compress=True>...</llmlingua>` XML tags within the context, allowing fine-grained per-section compression rates. This is useful for heterogeneous prompts where some sections (like instructions) should not be compressed while others (like retrieved passages) can be aggressively compressed.

Integration with RAG systems is demonstrated in the `examples/` directory, including LlamaIndex integration (`RAGLlamaIndex.ipynb`) and chain-of-thought compression (`CoT.ipynb`). The pattern is: retrieve context, compress with LLMLingua, then pass compressed context to the target LLM.

## Benchmarks & Performance

The `experiments/llmlingua2/` directory contains the full training and evaluation pipeline:

**Data Collection**: GPT-4 generates compression labels by compressing MeetingBank transcripts, GSM8K math problems, BBH benchmarks, and other datasets. Labels are collected at the word level: 1 = preserve, 0 = remove.

**Model Training**: RoBERTa-based token classification models are trained on the collected data. The `train_roberta.py` script uses HuggingFace Trainer with standard cross-entropy loss on token labels.

**Evaluation**: Benchmarks span MeetingBank (QA and summarization), LongBench, GSM8K, BBH, and ZeroScrolls. The evaluation pipeline compresses prompts, sends them to the target LLM, and measures task-specific metrics.

Published results show LLMLingua-2 achieving 2x-20x compression ratios while maintaining 80-95% of the original task performance, depending on the task and compression rate. The cost savings calculation uses $0.06/1K tokens (GPT-4 pricing at time of publication).

The SLingua variant (`use_slingua=True`) is mentioned in the code as using the LLMLingua-2 backend but is not extensively documented, suggesting it's an experimental or unreleased variant.

## Key Implementation Details

### KV-Cache Management

The `get_ppl()` method implements careful KV-cache management for efficient iterative compression. When `past_key_values` is provided, only new tokens are processed through the model, and the cache is extended. The `cache_bos_num = 10` and `prefix_bos_num = 100` constants control how much of the beginning-of-sequence is cached for conditioning.

### Dynamic Compression Ratios

The `dynamic_context_compression_ratio` parameter enables per-context adaptive compression rates. Rather than applying a uniform rate across all contexts, the system can allocate more budget to information-rich contexts and less to redundant ones. This is controlled by the perplexity ranking from the context-level filter.

### Word-Level Label Output

When `return_word_label=True`, the system returns `fn_labeled_original_prompt`: the original text with binary labels indicating which words were kept. The format is `word{label_sep}label` separated by `word_sep`. This enables post-hoc analysis of what was removed and debugging of compression quality.

### SecurityLingua Extension

The `experiments/securitylingua/` directory contains an extension for detecting and filtering adversarial prompt injections using the same token classification approach. This demonstrates that the compression model's ability to identify "important" tokens generalizes to security applications: adversarial injections often have distinct perplexity signatures.
