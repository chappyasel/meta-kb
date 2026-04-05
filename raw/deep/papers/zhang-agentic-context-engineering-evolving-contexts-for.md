---
url: 'https://arxiv.org/abs/2510.04618'
type: paper
author: >-
  Qizheng Zhang, Changran Hu, Shubhangi Upasani, Boyuan Ma, Fenglu Hong,
  Vamsidhar Kamanuru, Jay Rainton, Chen Wu, Mengmeng Ji, Hanchen Li, Urmish
  Thakker, James Zou, Kunle Olukotun
date: '2025-10-06'
tags:
  - context-engineering
  - agent-memory
  - self-improving
  - context-collapse
  - playbook-evolution
  - long-context-optimization
  - execution-feedback
key_insight: >-
  ACE's incremental delta updates (append bullets with metadata counters instead
  of rewriting contexts) prevent context collapse -- the progressive information
  loss that occurs when LLMs iteratively summarize their own context. The key
  practical finding: treating contexts as evolving playbooks with structured
  grow-and-refine achieves +10.6% on agent benchmarks and 82-92% cost reduction
  vs alternatives, while working without labeled data by using execution feedback
  as the learning signal.
deep_research:
  method: paper-full-text
  text_length: 9500
  analyzed_at: '2026-04-04'
  original_source: papers/zhang-agentic-context-engineering-evolving-contexts-for.md
---

## Architecture Overview

ACE (Agentic Context Engineering) is a framework that treats LLM contexts as evolving playbooks rather than static prompts. It addresses two failure modes that plague existing context adaptation methods:

**Brevity bias:** LLMs summarizing context tend to drop detailed domain insights in favor of concise generalizations. A prompt optimization system might collapse "When parsing financial XBRL filings, always check the decimals attribute before the scale attribute because European filings use different decimal conventions" into "Parse financial filings carefully" -- losing the actionable detail.

**Context collapse:** When contexts are iteratively rewritten by LLMs (each version summarizing the previous), information degrades over rounds. After 5-10 iterations, the context converges to generic instructions that have lost all task-specific knowledge. This is the context equivalent of lossy compression applied repeatedly.

The architecture uses three specialized components:

**Generator:** Produces reasoning trajectories and execution paths. This component runs the agent on tasks and surfaces both effective strategies and failure modes. It generates the raw material for learning.

**Reflector:** Critiques execution traces to extract concrete lessons. It can operate over multiple refinement iterations before distillation, progressively improving the quality of extracted insights. This is where the LLM analyzes "what worked, what failed, and why."

**Curator:** Synthesizes extracted lessons into compact delta entries -- small, structured bullets that merge deterministically into the existing context using non-LLM logic. This is the key architectural choice: the merge operation is algorithmic, not LLM-driven, preventing the LLM from rewriting (and collapsing) the full context.

## Core Mechanism

### Incremental Delta Updates

Instead of full context rewrites, ACE produces "candidate bullets" -- itemized knowledge units with:
- **Unique identifier:** For tracking and deduplication
- **Helpful/harmful counters:** Track how often this bullet was associated with successful vs failed executions
- **Content:** Reusable strategies, domain concepts, failure patterns, or environment-specific knowledge

New bullets append to the context while existing ones update in-place (incrementing counters). This grow-and-refine mechanism means the context monotonically accumulates knowledge rather than losing it through rewriting.

### Semantic Deduplication

As the context grows, semantic embedding-based deduplication prunes redundant bullets. This can be done proactively (after each delta) or lazily (when context window limits are approached). The deduplication uses embeddings rather than exact matching, so bullets expressing the same insight in different words are caught.

### Non-LLM Merge Logic

The curator merges deltas into the existing context using deterministic logic, not LLM rewriting. This is the critical design choice that prevents context collapse. When an LLM rewrites the full context to incorporate new information, it applies its brevity bias. When a deterministic merge simply appends new bullets and updates counters on existing ones, no information is lost.

### Online vs Offline Modes

**Offline (system prompt optimization):** ACE processes a batch of training examples, extracts lessons via generator/reflector, and curates them into an optimized system prompt. This runs before deployment.

**Online (agent memory):** ACE operates as a memory system during agent execution. After each task or interaction, the reflector extracts lessons from the execution trace and the curator adds them to the agent's evolving context. The agent improves over time without weight updates.

### Label-Free Learning

ACE can operate without ground-truth labels by using execution feedback as the learning signal. For coding agents, code execution provides clear success/failure signals. For tool-using agents, API responses indicate correctness. This is a significant practical advantage -- most production agent systems have execution feedback available but not labeled training data.

## Design Tradeoffs

**Append-only growth vs. bounded context:** The grow-and-refine mechanism causes contexts to grow over time. Without deduplication, they will eventually exceed context window limits. The lazy deduplication approach delays this but does not eliminate it. Production deployments need to set maximum context budgets and implement pruning strategies (e.g., remove bullets with low helpful/harmful ratios).

**Deterministic merge vs. LLM-driven synthesis:** The non-LLM merge prevents context collapse but also prevents sophisticated reorganization. An LLM might notice that three separate bullets could be combined into a more coherent guideline, but the deterministic merge cannot make this judgment. The system trades synthesis quality for collapse prevention.

**Bullet granularity:** Each bullet is an atomic knowledge unit. Too fine-grained (one fact per bullet) creates many small bullets that are hard to use in context. Too coarse-grained (one paragraph per bullet) makes deduplication less effective and reduces the benefit of incremental updates.

**Execution feedback dependency:** The label-free mode works well when execution feedback is reliable (code compilation, API success/failure) but degrades when feedback is noisy or unavailable. For subjective tasks (writing quality, design decisions), the system needs labeled data or human feedback.

## Experimental Results

### Agent Benchmark: AppWorld

**Offline adaptation (system prompt optimization):**
- ACE + DeepSeek-V3.1: 76.2% TGC on test-normal (+12.5% vs ReAct baseline of 63.7%)
- SGC improvement: +21.4%
- Label-free mode: +14.8% improvement without ground-truth labels

**Online adaptation (evolving memory):**
- +5.9% TGC improvement over baseline
- Outperforms Dynamic Cheatsheet by +7.6% average

**AppWorld Leaderboard:**
- ACE with DeepSeek-V3.1 (open-source model): 59.4% average, matching IBM-CUGA (GPT-4.1-based production agent)
- On harder test-challenge split: ACE exceeds IBM-CUGA by +8.4% TGC
- This result is notable because ACE uses a smaller, open-source model and matches/beats a production system built on a more capable model

### Financial Domain (FiNER & Formula)

**Offline:**
- FiNER: +7.6% accuracy vs baseline
- Formula: +18.0% vs baseline
- Average: +12.8%

**Online:**
- FiNER: +6.0% vs baseline
- Formula: +9.0% vs baseline
- Average: +7.5%

**Important caveat:** Performance degrades significantly without reliable feedback signals. The financial domain results depend on having ground-truth labels or clear execution outcomes. Without these, adaptation quality drops substantially.

### Efficiency Metrics

| Metric | ACE vs GEPA (offline) | ACE vs Dynamic Cheatsheet (online) |
|--------|----------------------|-------------------------------------|
| Adaptation latency | -82.3% | -91.5% |
| Rollout cost | -75.1% | -- |
| Token cost | -- | -83.6% |

These efficiency gains come from the incremental delta approach -- instead of reprocessing the entire context each round, ACE only processes new information and merges small deltas.

### Ablation Study (AppWorld)

| Configuration | Average Improvement |
|---------------|-------------------|
| Without reflector + without multi-epoch | +12.7% |
| Without multi-epoch only | +14.4% |
| Full ACE | +17.0% |
| Baseline | 42.4% |

The reflector adds +1.7% and multi-epoch adaptation adds +2.6% on top of the base framework. Both are meaningful but the core mechanism (incremental delta updates) provides the bulk of the improvement.

## Failure Modes & Limitations

**Context collapse is prevented, not eliminated.** The deduplication process is itself a form of information loss -- when two similar bullets are merged, some nuance may be lost. Over many rounds, the deduplication process could gradually erode detail, creating a slower version of the collapse problem.

**Feedback dependency is critical.** Without reliable execution feedback (or labeled data), ACE cannot distinguish helpful from harmful strategies. The financial domain results show significant degradation without reliable signals. This limits applicability to domains with clear success/failure indicators.

**Simple tasks do not benefit.** The paper notes that simpler tasks (e.g., HotPotQA) "often benefit more from concise instructions than lengthy contexts." ACE's growing playbooks add overhead that is not justified for straightforward tasks. The system is designed for complex, multi-step tasks with rich domain knowledge.

**Reflector quality depends on base model capability.** Weak models produce noisy reflections, which propagate as low-quality bullets into the context. There is no mechanism to detect and filter poor-quality reflections beyond the helpful/harmful counters, which require multiple rounds of feedback to become reliable.

**No structural organization of bullets.** The context is a flat list of bullets, not organized into sections, hierarchies, or categories. As the context grows to hundreds of bullets, retrieval and coherence may degrade. A-MEM's linking and Zep's community detection both address this problem; ACE does not.

## Practical Implications

**For builders of self-improving agent systems:**

1. **The incremental delta pattern prevents context collapse.** If your system evolves its prompts or memory through LLM rewriting, you are likely experiencing context collapse. Switch to append-only deltas with deterministic merging and semantic deduplication. This is the paper's most immediately transferable pattern.

2. **Execution feedback is a free learning signal.** If your agent executes code, calls APIs, or interacts with environments, those outcomes are supervision signals you can use to improve context without labeled data. ACE demonstrates this achieves +14.8% improvement on agent benchmarks -- nearly as good as supervised adaptation.

3. **The helpful/harmful counter pattern is simple and powerful.** Tracking how often each piece of context knowledge is associated with successful vs failed executions provides a natural quality signal. Strategies with high harmful/low helpful ratios can be pruned; those with high helpful counts are validated.

4. **The cost reduction is the practical selling point.** 82-92% reduction in adaptation latency and 75-84% reduction in token cost compared to alternatives (GEPA, Dynamic Cheatsheet) makes this approach viable for production. The efficiency comes from processing only deltas rather than full contexts each round.

5. **Combine with structural organization for scale.** ACE's flat bullet list will not scale to thousands of knowledge items. Combine the incremental delta mechanism with hierarchical organization (like A-MEM's Zettelkasten linking or Zep's community detection) for production systems that need to manage large amounts of evolved context.

**Gap between paper and production:** ACE is well-suited for production adoption because it separates the LLM-driven learning (generator, reflector) from the deterministic knowledge management (curator, merge logic). The curator/merge can be implemented as straightforward data structure operations. The main gaps: no structural organization of accumulated knowledge, no mechanism for knowledge deprecation beyond counter ratios, and dependency on reliable execution feedback for unsupervised operation.
