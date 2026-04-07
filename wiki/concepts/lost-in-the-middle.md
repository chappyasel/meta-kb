---
entity_id: lost-in-the-middle
type: concept
bucket: context-engineering
abstract: >-
  Lost in the Middle: LLMs degrade on information positioned mid-context, with
  20+ percentage point accuracy drops vs. information at context boundaries,
  forcing retrieval and prompt design workarounds.
sources:
  - repos/microsoft-llmlingua.md
  - >-
    articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md
  - articles/gustycube-an-annoyed-computer-scientist-markdown-is-not-memory.md
related:
  - rag
last_compiled: '2026-04-07T00:56:55.140Z'
---
# Lost in the Middle

## What It Is

Lost in the Middle is an empirical phenomenon documented by Liu et al. (2023) at Stanford and Meta AI: language models systematically underperform on tasks where the relevant information sits in the middle of a long input, performing best when that information appears at the start or end. The shape of the performance curve is roughly U-shaped across position.

The original paper, "Lost in the Middle: How Language Models Use Long Contexts" (arXiv:2307.03172), tested GPT-3.5-Turbo, GPT-4, Claude, and several open-source models on multi-document question answering. Across all tested models, accuracy dropped when the relevant document was placed in the middle of 20 documents, and in some configurations fell *below closed-book performance*: adding retrieved context made answers worse than not retrieving at all.

## Why It Happens

The mechanism is not definitively established, but the leading explanation points to how transformer attention distributes across long sequences. Tokens near the beginning benefit from early processing passes; tokens near the end benefit from proximity to the generation step. Middle tokens compete for attention across a longer span without either advantage.

Training data distribution likely reinforces this. Most natural text places important information at the start (topic sentences, introductions) or end (conclusions, summaries). Models trained on this distribution may learn positional priors that persist in inference.

A secondary factor is that instruction-following degrades as context length grows. When a system prompt, retrieved documents, and user query stack up, models begin to lose track of instructions buried in the middle of the context. The [GustyCube analysis](../raw/articles/gustycube-an-annoyed-computer-scientist-markdown-is-not-memory.md) cites Stanford research showing 30%+ performance degradation on mid-context information, consistent with the original findings.

## Measured Impact

The original paper reports accuracy on multi-document QA tasks falling from roughly 70% (relevant document first) to below 50% (relevant document in position 10–15 of 20). In some configurations, accuracy with 20 documents included dropped below performance with *no documents at all*.

These numbers are from the original paper (self-reported by the researchers), but the findings have been replicated widely. The [Towards Data Science analysis of agentic RAG failure modes](../raw/articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md) cites the same study, noting "performance drops of 20+ percentage points when critical information sits mid-context."

Independently, the effect shows up in production observations: agents loading large MEMORY.md files into context, notes about architecture buried at line 87 of a 200-line file, effectively invisible to the model.

## Practical Implications

### For RAG Systems

[Retrieval-Augmented Generation](../concepts/rag.md) pipelines are the primary affected system. If you retrieve 10–20 documents and concatenate them into context, the most relevant document's position matters as much as its relevance score. Standard top-k retrieval does not account for this.

Concrete mitigations:
- **Re-rank by position**: after retrieving, place the highest-relevance document first or last, not in the middle of a list
- **Reduce top-k**: retrieving 5 documents instead of 20 shrinks the zone where middle-position degradation applies; the [Towards Data Science analysis](../raw/articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md) recommends capping top-k at 5–10
- **Compress retrieved chunks**: [Context Compression](../concepts/context-compression.md) tools like LLMLingua (Microsoft, ACL 2024) achieve up to 20x token reduction, shrinking total context length and reducing how deep any single chunk sits; LongLLMLingua specifically targets the "lost in the middle" problem and reports up to 21.4% RAG performance improvement using 1/4 the tokens
- **Deduplicate aggressively**: semantically redundant chunks at positions 8–15 waste the middle-context budget on noise

### For Flat-File Memory Systems

[Agent Memory](../concepts/agent-memory.md) architectures that dump entire markdown files into context are directly exposed. A MEMORY.md with 200 lines, where the critical instruction sits at line 87, may be functionally invisible to the model. [Claude Code](../projects/claude-code.md)'s 200-line hard cap on MEMORY.md means everything past that cap is silently truncated, but everything *before* the cap and *not at the start or end* is degraded. The [GustyCube analysis](../raw/articles/gustycube-an-annoyed-computer-scientist-markdown-is-not-memory.md) names this directly as one of twelve structural failures of flat-file memory.

Structured memory systems that retrieve typed, semantically indexed memories and inject only the relevant subset avoid this entirely. [Mem0](../projects/mem0.md), [Letta](../projects/letta.md), and [Zep](../projects/zep.md) all operate this way. The key principle: put nothing in context that you don't want the model to attend to, because middle-positioned content is exactly what gets ignored.

### For Agentic Pipelines

[Agentic RAG](../concepts/agentic-rag.md) systems running multiple retrieval loops face compounding exposure. Each loop iteration appends more retrieved content. By iteration 3, the first retrieval pass may be buried in the middle of a 15,000-token context window. The [Towards Data Science analysis](../raw/articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md) frames this as "context bloat" and connects it directly to the lost-in-the-middle effect: as the context window fills with low-signal content, instruction-following degrades and the model stops following its own reasoning constraints.

Mitigations for agentic settings:
- Summarise tool outputs before injecting them; a 5,000-token API response can compress to 200 tokens without losing signal
- Cap retrieval iterations at 3; by that point, the first pass is already buried
- Maintain a context token ceiling relative to the model's *effective* window, not its theoretical maximum

## Relationship to Context Window Size

Model developers have marketed context windows of 128K, 200K, and 1M tokens as solutions to retrieval problems. Lost in the Middle complicates this framing. A model with a 200K context window may still fail to use a document placed at position 50K of a 100K context. Window size and *effective* window size are different things.

Empirically, newer models with explicit long-context training (Gemini 1.5 Pro, Claude 3, GPT-4-Turbo) show reduced but not eliminated U-shaped degradation. The original paper's findings applied to older models, so the magnitude of the effect varies by model. The direction does not.

The practical implication: [Context Window](../concepts/context-window.md) expansion does not substitute for retrieval precision. Retrieving fewer, more relevant chunks into a shorter context remains more reliable than retrieving many chunks into a large one.

## Mitigations Summary

| Approach | Mechanism | Trade-off |
|---|---|---|
| Position-aware re-ranking | Place high-relevance chunks first/last | Requires re-ranking step post-retrieval |
| Reduce top-k | Fewer chunks = less middle | May miss relevant documents |
| Prompt compression (LLMLingua) | Shrink total context length | Adds latency; may lose nuance |
| Structured memory retrieval | Inject only retrieved subset, not full file | Requires migration from flat-file systems |
| Chunking strategy | Smaller, denser chunks reduce positional span | Increases retrieval complexity |

## Failure Mode

The concrete failure: a RAG system retrieves 15 documents for a complex query. The ground-truth answer lives in document 8. The model generates a confident but incorrect answer based on documents 1–2 and 14–15. No error is thrown. The system appears to work. This is not a retrieval failure by any standard metric (the right document was retrieved), but the generation failed because of positional attention degradation.

This failure is invisible to standard RAG evaluation that measures only retrieval recall, not position-conditional generation accuracy.

## Unresolved Questions

The literature has not established clear thresholds: at what context length does the effect become practically significant? At what top-k? How much does it vary across model families and fine-tuning strategies? The 2023 paper tested specific models that have since been superseded, and the degree to which training for long-context performance mitigates the effect in current frontier models remains inconsistently documented.

Whether [Chain-of-Thought](../concepts/chain-of-thought.md) prompting improves middle-context recall is also unclear. Reasoning traces may help the model "reach" middle-positioned evidence by referencing it explicitly, but no systematic study of this interaction has been published.

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md): the broader discipline of managing what enters the context window and where
- [Retrieval-Augmented Generation](../concepts/rag.md): the primary system type affected
- [Context Compression](../concepts/context-compression.md): token-reduction techniques that reduce middle-context exposure
- [Agentic RAG](../concepts/agentic-rag.md): multi-turn retrieval loops that compound the effect
- [Context Window](../concepts/context-window.md): the architectural parameter that bounds the problem
- [Hybrid Retrieval](../concepts/hybrid-retrieval.md): retrieval approaches that may reduce top-k through precision improvements
- [Agent Memory](../concepts/agent-memory.md): memory architectures where flat-file dumps create structural lost-in-the-middle exposure
