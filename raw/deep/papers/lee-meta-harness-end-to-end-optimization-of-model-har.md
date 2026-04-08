---
url: 'https://arxiv.org/abs/2603.28052'
type: paper
author: >-
  Yoonho Lee, Roshen Nair, Qizheng Zhang, Kangwook Lee, Omar Khattab, Chelsea
  Finn
date: '2026-03-30'
tags:
  - context-engineering
  - self-improving
  - rag
  - agentic-skills
  - harness-optimization
  - automated-engineering
  - execution-traces
key_insight: >-
  Model harnesses (the code controlling what information LLMs receive) create up
  to 6x performance gaps on the same benchmark, yet are hand-engineered. Meta-
  Harness automates harness optimization by giving a coding agent filesystem
  access to all prior candidates' source code, execution traces, and scores --
  achieving +7.7 points over ACE on classification (with 4x fewer tokens) and
  +4.7 points on IMO-level math across 5 held-out models. The critical finding:
  full execution trace access is essential (50.0 vs 34.6 accuracy without it),
  because compressed summaries lose the causal signal needed for systematic
  improvement.
deep_research:
  method: paper-full-text
  text_length: 12000
  analyzed_at: '2026-04-04'
  original_source: papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
relevance_scores:
  topic_relevance: 9
  practitioner_value: 9
  novelty: 9
  signal_quality: 9
  composite: 9
  reason: >-
    Meta-Harness directly addresses automated harness/context engineering
    optimization via a self-improving outer loop with full execution trace
    access — a core pattern for agent infrastructure practitioners covering
    context engineering, self-improving systems, and agent architecture
    simultaneously.
---

## Architecture Overview

Meta-Harness is an outer-loop system that automatically searches over harness code for LLM applications. A "harness" is the code that determines what information to store, retrieve, and present to the model -- it encompasses prompt construction, retrieval logic, memory management, and state orchestration around a fixed language model.

The key insight: harness changes alone can produce up to 6x performance gaps on the same benchmark with the same model, making harness engineering as impactful as model selection. Yet harnesses are still designed manually.

The system operates through an iterative loop:

1. **Proposer Inspection:** A coding agent (Claude Code with Opus-4.6) queries a filesystem containing all prior candidates' implementations, evaluation scores, and execution traces. The proposer reads a median of 82 files per iteration, referencing over 20 prior candidates.

2. **Proposal Generation:** The proposer generates k new harness variants based on inspection and hypotheses about failure modes. Modifications range from prompt tweaks to algorithmic rewrites.

3. **Evaluation and Logging:** Proposed harnesses undergo evaluation. All outputs (code, scores, traces) are stored in filesystem directories.

4. **Iteration:** The cycle repeats for N iterations.

The critical design choice: the proposer accesses raw execution history (up to 10,000,000 tokens per evaluation) rather than compressed summaries. Prior text optimizers operate with only 0.002-0.026 million tokens per iteration. Meta-Harness uses approximately 10 million tokens per iteration -- three orders of magnitude more diagnostic information.

## Core Mechanism

### The Optimization Objective

For a fixed language model M and task distribution X:

H* = argmax_H E[r(tau, x)]

where tau represents execution trajectories and r(tau, x) is a task-specific reward function. The search is unconstrained -- no parent-selection rules, no fixed mutation operators. The proposer can make any code change, from minor prompt edits to complete algorithmic redesigns.

### Why Full Trace Access Matters

The ablation study is definitive:
- Scores only: 34.6 median accuracy
- Scores + summaries: 34.9 median accuracy
- Full filesystem access (Meta-Harness): 50.0 median accuracy

Summaries do not recover the signal lost by compressing execution traces. The proposer needs to see raw failures -- specific examples where the system failed, the exact prompts that were constructed, the retrieval results that were returned -- to form causal hypotheses about what went wrong and how to fix it.

### Proposer Causal Reasoning

The paper documents sophisticated causal reasoning by the proposer. On TerminalBench-2:

1. Observed two consecutive regressions from bundled structural + prompt changes
2. Identified that shared prompt interventions confounded the results
3. Explicitly stated: "Prior attempts regressed. Root cause: Prompt template changes caused the agent to delete necessary state before task completion."
4. Isolated structural fixes from prompt rewrites
5. After five regression failures, pivoted to purely additive modifications, reasoning: "All prior iterations regressed because they modified the completion flow, prompt template, or observation processing. This takes a different approach -- purely additive."

This demonstrates that full-history access enables the proposer to move beyond trial-and-error to causal analysis -- understanding not just what failed but why, and adjusting strategy accordingly.

### Discovered Harness Patterns

**Text Classification (Draft Verification):** Two-stage procedure: (1) retrieve 5 similar examples for draft prediction, (2) retrieve confirmers and challengers conditioned on the draft label for verification. Lower context cost (5.4K tokens).

**Text Classification (Label-Primed Query):** Single call combining label primer (all valid outputs), coverage block (one example per label), and contrastive pairs (similar examples with different labels). Highest accuracy (48.6%) with 45.5K context tokens.

**Math Retrieval (Subject-Specific Router):** Four-route lexical router over BM25 retrieval:
- Combinatorics: BM25@20, deduplicate to 8, rerank, keep top 3
- Geometry: 1 hard reference + 2 BM25 neighbors
- Number Theory: BM25@12, rerank with technique-early bonus, keep 3
- Default: BM25@10, adaptive count based on score concentration

**Agentic Coding (Environment Bootstrapping):** Added environment snapshot injection before the agent loop: collect OS, language availability, package managers, and memory state. Reduces 3-5 wasted exploration turns on dependency-heavy tasks.

## Design Tradeoffs

**Full trace access vs. cost:** Processing ~10 million tokens per iteration is expensive. The proposer (Claude Code with Opus-4.6) consumes substantial API budget per iteration. But the ablation shows this is essential -- compressed summaries lose the causal signal. The tradeoff: higher per-iteration cost but dramatically fewer iterations needed (Meta-Harness matches competitors' final performance within 4 evaluations vs their full search budget).

**Unconstrained search vs. structured mutation:** Meta-Harness imposes no constraints on what the proposer can modify. This enables radical redesigns but also enables regressions. The proposer must learn from its own history to avoid destructive changes. The TerminalBench example shows this self-correction in action.

**Code-level optimization vs. prompt-level optimization:** Most prior work optimizes prompts (text). Meta-Harness optimizes entire harness code -- including retrieval logic, routing decisions, memory management, and prompt construction code. This is strictly more expressive but the search space is vastly larger.

**Single harness vs. ensemble:** Meta-Harness discovers a single reusable harness rather than per-instance adaptation. This means it finds strategies that work well on average but may not be optimal for every individual input. The math routing system partially addresses this through subject-specific policies.

**Proposer-model coupling:** The proposer is Claude Code with Opus-4.6 but the discovered harnesses can use any model. This asymmetry -- powerful proposer, potentially cheaper deployment model -- is a practical advantage.

## Experimental Results

### Online Text Classification

20 iterations, 2 candidates per iteration. GPT-OSS-120B classifier on three datasets.

| Harness | USPTO | S2D | Law | Avg Acc | Context (K tokens) |
|---------|-------|-----|-----|---------|---------------------|
| Zero-Shot | 12.0 | 63.2 | 7.0 | 27.4 | 0 |
| Few-Shot (32) | 13.0 | 72.2 | 21.0 | 35.4 | 7.9 |
| ACE | 16.0 | 77.8 | 29.0 | 40.9 | 50.8 |
| Meta-Harness | 14.0 | 86.8 | 45.0 | 48.6 | 11.4 |

Meta-Harness: +7.7 over ACE, 4x fewer context tokens.

Comparison with text optimizers:
| Method | Median Acc | Best Acc |
|--------|-----------|----------|
| GEPA | 32.6 | 40.2 |
| OpenEvolve | 39.1 | 43.3 |
| TTT-Discover | 34.1 | 45.6 |
| Meta-Harness | 50.0 | 56.7 |

Meta-Harness matches competitors' final performance within 4 evaluations (10x fewer full evaluations).

Out-of-distribution transfer (9 unseen datasets):
| Harness | Avg Acc | Context |
|---------|---------|---------|
| ACE | 70.2 | 11.7K |
| Meta-Harness | 73.1 | 7.3K |

Outperforms all baselines on 6/9 unseen datasets while using fewer tokens.

### Retrieval-Augmented Math Reasoning

40 iterations, 109 candidates total. Searched on 250-problem OlympiadBench + Omni-MATH; evaluated on 200 IMO-level problems across 5 held-out models.

| Method | GPT-5.4n | GPT-5.4m | Gem-3.1FL | Gem-3F | GPT-20B | Avg |
|--------|----------|----------|-----------|--------|---------|-----|
| No Retriever | 23.0 | 28.8 | 28.6 | 42.6 | 47.6 | 34.1 |
| Dense (k=5) | 31.1 | 28.3 | 37.1 | 47.2 | 46.7 | 38.1 |
| BM25 | 30.2 | 29.2 | 32.8 | 46.6 | 48.9 | 37.5 |
| Meta-Harness | 31.7 | 30.4 | 34.9 | 46.3 | 50.6 | 38.8 |

+4.7 points average across 5 held-out models. Avoids the regressions observed with dense retrieval on certain models (GPT-5.4m, GPT-20B).

### TerminalBench-2 Agentic Coding

89 tasks, search and evaluation on same set.

| Model | Meta-Harness | Terminus-KIRA | Best Reported |
|-------|--------------|---------------|---------------|
| Claude Opus 4.6 | 76.4% | 74.7% | 81.8% (ForgeCode) |
| Claude Haiku 4.5 | 37.6% | 33.7% | 35.5% (Goose) |

Ranked #2 among all Opus 4.6 agents, #1 among all Haiku 4.5 agents on the leaderboard.

### Ablation: Trace Access Granularity

| Access Level | Median Accuracy |
|-------------|----------------|
| Scores only | 34.6 |
| Scores + summaries | 34.9 |
| Full filesystem (Meta-Harness) | 50.0 |

Summaries add only +0.3 over scores. Full access adds +15.4. This is the paper's most important ablation -- it proves that compressed feedback destroys the causal signal needed for systematic improvement.

## Failure Modes & Limitations

**Proposer model dependency:** All experiments use Claude Code with Opus-4.6 as the proposer. Results may not generalize to weaker proposer agents. The sophisticated causal reasoning observed requires a highly capable model.

**Cost of full trace access:** ~10 million tokens per iteration is expensive. For tasks with smaller diagnostic output, the cost may be more manageable, but for complex agentic tasks, the cost accumulates rapidly.

**Specialization risk on small benchmarks:** The TerminalBench harness is optimized on 89 tasks and evaluated on the same 89 tasks (no held-out set). The discovered modification (environment bootstrapping) is likely general, but overfitting to specific task patterns is possible.

**Co-evolution not explored:** Meta-Harness optimizes the harness with fixed model weights. Co-evolving harness code and model weights (letting the strategy shape what the model learns) could unlock additional improvements but is identified as future work.

**Single-harness optimization:** The system discovers one reusable harness rather than input-specific harnesses. For tasks with highly variable input characteristics, a routing mechanism that selects among multiple discovered harnesses might be more effective (the math system partially does this).

## Practical Implications

**For builders of LLM systems:**

1. **Harness engineering is as impactful as model selection.** The 6x performance gap from harness changes alone means you should invest as much effort in optimizing your retrieval, prompting, and memory management code as in choosing your model. Meta-Harness automates this investment.

2. **Give your optimizer full execution traces, not summaries.** The +15.4 accuracy gap between full trace access and summaries is the paper's key finding. If you are building any system that iteratively improves its own configuration (ACE, DGM, or custom self-improvement loops), provide the improvement mechanism access to raw execution data, not compressed summaries.

3. **The discovered harness patterns are directly reusable.** The draft-verification pattern (retrieve, draft, then retrieve confirmers/challengers) and the subject-specific routing pattern (classify input, route to specialized retrieval policies) are transferable to any RAG or classification system.

4. **Environment bootstrapping is a low-cost high-impact pattern.** Adding a pre-execution environment snapshot (available tools, languages, packages) to agentic systems reduces wasted exploration turns. This is trivially implementable and provides immediate benefit.

5. **Harness optimization is a complement to ACE's context engineering.** ACE evolves the content of context (what knowledge to include); Meta-Harness evolves the code that constructs context (how to retrieve, filter, format, and present knowledge). These are orthogonal and can be combined.

**Connection to other papers:**
- ACE prevents context collapse through incremental deltas; Meta-Harness optimizes the entire harness code end-to-end
- The DGM's self-improvement loop (analyze failures -> propose changes -> validate) is structurally similar to Meta-Harness's optimization loop
- The Agentic Researcher's methodological rules are a manually-designed harness; Meta-Harness could potentially discover such rules automatically
- Reflexion's verbal self-reflection is a form of compressed feedback; Meta-Harness shows full traces are dramatically better

**Gap between paper and production:** Meta-Harness requires a capable proposer (Opus-4.6 class) and substantial compute budget (~10M tokens/iteration). For production adoption, consider: running Meta-Harness offline to discover harness designs, then deploying the discovered harness statically; using the discovered patterns (draft-verification, subject routing, environment bootstrapping) as manual engineering guidelines; or running shorter optimization cycles focused on specific bottlenecks identified through trace analysis.
