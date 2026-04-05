---
entity_id: context-compression
type: concept
bucket: context-engineering
abstract: >-
  Context compression reduces LLM prompt size while preserving task-relevant
  information, enabling longer effective contexts, lower inference costs, and
  better signal-to-noise in retrieved content.
sources:
  - repos/helloruru-claude-memory-engine.md
  - repos/microsoft-llmlingua.md
  - repos/thedotmack-claude-mem.md
  - repos/laurian-context-compression-experiments-2508.md
  - deep/repos/microsoft-llmlingua.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - Retrieval-Augmented Generation
  - LLMLingua
  - Context Management
  - Compaction Tree
last_compiled: '2026-04-05T20:34:51.696Z'
---
# Context Compression

## What It Is

Context compression covers techniques that shrink the information fed to an LLM while keeping what matters for the task. The context window is a fixed budget. Every token you spend on redundant preamble, low-signal retrieved passages, or verbose formatting is a token unavailable for reasoning. Compression attacks this constraint from the input side rather than expanding the window.

The concept sits within the broader discipline of [Context Management](../concepts/context-management.md), which also covers caching, routing, and tiered memory. Compression specifically handles the transformation step: taking a set of tokens and producing a shorter set that preserves most of the task-relevant information. It is a core component of [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) pipelines, where retrieved documents routinely contain far more text than needed to answer a specific query.

## Why It Matters

Three forces drive compression from a nice-to-have to a production concern:

**Cost.** LLM APIs charge per token. A RAG system that retrieves ten 2,000-token documents per query and passes them all to GPT-4 costs an order of magnitude more than one that compresses each document to its relevant 200 tokens first.

**Quality.** LLMs do not uniformly attend to all context. The "lost in the middle" problem, documented empirically and addressed by LongLLMLingua, shows that information buried in the middle of long contexts is retrieved less reliably than information at the beginning or end. Compressing away low-signal content concentrates attention on what matters.

**Rate limits and latency.** Production systems hitting API rate limits fall back to smaller, cheaper models. Those models handle shorter contexts better. In the case documented in [context-compression-experiments-2508](../raw/repos/laurian-context-compression-experiments-2508.md), a production Agentic RAG system falling back to `gpt-4o-mini` produced `NO_OUTPUT` for hundreds of documents that `gpt-4o` handled correctly, purely because the smaller model struggled with the uncompressed context.

## How It Works

### The Information-Theoretic Core

The foundational insight, formalized in LLMLingua, is that compression is an information problem. Tokens a language model finds predictable (low cross-entropy loss) carry less information than tokens it finds surprising (high cross-entropy loss). Predictable tokens are candidates for removal. This derives directly from the Deletang et al. (2023) result that "language modeling is compression."

This framing applies beyond LLMLingua. Any compression approach is implicitly answering the question: which tokens, if removed, minimize the loss of task-relevant information?

### Extraction-Based Compression

The simplest approach: run an LLM over the document and the query, and ask it to extract only the relevant passages verbatim. LangChain's `LLMChainExtractor` does this. The [context-compression-experiments-2508](../raw/repos/laurian-context-compression-experiments-2508.md) repo shows a production implementation of this pattern, with the compressor returning either extracted verbatim text or `NO_OUTPUT` when nothing is relevant.

This approach preserves faithfulness (the output is literal text from the source) but is expensive: you spend one full LLM call per document to compress, then another for the main task.

### Perplexity-Based Token Filtering

[LLMLingua](../projects/llmlingua.md) implements a three-tier filtering hierarchy in `llmlingua/prompt_compressor.py`:

1. **Context-level** (`control_context_budget()`): Score entire retrieved documents by mean perplexity. Drop the least informative documents first to meet a coarse token budget.
2. **Sentence-level** (`control_sentence_budget()`): Within surviving documents, score sentences. Drop low-perplexity sentences.
3. **Token-level** (`iterative_compress_prompt()`): Within surviving sentences, score individual tokens using a sliding window of 200 tokens. Tokens below a threshold are removed.

The scoring model is a small LM (default: `NousResearch/Llama-2-7b-hf`). The `get_ppl()` method runs this model with KV-cache enabled, computes per-token cross-entropy loss, and uses it to rank tokens by informativeness. LongLLMLingua extends this by conditioning the perplexity computation on the query: tokens that are informative relative to the question are preserved at higher rates.

This approach is zero-shot, requires no training, and works across domains. The tradeoff is speed: loading a 7B model for scoring is expensive, and the sliding-window token scoring is sequential.

### Trained Token Classification

LLMLingua-2 replaces perplexity scoring with a trained binary classifier (`AutoModelForTokenClassification`, XLM-RoBERTa-large). The model predicts keep/drop for each token directly. Training data comes from GPT-4: the teacher model generates compression labels on MeetingBank transcripts, GSM8K, and BBH benchmarks, creating a knowledge distillation setup.

The `compress_prompt_llmlingua2()` method chunks the context at sentence boundaries (respecting RoBERTa's 512-token limit), runs the classifier, and removes tokens below the keep-probability threshold. The result is 3-6x faster compression than LLMLingua v1, with better fidelity on in-domain data, at the cost of requiring training data and a trained model.

### Prompt Optimization for Compression

A different approach: rather than compressing the document, optimize the compression prompt itself so a cheaper model extracts better. The [context-compression-experiments-2508](../raw/repos/laurian-context-compression-experiments-2508.md) case study demonstrates this directly. Starting from a `gpt-4o`-quality extraction prompt that produced 0% success on `gpt-4o-mini`, the author used:

- **DSPy GEPA** (genetic algorithm-based prompt optimization): 75 iterations over ~1 hour, reaching 62% success on the test set
- **TextGrad** (gradient-based prompt optimization using LLM feedback as gradients): 8 iterations, reaching 79% success
- **Hybrid (GEPA then TextGrad)**: 100% success rate on the 296-document test set

This result is self-reported from a single production system with domain-specific redactions. The 100% figure should be read as "extracted something" rather than "extracted correctly."

### Summarization

Rather than extracting verbatim text or filtering tokens, summarization generates a shorter paraphrase. This is appropriate when faithfulness to the original text is not required and the compressed output feeds reasoning rather than citation. Summarization loses precise wording and numbers, making it unsuitable for tasks requiring exact quotes or calculations over retrieved data.

### Compaction Trees

The [Compaction Tree](../concepts/compaction-tree.md) pattern applies hierarchical summarization across conversation history: as a session grows, older turns are summarized recursively, and summaries of summaries replace raw history. This preserves semantic content across very long interactions without hitting context limits.

## Failure Modes

**Structured data corruption.** Perplexity-based token removal destroys JSON, code, and tables. A JSON key has low perplexity (it follows a pattern) but removing it invalidates the structure. LLMLingua includes `compress_json()` and `force_tokens` for this reason, but the general case remains fragile. Extraction-based approaches handle structured data better since they copy verbatim.

**Cross-context information loss.** Context-level filtering drops entire documents. If the relevant sentence is in a low-perplexity document, it's gone. The `force_context_ids` override exists but requires knowing which documents matter before compression.

**Tokenizer mismatch.** LLMLingua scores tokens with the scoring model's tokenizer but reports compression ratios using GPT-3.5's tiktoken tokenizer. The actual token savings on GPT-4 or Claude may differ from reported numbers.

**Domain overfitting.** LLMLingua-2 is trained on MeetingBank, GSM8K, and BBH. On out-of-domain data (legal contracts, code, medical records), the classifier's notion of "important" tokens may not match the actual task requirements.

**Rate limit cascades.** The context-compression-experiments case shows a specific production failure mode: rate limits force fallback to a model that handles uncompressed context poorly, and the fallback produces no output rather than degraded output. Compression at retrieval time prevents this cascade.

## Strengths

**Cost reduction at scale.** LLMLingua reports up to 20x compression with maintained accuracy on academic benchmarks (self-reported). Real-world compression ratios for RAG systems of 4-8x are more typical at acceptable quality loss.

**No target model changes.** Compression happens before the prompt reaches the target LLM. No fine-tuning, no architectural changes, no API integration.

**LangChain and LlamaIndex integration.** LLMLingua plugs into standard RAG frameworks, making it a drop-in optimization for existing pipelines.

**Structured control.** LLMLingua's `<llmlingua rate=0.3 compress=True>...</llmlingua>` tags allow per-section compression rates, so you can compress retrieved passages aggressively while leaving system instructions untouched.

## When Not to Use It

**When faithfulness is required.** Perplexity-based compression alters the text. If the downstream task requires citation of exact wording (legal, regulatory, medical), extraction-based approaches or no compression are safer.

**When the documents are short.** Compression overhead (loading a 7B model, running classification) is not worth it for documents under a few hundred tokens.

**When compression quality is unverifiable.** If you cannot evaluate whether the compressed output preserves the information the task requires, you cannot trust the compression ratio. The experiments case used GPT-4 as a ground-truth checker; most production systems lack this.

**When the target model is already good at long context.** Claude 3.5 Sonnet and similar models handle 200K-token contexts competently. If rate limits and cost are not constraints, compression may not be worth the added complexity.

## Practical Implementation Notes

The survey taxonomy in [mei-a-survey-of-context-engineering](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md) places compression within the Context Management component of the larger context engineering optimization problem: `C = A(c_instr, c_know, c_tools, c_mem, c_state, c_query)`. Compression primarily operates on `c_know` (retrieved knowledge) and `c_mem` (conversation history). The survey reports 4-8x compression ratios with moderate information loss as achievable, and notes that compression is underutilized in production systems.

The survey's asymmetry finding is relevant: LLMs understand complex contexts better than they generate equivalent outputs. This means the quality ceiling for compression is higher than intuition suggests. A well-compressed 500-token context often produces better task performance than a poorly-organized 2,000-token context, because compression forces elimination of the noise that distracts attention.

## Alternatives and Selection Guidance

- **[LLMLingua](../projects/llmlingua.md)**: Use when you need drop-in RAG compression, can tolerate loading a scoring model, and need something that works across domains without training data.
- **Extraction via LLM (LangChain LLMChainExtractor pattern)**: Use when faithfulness matters and you're willing to pay for a compression LLM call per document.
- **Prompt optimization (DSPy GEPA, TextGrad)**: Use when you have a fixed compression prompt and want to improve a specific cheaper model's performance, and you have ground-truth examples to train on.
- **Summarization**: Use when downstream tasks tolerate paraphrase and you need the shortest possible output, regardless of exact wording.
- **[Compaction Tree](../concepts/compaction-tree.md)**: Use specifically for long-session conversation history, not for single-document RAG compression.

## Unresolved Questions

How compression quality degrades at high compression ratios is task-specific and not well-characterized. Published benchmarks use academic tasks; production RAG tasks (enterprise knowledge bases, legal documents, code repositories) have different information density profiles.

Evaluation is the core unsolved problem. The [context-compression-experiments-2508](../raw/repos/laurian-context-compression-experiments-2508.md) author used GPT-4 as a checker against GPT-4o-mini, which is reasonable but domain-specific. There is no standard benchmark for RAG compression quality that transfers across domains. The "coverage map" visualization in that repo (sentence-level overlap between GPT-4o and GPT-4o-mini extractions) is an interesting approach but not standardized.

The interaction between compression and chain-of-thought is unclear. CoT reasoning depends on intermediate steps that may appear low-perplexity (predictable given prior steps) but are logically necessary. LLMLingua has a CoT example notebook but no systematic analysis of when compression breaks reasoning chains.

## Sources

- [LLMLingua Deep Analysis](../raw/deep/repos/microsoft-llmlingua.md)
- [LLMLingua Repository](../raw/repos/microsoft-llmlingua.md)
- [Context Compression Experiments](../raw/repos/laurian-context-compression-experiments-2508.md)
- [Context Engineering Survey](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md)
- [Claude-Mem Repository](../raw/repos/thedotmack-claude-mem.md)


## Related

- [Retrieval-Augmented Generation](../concepts/rag.md) — part_of (0.5)
- [LLMLingua](../projects/llmlingua.md) — implements (0.9)
- [Context Management](../concepts/context-management.md) — part_of (0.7)
- [Compaction Tree](../concepts/compaction-tree.md) — implements (0.7)
