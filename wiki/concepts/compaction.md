---
entity_id: compaction
type: concept
bucket: context-engineering
abstract: >-
  Context compaction reduces accumulated conversation history in LLM agents by
  summarizing or selectively compressing older turns, enabling indefinitely long
  agent operations within fixed context windows.
sources:
  - repos/vectorspacelab-general-agentic-memory.md
  - repos/laurian-context-compression-experiments-2508.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related: []
last_compiled: '2026-04-05T23:21:10.076Z'
---
# Context Compaction

## What It Is

Every LLM has a finite context window. In single-turn interactions, this rarely matters. In multi-turn agent loops that call tools, retrieve documents, and accumulate reasoning traces, the window fills up. Context compaction is any technique that reduces accumulated context while retaining enough information for the agent to continue working.

The term covers a family of related operations: summarizing earlier conversation turns, extracting only the relevant fragments from retrieved documents, compressing agent trajectory logs, and organizing memories into retrievable hierarchical structures. What unifies them is the goal: keep the agent functional across operations that would otherwise exceed the window limit.

The [survey of context engineering](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md) formalizes this as part of a larger optimization problem. Given context `C = A(c_instr, c_know, c_tools, c_mem, c_state, c_query)` with a hard constraint `|C| <= L_max`, compaction techniques manipulate `c_mem` and `c_know` to stay within budget without losing task-critical information.

## Why It Matters

The naive failure mode is straightforward: an agent runs until its context fills, then errors out or starts hallucinating from truncated input. Less obvious is the degradation that precedes hard failure. As context grows, retrieval from that context becomes noisier, reasoning over long histories becomes less reliable, and the quadratic attention cost (`O(n^2)`) drives latency up.

Compaction addresses all three: it prevents hard cutoffs, improves signal-to-noise in what the model sees, and reduces compute cost. The [asymmetry finding](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md) from context engineering research is relevant here: models understand rich context better than they generate it, so investing in high-quality compressed context pays off more than expecting the model to infer from degraded input.

## Core Mechanisms

### Extractive Compression

Extract verbatim fragments from retrieved documents that are relevant to the current query, discarding the rest. This preserves fidelity but requires an accurate relevance judgment.

The [LangChain LLMChainExtractor](../raw/repos/laurian-context-compression-experiments-2508.md) approach typifies this: given a document and query, instruct the model to copy only directly relevant passages, returning `NO_OUTPUT` if nothing matches. The core prompt constraint is "extract text AS IS" with no paraphrasing.

The failure mode is model-dependent. With a capable model (GPT-4o), this works reliably. With a cheaper fallback (GPT-4o-mini), failure rates can reach 100% on a given document set, with the model returning `NO_OUTPUT` for documents that actually contain relevant content.

Prompt optimization can close this gap. In the [context-compression-experiments](../raw/repos/laurian-context-compression-experiments-2508.md) project, using DSPy GEPA (genetic algorithm-based prompt evolution) improved GPT-4o-mini extraction from 0% to 62% on a test set of 296 documents. TextGrad (gradient-based textual optimization) pushed this to 79%. Chaining GEPA then TextGrad reached 100% extraction rate. These numbers are self-reported from a single production system; the underlying data is domain-specific and not independently validated.

The key lesson: the same compaction task with the same documents can go from total failure to near-perfect with better prompting, without changing the model.

### Abstractive Summarization

Summarize earlier context rather than extract from it. This achieves higher compression ratios but introduces interpretation by the summarizing model, which can lose nuance or introduce errors.

The tradeoff between compression ratio and fidelity is well-documented in the literature but poorly quantified for any specific use case. The survey cites 4-8x compression ratios "with moderate information loss" as typical, but "moderate" is not operationally defined.

In practice, abstractive summarization works better for conversational history (where exact wording matters less) than for retrieved documents (where specific details, numbers, and quotes need to survive intact).

### Hierarchical Memory with Incremental Updates

Rather than compressing context reactively when the window fills, some systems build structured memory proactively. [GAM (General Agentic Memory)](../raw/repos/vectorspacelab-general-agentic-memory.md) demonstrates this approach.

GAM uses LLM-based chunking to identify semantic boundaries in incoming content, generates structured `Memory + TLDR` summaries for each chunk, and organizes these into a hierarchical taxonomy stored on disk. New content appends incrementally without rebuilding existing memory.

The architectural payoff is that queries go against a pre-organized index rather than a raw context dump. This separates the memory-building pass (which can be expensive and offline) from the retrieval pass (which needs to be fast and cheap).

GAM supports long text, video, and agent trajectory compression. The trajectory use case maps most directly to context compaction: compress reasoning steps and tool call logs from earlier in a long agent run into structured memory that can be queried as needed.

### Tiered Storage

Related to hierarchical memory, tiered storage treats context as having temperature. Hot context (recent turns, current task state) stays in the context window. Warm context (session history, related facts) lives in fast retrieval. Cold context (older sessions, archived knowledge) goes to longer-term stores.

The context engineering survey frames this as a budget allocation problem: the context window is not a dump for all available information, it is a curated selection from multiple tiers. Compaction in this framing is the process of moving information from hot to warm or cold as it ages out of immediate relevance.

## Implementation Architecture

A production compaction pipeline typically has three components:

**Trigger logic**: Monitor context length and fire compaction before hitting the limit, not at it. Common approaches: compact when window is 70-80% full, compact after every N turns, compact when a new large document is about to be added.

**Selection logic**: Decide what to compact. Oldest-first is simple but loses recent context that may still be relevant. Relevance-to-current-task scoring is more accurate but requires a relevance judgment, which itself consumes tokens.

**Compaction operation**: Apply the chosen technique (extraction, summarization, hierarchical indexing) and replace the original context segments with the compacted version.

The DSPy and TextGrad optimization approach in the [compression experiments](../raw/repos/laurian-context-compression-experiments-2508.md) targets the compaction operation specifically: given a fixed extraction task, learn better prompts from examples of successes and failures. The tooling (`dspy_gepa_optimizer.py`, `textgrad_optimizer.py`) treats the prompt as a tunable parameter and optimizes it against a labeled dataset.

## Failure Modes

**Silent information loss**: Compaction removes context the agent needed but didn't know it needed yet. This shows up later as hallucination or reasoning errors that trace back to discarded context. Hard to detect without extensive logging.

**Compaction model errors**: Using a cheaper model for compression to save cost, only to have it extract incorrectly or summarize inaccurately. The [compression experiments](../raw/repos/laurian-context-compression-experiments-2508.md) document this concretely: GPT-4o-mini failed on 100% of a test set with the baseline prompt. If you compress with a weak model and don't validate output quality, you may be silently corrupting your agent's knowledge base.

**Compression ratio overconfidence**: Achieving high compression ratios on a benchmark dataset does not mean the same ratio is safe in production. Domain-specific technical content often requires exact terminology that summarization erases.

**Recursive compaction degradation**: Compacting already-compacted summaries progressively degrades information. Systems that summarize summaries eventually produce coherent but empty text.

## When Not To Use It

If your task requires exact recall of prior conversation content, lossy compaction is wrong. Legal, medical, or compliance applications where specific prior statements matter need lossless approaches (external storage with exact retrieval) rather than summarization.

If context window utilization is consistently low, compaction adds complexity without benefit. Measure before building.

If your agent trajectory is short (under a few thousand tokens), the overhead of compaction machinery outweighs the benefit.

## Infrastructure Assumptions

Most compaction systems assume you have LangFuse or equivalent tracing in place to identify failure cases. The [compression experiments](../raw/repos/laurian-context-compression-experiments-2508.md) project starts from "I filtered 1000+ gpt-4o-mini traces from LangFuse that failed contextual compressions." Without that observability, you cannot know your compaction is failing, and you cannot build the labeled dataset needed to fix it.

The prompt optimization approach assumes you can construct a labeled dataset: document-query pairs where you know the right extraction behavior. This requires either human annotation or a stronger model generating ground truth, both of which have costs.

## Unresolved Questions

**Compression ratio limits**: The field lacks clear guidance on how much compression is safe for which content types. The 4-8x figure from the survey applies to unspecified benchmarks.

**Evaluation**: Standard NLP metrics (ROUGE, BLEU) measure textual overlap, not whether the compressed context preserves task-relevant information. The [compression experiments](../raw/repos/laurian-context-compression-experiments-2508.md) use semantic similarity at the sentence level, acknowledging this may introduce false positives from repeated sentences.

**Optimal trigger timing**: No established theory for when to compact. Systems use heuristics.

**Multi-agent shared context**: When multiple agents share a context store, compaction by one agent can discard information another agent needs. The survey flags this as an open problem.

## Alternatives and Selection Guidance

**Use [RAG](../concepts/retrieval-augmented-generation.md) when** the information fits in a well-indexed corpus and can be retrieved on demand rather than kept in context. RAG avoids compaction by not putting the full document set in context in the first place.

**Use exact external storage** (databases, vector stores with original text) when fidelity is critical and you can afford retrieval latency.

**Use hierarchical memory (GAM-style)** when the agent runs for extended periods and accumulates knowledge that needs to be queryable, not just summarized.

**Use extractive compression** when retrieving documents into context and you can afford a compaction pass. The [compression experiments](../raw/repos/laurian-context-compression-experiments-2508.md) demonstrate that prompt optimization can make cheap models viable for this task.

**Use abstractive summarization** for conversational history where exact wording is less critical than preserving the gist of decisions made and context established.
