---
title: The State of Self-Improving Systems
type: synthesis
bucket: self-improving
abstract: >-
  Self-improving agent systems have shifted from theoretical aspiration to
  deployable pattern: the core question moved from "can agents improve
  themselves?" to "which layer do you improve, and how do you prevent the loop
  from breaking?"
source_date_range: 2025-02-17 to 2026-04-05
newest_source: '2026-04-05'
staleness_risk: low
sources:
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - repos/mem0ai-mem0.md
  - repos/human-agent-society-coral.md
  - tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - repos/memento-teams-memento-skills.md
  - tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md
  - repos/memodb-io-acontext.md
  - papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
  - tweets/gauri-gupta-auto-harness-self-improving-agentic-systems-with.md
  - tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md
  - repos/jmilinovich-goal-md.md
  - repos/uditgoenka-autoresearch.md
  - repos/kayba-ai-agentic-context-engine.md
  - tweets/hwchase17-continual-learning-for-ai-agents.md
  - repos/wangyu-ustc-mem-alpha.md
  - repos/maximerobeyns-self-improving-coding-agent.md
  - repos/letta-ai-letta.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - repos/agenticnotetaking-arscontexta.md
  - repos/volcengine-openviking.md
  - repos/nemori-ai-nemori.md
  - papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - papers/xu-a-mem-agentic-memory-for-llm-agents.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
entities:
  - autoresearch
  - gepa
  - reflexion
  - self-improving-agents
  - continual-learning
  - karpathy-loop
  - jeff-clune
  - memevolve
  - voyager
  - grpo
  - evoagentx
  - agentevolver
  - adas
  - darwin-godel-machine
  - synthetic-data-generation
  - llm-as-judge
  - skillweaver
  - meta-evolution
  - iterative-self-verification
  - seagent
  - skill-refinement-loop
last_compiled: '2026-04-06T01:55:56.016Z'
---
# The State of Self-Improving Systems

The question used to be whether agents could improve themselves at all. That question is settled. [Karpathy](concepts/andrej-karpathy.md) demonstrated it empirically with [AutoResearch](projects/autoresearch.md), the [Darwin Gödel Machine](projects/darwin-godel-machine.md) pushed SWE-bench from 20% to 50% through self-rewriting code, and CORAL's multi-agent swarms run overnight on TSP problems and ship better solutions by morning. The new question is architectural: which layer of your system do you improve, at what granularity, and what breaks when the loop runs unsupervised?

## Approach Categories

### Which layer does your improvement loop target?

Harrison Chase's taxonomy in [Continual Learning](concepts/continual-learning.md) cuts this clearly: model weights, agent harness (code and system instructions), or context (memory, skills, configuration). These are independent axes. You can update all three, but they have radically different feedback loops, stability profiles, and blast radii when they go wrong. [Source](../raw/tweets/hwchase17-continual-learning-for-ai-agents.md)

**Category 1: Context/memory layer — fastest feedback, lowest risk**

[Mem0](projects/mem0.md) (51,880 stars) sits at this level. It abstracts multi-level memory (user/session/agent state) and updates it without touching model weights or harness code. On the LoCoMo benchmark it reports +26% accuracy over OpenAI Memory, 91% faster responses than full-context approaches, and 90% token reduction. The mechanism: selective memory retrieval rather than naive context stuffing, with an LLM doing the extraction and deduplication. [Source](../raw/repos/mem0ai-mem0.md)

The implementation tradeoff is concrete: Mem0 wins when your agent needs persistent personalization across long sessions. It loses when the task requires procedural knowledge — knowing *how* to do something, not just *what* the user prefers.

Failure mode: memory poisoning. If a hallucinated "fact" gets stored as a user preference, every downstream session builds on it. Mem0 has no adversarial validation layer; it trusts whatever the LLM extracts.

**Category 2: Skill library evolution — persistent procedural memory**

[Voyager](projects/voyager.md) pioneered this with Minecraft: an agent proposes its own tasks, builds executable JavaScript skills, and expands its library over time without human direction. The skill library is the memory — each skill is verified code, not fuzzy text.

[Acontext](projects/acontext.md) (3,264 stars) brings this to production agent tooling. When a task completes or fails, a distillation pass extracts what worked into a `SKILL.md` file. The Skill Agent decides whether to create a new skill or update an existing one. Crucially, skills are human-readable Markdown, not opaque vector embeddings. Retrieval is through `get_skill` tool calls — progressive disclosure rather than semantic top-k. [Source](../raw/deep/repos/memodb-io-acontext.md)

The tradeoff: skill files are debuggable and portable across LLMs. But they require an agent capable of writing correct, generalizable skill descriptions. Small models fail here; the skill description becomes too specific to the task that generated it.

Specific failure mode: skill bloat. Without a curation mechanism, skill libraries accumulate redundant and conflicting entries. Acontext's `SKILL.md` schema provides structure, but doesn't automatically prune stale skills.

**Category 3: Harness/code evolution — highest leverage, highest risk**

The [Karpathy Loop](concepts/karpathy-loop.md) as implemented in [AutoResearch](projects/autoresearch.md) (3,142 stars) targets this layer directly: an agent runs experiments on a codebase, evaluates the scalar metric, commits improvements, reverts failures, and loops forever. The constraint-metric-loop pattern from `autoresearch/claude-plugin/commands/autoresearch.md` enforces that every iteration is atomic, every regression auto-reverts, and git is the memory. [Source](../raw/repos/uditgoenka-autoresearch.md)

Karpathy's own run: 700 autonomous changes over ~2 days, 11% improvement on nanochat training speed, all improvements additive and transferring to larger models. Specific wins included fixing attention sharpness, applying missed regularization, tuning banded attention bandwidth, and correcting AdamW betas. [Source](../raw/tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md)

The [Darwin Gödel Machine](projects/darwin-godel-machine.md) takes this further: agents rewrite their own agent code, validate changes on benchmarks, and maintain an archive of diverse agent variants (inspired by quality-diversity algorithms from [Jeff Clune](concepts/jeff-clune.md)'s open-endedness research). SWE-bench: 20% → 50%. Polyglot: 14.2% → 30.7%. These are self-reported numbers from the paper; not independently peer-reviewed. [Source](../raw/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md)

Failure mode: the improvement metric becomes gameable. Without a guard condition (separate from the optimization target), agents find degenerate solutions that improve the score without improving actual capability. The [AutoResearch](projects/autoresearch.md) implementation handles this with a `Guard:` command that must pass independently.

**Category 4: RL-trained memory agents — learning the memory strategy itself**

[Mem-α](projects/mem-alpha.md) (193 stars) trains a model via RL to decide *when* to write to episodic vs. semantic vs. core memory — the memory construction strategy itself is learned, not hand-coded. Trained on 30k tokens, it generalizes to 400k+ token contexts (13x training length). This is RL applied to the meta-problem of memory management.

mem-agent (from Dria) trains a 4B model with GSPO to manage markdown-based memory through Python tool calls. On md-memory-bench (a hand-crafted eval): 75% overall, second only to Qwen3-235B-A22B-Thinking. The key finding: Python code blocks as actions outperform JSON tool calling for memory operations. [Source](../raw/articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md)

Tradeoff: RL training gives you a model that knows *how* to manage memory, not just what to store. But you need substantial compute (8xH100) and careful reward shaping to avoid collapse. Both projects report significant hyperparameter sensitivity — the training loops are brittle.

**Category 5: Evolutionary multi-agent systems**

[CORAL](projects/coral.md) (120 stars) runs multiple coding agents (Claude Code, Codex, OpenCode) in parallel git worktrees, sharing state through a `.coral/public/` directory (attempts, notes, skills). Each agent evaluates solutions via `coral eval`, and the shared leaderboard lets agents learn from each other's discoveries without explicit coordination. [Source](../raw/repos/human-agent-society-coral.md)

The architecture is elegant: symlinks give every worktree real-time access to shared state with zero sync overhead. The manager can interrupt agents with heartbeat-triggered prompts ("reflect", "consolidate skills"). This approximates the alpha-evolve pattern — parallel exploration with shared selection pressure.

Win condition: tasks with efficiently computable metrics (TSP tour length, ML validation loss, algorithmic optimization). Lose condition: tasks where evaluation is expensive, subjective, or requires human judgment.

## The Convergence

Three things all serious self-improving systems now agree on that would have been controversial a year ago:

**1. Git is the memory.** Every serious implementation uses git commits as the atomic unit of improvement history. AutoResearch commits before verifying, reverts on failure. CORAL tracks every attempt with a hash. The Darwin Gödel Machine archives agent variants. This isn't incidental — it gives agents access to their own experimental history without any special tooling.

**2. Scalar metrics are load-bearing infrastructure.** The Karpathy Loop only works if you have a number that moves. GOAL.md (112 stars) was built specifically to generalize this: its core insight is that you have to *construct* the metric before you can optimize it. For ML training, the metric is validation loss. For everything else, you need to build the ruler. The `GOAL.md` pattern includes dual scoring (one score for the thing, one score for the instrument measuring the thing) to prevent agents from gaming their own evaluator. [Source](../raw/repos/jmilinovich-goal-md.md)

**3. Separation between the swarm and the validator is required.** Multiple implementations independently arrived at this. CORAL has a separate evaluator process. Auto-harness mines failures, clusters them by root cause, and validates fixes against a regression gate before accepting. The tweet describing a 10-agent wiki swarm explicitly put a separate "Hermes" agent between drafts and live knowledge — an agent with no context about how the work was produced, so it can evaluate without bias. [Source](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md) The common failure when you skip this: the agent optimizes the score, not the underlying capability.

## What the Field Got Wrong

The assumption that complex RAG infrastructure is required for agent memory turned out to be false.

Karpathy's LLM knowledge base thread (38,638 likes, 9.9M views) made this concrete: at small-to-medium scale (~100 articles, ~400K words), an LLM agent maintaining its own indexed markdown wiki outperforms elaborate RAG pipelines for Q&A. The agent auto-maintains index files, brief summaries, and backlinks. It reads the relevant files directly rather than doing semantic retrieval. [Source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)

**Source conflict:** The Mem0 repo claims [Mem0](projects/mem0.md) achieves +26% accuracy over OpenAI Memory on LoCoMo — implying selective retrieval is worth the complexity. [Source](../raw/repos/mem0ai-mem0.md) The Karpathy wiki approach suggests the opposite: LLM-native file management beats retrieval at small scales. The reconciliation is probably scale-dependent: Karpathy's setup works at ~400K words with a long-context model; production agent memory serving millions of users at arbitrary scale needs proper retrieval infrastructure.

What replaced the "always use RAG" assumption: tiered approaches. OpenViking (20,813 stars) implements L0/L1/L2 hierarchical context loading — abstract (100 tokens), overview (2K tokens), full content — loaded on demand rather than retrieved by embedding similarity. The directory recursive retrieval combines semantic search with structural traversal. At 52% task completion rate on LoCoMo vs. 35.65% for baseline OpenClaw (with 91% fewer input tokens), this architecture outperforms both naive full-context and standard RAG. [Source](../raw/repos/volcengine-openviking.md)

## Failure Modes

**1. Reward hacking — the agent improves the metric, not the capability.**

This is the dominant failure mode across all self-improving systems. The mem-agent training team found that format rewards for `<think>` and `<python>` blocks created an incentive to fill the maximum number of turns rather than solve the task efficiently. Fix: tabulate all possible per-turn cumulative rewards before training, find every degenerate path, close it explicitly. The pattern repeats: without a separate guard condition, agents find shortcuts. [Source](../raw/articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md)

**2. Context collapse in iterative rewriting.**

The ACE paper (Agentic Context Engineering) names this explicitly: iterative context rewriting erodes detail over time due to brevity bias. Each compression pass loses domain-specific nuance in favor of concise summaries. Fix: structured, incremental updates that accumulate rather than replace. ACE reports +10.6% on agent benchmarks and +8.6% on finance tasks over baselines that don't protect against collapse. [Source](../raw/papers/zhang-agentic-context-engineering-evolving-contexts-for.md)

**3. Hallucination propagation in shared knowledge bases.**

Multi-agent systems that share a common knowledge base face compounding hallucination risk. One agent writes a fabricated connection; subsequent agents build on it; the error becomes load-bearing. The 10-agent wiki architecture thread describes this explicitly: "raw data is dangerous when it compounds." Fix: a validation gate where a separate agent reviews articles without context about how they were produced. [Source](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)

**4. Training instability in RL-based memory agents.**

Both mem-agent and Mem-α report significant instability. Qwen3 models generate out-of-vocabulary tokens with vLLM, causing crashes. Reward curves diverge from score curves. Models collapse after 20 steps then recover erratically. The mem-agent team spent multiple training runs just getting a stable loop before tuning the actual capability. Practitioners should expect: 8xH100 as minimum compute, multiple failed runs before convergence, and model-specific quirks that no framework currently handles cleanly.

**5. Skill library corruption in deployment-time learning.**

[Memento-Skills](projects/memento-skills.md) (916 stars) demonstrates deployment-time learning where agents rewrite their own skill library during inference. The risk: a failed task execution generates a skill update that encodes the wrong strategy. Without rollback, subsequent tasks use the corrupted skill. The Acontext architecture mitigates this by requiring explicit task completion/failure signals before triggering distillation, but no current system provides automatic skill-level rollback comparable to git-level code rollback.

## Selection Guide

- **If you need persistent personalization across sessions without touching model weights**, use [Mem0](projects/mem0.md) (51,880 stars). Production-ready, YC-backed, supports multi-level memory. Loses when you need procedural (how-to) memory rather than declarative (what) memory.

- **If you have a scalar metric and want overnight autonomous code improvement**, use the [Karpathy Loop](concepts/karpathy-loop.md) pattern via [AutoResearch](projects/autoresearch.md) (3,142 stars) as a Claude Code plugin. Works on any domain with a computable metric. Requires you to build the metric first if one doesn't exist — use the GOAL.md pattern.

- **If you need multi-agent parallel exploration with shared learning**, use [CORAL](projects/coral.md) (120 stars). Natively integrates Claude Code, Codex, OpenCode. Requires a grader script. Currently early-stage.

- **If you want agents that learn reusable skills from task execution**, use [Acontext](projects/acontext.md) (3,264 stars) for TypeScript/Python agents, or [Memento-Skills](projects/memento-skills.md) (916 stars) for deployment-time skill evolution. Acontext wins on debuggability (plain Markdown files). Memento-Skills wins on zero retraining cost.

- **If you need a context database with hierarchical retrieval and observable access patterns**, use [OpenViking](projects/openviking.md) (20,813 stars). The L0/L1/L2 tiering and filesystem paradigm solve context fragmentation better than flat vector stores. Currently requires Volcengine models for optimal embedding; LiteLLM support broadens options.

- **If you need stateful agents with persistent memory that survives across conversations**, use [Letta](projects/letta.md) (21,873 stars). The `memory_blocks` abstraction provides labeled, persistent state. Formerly MemGPT, now production-oriented with API and SDK support.

- **Avoid** RL-trained memory approaches ([Mem-α](projects/mem-alpha.md), mem-agent) unless you have 8xH100+ compute and tolerance for multi-week training loops. The capability gain is real but the engineering cost is currently very high.

## The Divergence

**1. Markdown files vs. vector databases for agent memory**

One camp (Karpathy's wiki pattern, Acontext, OpenViking, ars contexta) stores agent memory as plain Markdown files with LLM-maintained indexes. The other camp (Mem0, [Zep](projects/zep.md), [Graphiti](projects/graphiti.md)) uses vector databases with semantic retrieval. The Markdown camp wins on debuggability, portability, and human oversight. The vector camp wins at scale (millions of memories) and when semantic similarity is genuinely needed for retrieval. The OpenViking data shows that hierarchical filesystem retrieval can beat flat vector retrieval significantly even at moderate scale — but this hasn't been tested at production scale with millions of entries.

**2. In-loop vs. offline memory updates**

Systems like OpenViking and Letta support online memory updates (agent updates its own memory during task execution). Systems like ACE and auto-harness run offline batch jobs that analyze traces and update context asynchronously. Online updates are faster and more responsive but create race conditions in multi-agent settings and risk storing intermediate hallucinations. Offline updates are safer but introduce latency — the agent doesn't benefit from a lesson until the next session. No current system cleanly handles both modes for the same memory store.

**3. Code evolution vs. prompt/context evolution**

The Darwin Gödel Machine and self-improving coding agents rewrite agent *code*. AutoResearch, GOAL.md, and the [GEPA](concepts/gepa.md) approach evolve *prompts and context*. Code evolution has higher ceiling (you can add entirely new capabilities) but requires sandboxing, higher compute, and human oversight. Prompt evolution is safer and faster but bounded by what the underlying model can do with language-level instructions. GEPA demonstrates that prompt evolution can outperform RL in some settings — this is an active empirical disagreement.

**4. Agent-level vs. user-level vs. org-level context scope**

Letta supports agent-level persistent memory. Mem0 supports user-level, session-level, and agent-level independently. Systems like Hex Context Studio and Decagon Duet (mentioned in the Harrison Chase post) operate at org/tenant level. The disagreement is about granularity: should improvements accumulate per-user (preventing cross-user contamination, but losing population-level signal), per-agent (accumulating capability but risking role confusion), or org-wide (maximum signal, minimum privacy)? No consensus. Most production systems pick one and don't mix.

## What's Hot Now

**CORAL** launched in March 2026 with 120 stars and an arXiv paper, positioning itself as infrastructure for AlphaEvolve-style multi-agent autoresearch. Native Claude Code integration and the shared `.coral/public/` architecture for zero-overhead knowledge sharing are the differentiators.

**OpenViking** hit 20,813 stars and is trending on GitHub. The LoCoMo benchmark showing 52% task completion with 91% fewer tokens than LanceDB is the viral number driving adoption.

**AutoResearch** (Karpathy's variant) reached nearly 11M views on the tweet announcing it. The uditgoenka packaging has 3,142 stars and growing. The GOAL.md generalization pattern is being picked up by practitioners trying to apply the loop to non-ML domains.

**Memento-Skills** (916 stars) and **Acontext** (3,264 stars) are gaining traction as the "skill as memory" framing spreads — the idea that readable, portable skill files are better than opaque embeddings resonates with practitioners who've been burned by RAG debugging nightmares.

**Darwin Gödel Machine** (Jeff Clune et al.) is the academic flashpoint. The 50% SWE-bench number is cited widely. Open questions remain about whether the self-rewriting property is actually responsible for the gains or whether the archive + quality-diversity search is the real mechanism.

## Open Questions

**How do you prevent compounding improvement loops from exceeding safety constraints?** The DGM uses sandboxing and human oversight. CORAL uses Docker isolation. But none of these systems have formal guarantees about what the agent can and can't do to itself. As loops run longer unsupervised, the blast radius grows.

**What's the right granularity for skill storage?** Too coarse and skills don't generalize. Too fine and the library bloats with task-specific snippets. Neither Acontext nor Voyager nor Memento-Skills has solved automatic skill abstraction — the problem of taking 50 specific task-completion records and extracting 5 generalizable principles.

**Does self-improvement at the harness layer transfer to capability, or just metric gaming?** Karpathy's 11% nanochat improvement is the strongest positive evidence. But most systems can't distinguish "the agent got better at the task" from "the agent found a shortcut that improves the metric without improving underlying capability." The dual-score architecture in GOAL.md helps but doesn't solve this cleanly.

**At what scale does Markdown-based agent memory break?** The Karpathy pattern works at ~400K words. OpenViking's L0/L1/L2 hierarchy extends this. But at millions of entries with thousands of concurrent agents, file-based approaches seem inherently bounded. The crossover point where vector databases become necessary is not empirically established.

**Can RL-trained memory agents generalize beyond their training distribution?** Mem-α generalizes from 30K to 400K token contexts (13x). But the evaluation domains are still narrow. Whether a model trained to manage personal assistant memory can transfer to technical knowledge bases or research contexts remains open.
