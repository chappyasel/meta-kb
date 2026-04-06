---
entity_id: synthetic-data-generation
type: approach
bucket: self-improving
abstract: >-
  Synthetic data generation uses LLMs to produce training or evaluation data
  automatically, enabling dataset scaling without proportional human labeling
  effort; its key differentiator is closing the feedback loop between knowledge
  retrieval and model weight updates.
sources:
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
related:
  - Obsidian
  - Retrieval-Augmented Generation
  - Andrej Karpathy
last_compiled: '2026-04-05T23:14:58.458Z'
---
# Synthetic Data Generation

## What It Is

Synthetic data generation uses LLMs or other models to produce training examples, evaluation sets, or structured knowledge artifacts that would otherwise require human annotation. The outputs range from question-answer pairs to full markdown articles to preference tuples for RLHF. In the context of self-improving agent systems, it specifically refers to generating data from a running system's own outputs so that accumulated knowledge can migrate from context windows into model weights via fine-tuning.

The approach sits at the intersection of two problems: the cost of human-labeled data at scale, and the hard ceiling on what fits in a context window. Synthetic generation addresses both by treating the model as both producer and consumer of training signal.

## How It Works

The core mechanism involves three steps that compound over time.

**Compilation.** Raw source documents (papers, articles, code) enter a `raw/` directory. An LLM reads them and writes structured markdown articles into a wiki directory, generating summaries, cross-links, and concept-level synthesis. The LLM maintains index files so later queries don't require embedding-based retrieval.

**Linting and enrichment.** Periodic health-check passes run the LLM over the existing wiki to find inconsistencies, impute missing data via web search, and surface candidate articles for new topics. This is where synthetic data diverges from simple summarization: the model generates content that wasn't explicitly present in any source, drawing inferences across documents. [Source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)

**Weight incorporation.** Once the wiki grows large enough that even context-window-based Q&A shows friction, the accumulated markdown becomes a fine-tuning corpus. The wiki articles, Q&A outputs, and linting passes are converted into training examples. Fine-tuning then bakes the domain knowledge into model weights, eliminating retrieval at inference time for well-covered topics.

Karpathy frames this last step as the natural endpoint: "the natural desire is to also think about synthetic data generation + finetuning to have your LLM 'know' the data in its weights instead of just context windows." [Source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)

The feedback loop is the key mechanism. Queries filed back into the wiki expand the training corpus. Linting passes generate new synthetic articles. Each fine-tuning run produces a model slightly better at handling the specific domain, which in turn produces higher-quality synthetic articles in the next cycle.

## Where It Fits in Agent Architectures

Synthetic generation replaces or supplements [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) at sufficient scale. At small-to-medium corpus sizes (~100 articles, ~400K words), an LLM maintaining its own index files can answer complex queries without a vector database. Beyond that scale, or for latency-sensitive production use, synthetic fine-tuning becomes the more practical path because it removes the retrieval step entirely.

[Obsidian](../projects/obsidian.md) functions as the human-readable interface for inspecting the wiki during this process. Marp and matplotlib handle visual output formats. The actual synthesis happens in CLI tool calls the LLM makes against the markdown files. [Source](../raw/tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md)

## Strengths

**Scalable corpus construction.** Human annotators cannot keep pace with a research domain evolving weekly. An LLM writing 50 articles per run scales with API rate limits, not headcount.

**Inspectability.** Markdown files are human-readable. Every generated article, every linting pass, every Q&A output can be audited. This contrasts with RAG vector stores, where the retrieval logic is opaque and errors surface only at query time.

**Compounding returns.** Each query that gets filed back into the wiki adds a training example. The corpus grows with use rather than requiring separate annotation campaigns.

**No specialized retrieval infrastructure.** At small-to-medium scale, LLM-maintained index files outperform naive RAG implementations without requiring embedding models, vector databases, or chunking pipelines. [Source](../raw/tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md)

## Critical Limitations

**Error propagation and hallucination laundering.** The most serious failure mode: when the LLM generates synthetic articles containing confident-sounding errors, those errors enter the training corpus. Fine-tuning on them reinforces the mistakes. Linting passes may not catch errors in domains where the base model is already wrong, because the linter uses the same model with the same biases. A single plausible hallucination in cycle one can become a hardcoded model belief by cycle three.

**Infrastructure assumption: stable document provenance.** The system assumes raw sources are well-organized, clearly attributed, and don't contradict each other. Messy real-world corpora with duplicate, outdated, or conflicting documents stress the linting loop in ways the wiki metaphor obscures. The LLM has no ground truth to adjudicate conflicts, so it picks one version or averages them, and the provenance of that choice disappears.

## When Not to Use It

Skip synthetic data generation when the domain requires factual precision that can be externally verified at low cost. If you can hire annotators or tap structured databases, human-labeled data beats synthetic for factual tasks because error rates are lower and auditable. Synthetic generation earns its place where human annotation is prohibitively slow or expensive relative to the volume needed.

Avoid the fine-tuning step specifically when the knowledge base changes faster than fine-tuning cycles. If the source documents update daily, a fine-tuned model lags behind a RAG system that queries fresh documents. The wiki + index approach without fine-tuning is better in high-churn domains.

Don't use it for safety-critical applications without a separate human review gate on every synthetic article before it enters the training corpus. The self-healing linting loop has no mechanism for catching systematic bias introduced by the base model.

## Unresolved Questions

**Quality threshold for training corpus inclusion.** No published methodology specifies when a synthetic article is good enough to include in a fine-tuning run. Karpathy's description treats all wiki content as implicitly training-eligible, but in practice the quality variance across a 100-article wiki is substantial. [Source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)

**Catastrophic forgetting.** Fine-tuning on domain-specific synthetic data risks degrading general capabilities. The tradeoff between domain specialization and breadth isn't addressed in the self-improving wiki framing.

**Cost at scale.** The approach works at ~100 articles. What happens at 10,000? Token costs for linting passes grow with corpus size. No benchmarks exist for the crossover point where RAG becomes cheaper than synthetic-corpus maintenance plus fine-tuning.

**Governance of the feedback loop.** Who reviews the linting suggestions before they become wiki articles? The described system has no human checkpoint between a linting pass and a wiki update. At personal research scale that's acceptable. At team or product scale, it's a liability.

## Alternatives

**[Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md):** Use when knowledge updates frequently and you need fresh-document access at query time. RAG retrieves from current sources rather than from fine-tuned weights, making it better for high-churn domains.

**Human annotation pipelines:** Use when factual precision matters and the annotation volume is bounded. Higher per-example cost, lower error rate, clearer audit trail.

**Distillation from larger models:** Use when you want to compress a large model's capabilities into a smaller one without domain specificity. Synthetic generation from teacher models for student fine-tuning is a well-studied variant of this approach.

## Related Concepts

- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)
- [Andrej Karpathy](../people/andrej-karpathy.md)
- [Obsidian](../projects/obsidian.md)
