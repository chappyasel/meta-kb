---
entity_id: lost-in-the-middle
type: concept
bucket: context-engineering
abstract: >-
  Lost in the Middle: LLMs systematically underperform on information positioned
  mid-context, with 20%+ accuracy drops, forcing practitioners to engineer
  context placement rather than simply append retrieved documents.
sources:
  - articles/gustycube-an-annoyed-computer-scientist-markdown-is-not-memory.md
  - >-
    articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md
  - repos/microsoft-llmlingua.md
  - tweets/akshay-pachaar-the-anatomy-of-an-agent-harness.md
related:
  - retrieval-augmented-generation
  - claude-code
last_compiled: '2026-04-08T23:09:11.941Z'
---
# Lost in the Middle

**Type:** Concept | **Bucket:** Context Engineering | **Part of:** [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)

## What It Is

Lost in the Middle is an empirically documented failure mode of transformer-based LLMs: model accuracy degrades substantially when relevant information appears in the middle of a long context window, even when that information is technically within the model's stated context limit. Performance is highest when relevant content appears at the very beginning or end of the prompt.

The phenomenon was documented in the 2023 Stanford/Meta paper "Lost in the Middle: How Language Models Use Long Contexts" (Liu et al., arXiv:2307.03172). Tested across GPT-3.5-Turbo, GPT-4, Claude-1.3, and several open-weight models on multi-document question answering and key-value retrieval tasks, the study found accuracy drops exceeding 20 percentage points when the gold document was placed mid-context versus at the start or end. On a 20-document QA task, some configurations fell *below closed-book performance*, meaning adding retrieved documents actively hurt answers. [Source: Agentic RAG failure modes article](../raw/articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md)

## Why It Happens

Transformer attention is not uniform across sequence positions. Several mechanisms contribute:

**Primacy and recency bias in attention.** Empirically, attention scores cluster toward the beginning and end of long sequences. Content in middle positions competes for attention against a larger number of tokens and receives lower mean attention weight.

**Positional encoding degradation.** As context length grows beyond training distribution, positional embeddings represent distances the model has seen less frequently during training. Middle positions in very long contexts sit in this degraded zone.

**Instruction-following interference.** System prompts and user instructions typically anchor the beginning of context. As content between the instruction and the end grows, the model's ability to maintain coherent instruction-following attenuates. Anthropic's context engineering guide frames this as an "attention budget" problem: every irrelevant or peripheral token competes with the tokens actually needed for the task.

The effect is not fixed at a single threshold. It scales with context length: the longer the context, the more severe the mid-position penalty. Extended context models (1M+ tokens) exhibit instruction-following degradation even when content fits comfortably within the technical window.

## Concrete Measurements

- 20+ percentage point accuracy drop on multi-document QA when gold document shifts from position 0 or position N to middle positions (Liu et al., 2023; independently cited in production tooling documentation)
- Accuracy on some 20-document configurations falls below zero-retrieval (closed-book) baseline, meaning naive retrieval augmentation is strictly harmful in those configurations
- Separate practitioner research cites 30%+ performance degradation on mid-window content (cited by Chroma and reproduced in LangChain harness analysis)
- LongLLMLingua (Microsoft) reports RAG performance improvement of up to 21.4% using only 1/4 of tokens by reordering retrieved documents to avoid mid-context placement [Source: LLMLingua README](../raw/repos/microsoft-llmlingua.md)

**Credibility note:** The core 20-point finding comes from the original Stanford/Meta paper (peer-reviewed, EMNLP 2023). The 30% figure circulates in practitioner writing and product documentation without a single canonical citation; treat it as directionally consistent but not independently verified. The LongLLMLingua 21.4% improvement is self-reported in the ACL 2024 paper by the system's authors.

## How It Manifests in Practice

**Naive RAG pipelines.** A retriever returns 10-20 document chunks sorted by relevance score. The most relevant chunks end up in the middle (positions 3-17 of 20) because practitioners often pad with lower-relevance context. The model answers from chunks 1 and 20. The best evidence is invisible in effect.

**Agent context accumulation.** In agentic loops, tool outputs append sequentially. Early tool results land at the start, recent results land at the end. Results from turn 4 of a 12-turn task sit mid-context and receive degraded attention. This compounds with [Context Compression](../concepts/context-compression.md) failures: compressed summaries often flatten into a mid-context block.

**Long instruction templates.** Developers pad system prompts with extensive background, then follow with retrieved documents, then close with the user's actual question. The retrieved documents sit in the middle. [CLAUDE.md](../concepts/claude-md.md) files read before task instructions exhibit this pattern.

**Multi-document reasoning.** Tasks requiring synthesis across 10+ documents (contract review, research summarization) structurally place most evidence in mid-context. This is where the below-closed-book failure mode is most likely to appear.

The [Agent Harness](../concepts/agent-harness.md) analysis of production systems names this directly: "Important context is positioned at the beginning and end of the prompt" as a deliberate engineering practice, not an accident. [Source: Anatomy of an Agent Harness](../raw/tweets/akshay-pachaar-the-anatomy-of-an-agent-harness.md)

## Mitigation Strategies

### Context Position Engineering

Place the highest-relevance content at the start or end of the prompt. For RAG, reorder retrieved chunks so the top-k by relevance appear first and last, with lower-relevance chunks in the middle (or excluded). LongLLMLingua implements this as `reorder_context="sort"` with a `rank_method="longllmlingua"` parameter that scores documents for question-conditioned relevance before injecting them.

### Context Compression

Reduce total context size so the "middle" region shrinks. LLMLingua achieves up to 20x prompt compression via a small model scoring token importance; LongLLMLingua extends this with question-aware compression that preferentially retains tokens near the query's semantic neighborhood. At lower compression ratios, the lost-in-the-middle effect diminishes because fewer tokens exist between the start and end anchors. [Source: LLMLingua README](../raw/repos/microsoft-llmlingua.md)

### Just-in-Time Retrieval

Rather than loading full documents into context, load lightweight identifiers (filenames, chunk IDs) and retrieve specific passages on demand. [Claude Code](../projects/claude-code.md) implements this with `grep`, `glob`, `head`, and `tail` as primary exploration tools, loading full file content only when a specific region is needed. This keeps total context small and relevant content near the current turn boundary.

### Observation Masking

In agentic loops, hide old tool outputs while preserving tool call records. JetBrains' Junie agent uses this pattern: the model can see what it *did* (tool calls) but not the full raw output, which compresses mid-context noise without losing the action trace.

### Sub-Agent Delegation

Each sub-agent receives a focused context for a bounded subtask and returns a condensed summary (1,000-2,000 tokens). The orchestrator sees summaries rather than raw evidence, keeping its context small enough that the lost-in-the-middle zone is narrow. [Multi-Agent Systems](../concepts/multi-agent-systems.md) architectures use this as a primary context management strategy.

### Summarization and Compaction

When context approaches window limits, summarize historical turns before the threshold. Claude Code's compaction preserves architectural decisions, unresolved bugs, and open questions while discarding redundant tool outputs. The compressed summary lands at the start of the next context window, not in the middle.

## Failure Modes This Creates Downstream

**Retrieval thrash in agentic RAG.** An agent retrieves documents, fails to notice the relevant passage buried mid-context, concludes its evidence is insufficient, and retrieves again. Each iteration adds more content to the middle. The agent accumulates bloat without gaining signal. [Source: Agentic RAG failure modes](../raw/articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md)

**Flat file memory degradation.** MEMORY.md-style architectures dump all agent memories into a single block injected mid-prompt. Memories on lines 87-150 receive degraded attention. Practitioners observing "the agent forgot X" are often observing lost-in-the-middle on their memory block, not a fundamental model failure. [Source: Markdown Is Not Memory](../raw/articles/gustycube-an-annoyed-computer-scientist-markdown-is-not-memory.md)

**Instruction-following collapse at scale.** As context grows, models follow instructions in the system prompt less reliably. The system prompt is fixed at position 0, but its *effective* influence competes against increasingly many mid-context tokens. Tool definitions, safety instructions, and output format requirements all degrade.

## What It Implies for System Design

Lost in the Middle reframes context management from a storage problem to a placement problem. The question is not "does this information fit in the context window?" but "where in the context window will the model actually attend to it?"

This has concrete architectural implications:

- [Semantic Search](../concepts/semantic-search.md) and [Vector Database](../concepts/vector-database.md) systems should return fewer, higher-quality results rather than large top-k sets
- [Context Management](../concepts/context-management.md) strategies must treat position as a first-class variable, not an afterthought
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) pipelines need a reranking step that also encodes desired position, not just relevance score
- [Agent Memory](../concepts/agent-memory.md) systems that inject memory as a mid-context block are structurally fighting this effect; typed retrieval systems that surface specific memories at context boundaries do better
- [Short-Term Memory](../concepts/short-term-memory.md) within a turn should be compressed aggressively to prevent the window from growing large enough for the middle penalty to dominate

## Relationship to Extended Context Models

Model providers market extended context windows (128K, 1M tokens) as solutions to context management problems. Lost in the Middle complicates that framing. A 1M-token window still exhibits position-dependent attention; the "middle" is just much larger. Anthropic's context engineering guidance explicitly warns that even models with large windows show instruction-following degradation as context grows, independent of whether the technical limit is reached.

Extended context research like SCBench (Microsoft, 2024) evaluates long-context methods from a KV cache perspective and finds that position-dependent performance gaps persist across model generations, though they narrow with improved positional encoding techniques (RoPE scaling, ALiBi variants). The gap has not been eliminated, only reduced.

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md) — the broader practice of managing what models see and when; Lost in the Middle is one of its primary empirical motivations
- [Context Compression](../concepts/context-compression.md) — reduces window size, shrinking the zone where the penalty applies
- [Context Management](../concepts/context-management.md) — operational strategies for controlling context content and position
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — the system most directly affected by mid-context placement of retrieved documents
- [Agent Memory](../concepts/agent-memory.md) — memory injection strategies that ignore placement create compounding lost-in-the-middle failures
- [Progressive Disclosure](../concepts/progressive-disclosure.md) — load-on-demand patterns that avoid pre-loading full context address this structurally

## Unresolved Questions

**Model-specific thresholds.** The original study predates modern extended-context models. The exact context length at which the penalty becomes operationally significant for GPT-4o, Claude 3.5 Sonnet, and Gemini 1.5 Pro is not publicly documented with controlled comparisons. Practitioners infer from output quality rather than measuring directly.

**Instruction-following vs. retrieval accuracy.** Most published evidence focuses on retrieval accuracy (did the model find the gold document?). The effect on instruction-following, tool call format compliance, and structured output accuracy at varying context lengths is less systematically measured.

**Compression trade-offs at position boundaries.** LongLLMLingua reorders and compresses, but the interaction between compression artifacts and position effects is not fully characterized. A compressed passage placed at position 0 may differ in effective attention from the original uncompressed passage at position 0.
