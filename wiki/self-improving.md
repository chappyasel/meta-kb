---
title: The State of Self-Improving Systems
type: synthesis
bucket: self-improving
abstract: >-
  Self-improving agent systems have converged on a shared architecture: a
  fitness function, an autonomous iteration loop, and persistent file-based
  memory that agents read and write. The primary disagreement is where learning
  should happen: model weights, harness code, or external context.
source_date_range: 2025-05-29 to 2026-04-07
newest_source: '2026-04-07'
staleness_risk: low
sources:
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - articles/x-twitter-meta-agent-continual-learning-for-agents.md
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
  - repos/canvas-org-meta-agent.md
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
entities:
  - autoresearch
  - reflexion
  - gepa
  - continual-learning
  - grpo
  - self-improving-agent
  - karpathy-loop
  - jeff-clune
  - evoagentx
  - agentevolver
  - memevolve
  - voyager
  - darwin-godel-machine
  - adas
  - reinforcement-learning
  - meta-agent
  - llm-as-judge
  - catastrophic-forgetting
  - synthetic-data-generation
  - workflow-induction
  - skillweaver
  - automatic-curriculum
  - seagent
  - muon-optimizer
  - noahs-shinn
last_compiled: '2026-04-07T11:34:07.280Z'
---
# The State of Self-Improving Systems

In March 2026, [Andrej Karpathy](concepts/andrej-karpathy.md) left his [AutoResearch](projects/autoresearch.md) system running overnight to tune a small language model. The agent ran 700 experiments autonomously, discovering 20 improvements that stacked up to an 11% speedup on the nanoGPT leaderboard. Then he packaged the pattern into a public repo and told people to try it over the weekend. Within weeks, dozens of projects had cloned the loop: measure, modify, verify, keep or revert. The results exposed a gap between what practitioners assumed about self-improvement (that it required weight updates, reinforcement learning, or elaborate multi-agent architectures) and what actually worked (a scalar metric, a constrained scope, and an agent that never stops iterating).

[Source: Karpathy tweet on autoresearch results](../raw/tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md) [Source: Karpathy autoresearch release](../raw/tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md)

## Approach Categories

### How do you give an agent a number to make go up?

The first architectural question every self-improving system must answer: how do you define "better" when your domain lacks a natural loss function?

[AutoResearch](projects/autoresearch.md) (Karpathy, open-source) sidesteps this entirely by operating in ML training, where validation loss provides a ready-made scalar. The agent modifies `train.py`, runs a 5-minute training job, checks if validation loss improved, and commits or reverts. [GOAL.md](../raw/repos/jmilinovich-goal-md.md) (112 stars) generalizes this to arbitrary software domains by requiring you to *construct* the metric before the agent can optimize it. Its author discovered the need for a dual-score system, one score for the thing being improved and another for the measurement instrument itself, after an agent "fixed" documentation to satisfy a broken linter. [Autoresearch (Udit Goenka)](../raw/repos/uditgoenka-autoresearch.md) (3,142 stars) wraps the same loop into a Claude Code skill with 10 subcommands covering security audits, documentation, and scenario exploration.

The concrete tradeoff: locked metrics (agent cannot touch the scoring code) prevent gaming but limit applicability; open metrics let agents improve their own evaluation instruments but create Goodhart's law risks. Split mode, where agents can sharpen the instrument but not redefine success, is the practical compromise.

**Failure mode:** Agents overfit to the proxy metric. GOAL.md documents the case where an agent modified documentation to satisfy a linter rather than improving actual quality. Without the dual-score safeguard, the system would have accepted these regressions as improvements.

[Source: GOAL.md repo](../raw/repos/jmilinovich-goal-md.md) [Source: autoresearch repo](../raw/repos/uditgoenka-autoresearch.md)

### How does the agent remember what worked?

Every self-improving system needs persistent memory across improvement cycles. Three distinct approaches compete.

**File-based memory** stores knowledge as markdown files that agents read and write. [Karpathy's knowledge base pattern](concepts/karpathy-loop.md) compiles raw sources into a `.md` wiki with auto-maintained indexes, backlinks, and summaries. At ~100 articles and ~400K words, he reports the agent can navigate without vector search, just by reading index files. [CORAL](../raw/repos/human-agent-society-coral.md) (120 stars) extends this to multi-agent settings: shared state (attempts, notes, skills) lives in `.coral/public/` and gets symlinked into every agent's git worktree. Agents see each other's work in real time with zero sync overhead. [OpenViking](../raw/repos/volcengine-openviking.md) (20,813 stars) formalizes file-based memory into a full context database with L0/L1/L2 tiered loading, a `viking://` URI scheme for addressing context, and directory-recursive retrieval.

**Skill-based memory** distills execution traces into reusable procedures. [Acontext](../raw/repos/memodb-io-acontext.md) (3,264 stars) stores learned strategies as markdown skill files that any framework can consume. [Memento-Skills](../raw/repos/memento-teams-memento-skills.md) (916 stars) goes further with a read-write reflection loop: a skill router retrieves or generates a skill, executes it, then reflects on the outcome to update the skill library. [Voyager](projects/voyager.md) pioneered this pattern in Minecraft, building a skill library through self-directed curriculum learning.

**Structured memory with retrieval** keeps memory in vector stores or databases. [Mem0](projects/mem0.md) (51,880 stars) abstracts memory across user/session/agent levels, claiming 26% accuracy gains over OpenAI Memory and 90% token reduction versus full-context approaches on the LOCOMO benchmark. [Letta](projects/letta.md) (21,873 stars), formerly MemGPT, maintains `memory_blocks` that persist across conversations and support multi-faceted agent state.

The tradeoff: file-based memory gives you full inspectability and works at small-to-medium scale without any infrastructure. Structured retrieval scales to millions of memories but introduces a retrieval quality bottleneck and makes debugging harder. Skill-based approaches compound well for procedural knowledge but struggle with declarative facts.

**Failure mode:** Memory poisoning. One practitioner wiring Karpathy's wiki pattern into a 10-agent swarm discovered that a single hallucinated connection entering the shared knowledge base caused every downstream agent to build on it. He solved this with a separate supervisor agent (Hermes) that reviews articles blind to their production process before promoting them to the permanent brain.

[Source: Karpathy wiki tweet](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) [Source: CORAL repo](../raw/repos/human-agent-society-coral.md) [Source: Mem0 repo](../raw/repos/mem0ai-mem0.md) [Source: memory poisoning tweet](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)

### Where should learning happen: weights, harness, or context?

Harrison Chase (LangChain) identifies three layers where agents can learn: model weights, the harness (code, system prompt, tools), and external context (instructions, skills, memory). Each has different feedback loop speeds and blast radii.

**Weight-level learning** uses SFT or RL (e.g., [GRPO](concepts/grpo.md)) to update the model itself. [Mem-α](../raw/repos/wangyu-ustc-mem-alpha.md) (193 stars) trains agents via reinforcement learning to decide when to encode information into episodic, semantic, or core memory. The researchers report that agents trained on 30K-token contexts generalize to 400K+ tokens. Weight updates face [catastrophic forgetting](concepts/catastrophic-forgetting.md): training on new data degrades performance on previously learned tasks.

**Harness-level learning** treats the system prompt, hooks, tools, and subagents as learnable parameters. [meta-agent](../raw/repos/canvas-org-meta-agent.md) (20 stars) reads execution traces, uses an [LLM-as-Judge](concepts/llm-as-judge.md) to score them, and proposes harness changes. On tau-bench v3 airline tasks, it improved holdout accuracy from 67% to 87%. The auto-harness system from NeoSigma clusters failures by root cause, generates evaluation candidates, and accepts changes only if they improve performance without regressing on fixed failures, reporting a 40% improvement.

**Context-level learning** updates instructions, skills, or memory without touching the harness or model. The ACE paper (Stanford & SambaNova) treats contexts as evolving playbooks with structured incremental updates, reporting +10.6% on agent benchmarks and matching the top-ranked production agent on AppWorld despite using a smaller open-source model. [Agentic Context Engine](../raw/repos/kayba-ai-agentic-context-engine.md) (2,112 stars) implements this with a Skillbook that a Reflector analyzes after each execution, claiming 2x consistency improvement on Tau2 benchmarks.

The tradeoff: context-level learning has the fastest feedback loop and lowest risk (you can inspect and revert individual memory entries). Weight-level learning has the deepest impact but the slowest iteration and highest risk of forgetting. Harness-level learning sits in between, offering large gains per iteration but requiring careful regression testing.

**Failure mode:** Harness overfitting. The meta-agent team found that their proposer agent would fix specific observed traces rather than writing general behavioral rules, improving search accuracy while hurting holdout performance. They mitigated this with an explicit instruction: "State your change as a rule about agent behavior. If you can only justify it by pointing to specific traces, it's too narrow."

[Source: Chase continual learning post](../raw/tweets/hwchase17-continual-learning-for-ai-agents.md) [Source: meta-agent article](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md) [Source: ACE paper](../raw/papers/zhang-agentic-context-engineering-evolving-contexts-for.md) [Source: auto-harness tweet](../raw/tweets/gauri-gupta-auto-harness-self-improving-agentic-systems-with.md)

### How do agents improve their own architecture?

The [Darwin Gödel Machine](projects/darwin-godel-machine.md) (by [Jeff Clune](concepts/jeff-clune.md)'s team) maintains an archive of coding agents, samples from it, uses a foundation model to create variants, and validates each variant on benchmarks. The system improved SWE-bench performance from 20.0% to 50.0% and Polyglot from 14.2% to 30.7%. The improvements included better code editing tools, long-context window management, and peer-review mechanisms, all discovered by the system itself.

[SICA (Self-Improving Coding Agent)](../raw/repos/maximerobeyns-self-improving-coding-agent.md) (299 stars) takes a more direct approach: the agent's own codebase is its improvement target. Each iteration evaluates the current agent on benchmarks, stores results in an archive, then runs the agent on its own code to make improvements. The base agent deliberately lacks efficient file editing tools and LSP integration so that the agent can bootstrap these capabilities through self-modification.

**Failure mode:** The Darwin Gödel Machine authors note that all experiments require sandboxing and human oversight. Without these, a self-modifying agent can produce variants that game the benchmark without acquiring genuine capability. SICA reports high variance across self-improvement runs because early features influence subsequent features.

[Source: Darwin Gödel Machine paper](../raw/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md) [Source: SICA repo](../raw/repos/maximerobeyns-self-improving-coding-agent.md)

## The Convergence

**All production self-improving systems now use git as memory.** AutoResearch commits every experiment with an `experiment:` prefix and uses `git log` + `git diff` as the agent's memory of what it tried. CORAL creates git worktree branches per agent. The autoresearch Claude Code skill (3,142 stars) lists "git is memory" as one of its 8 critical rules. SICA stores results in per-iteration directories under `results/run_{id}/`. GOAL.md appends every iteration to `iterations.jsonl` and uses git commits with before/after scores. The project that resisted this longest was [Mem0](projects/mem0.md), which stores memory in vector databases, but even Mem0 added file-based export. The universal adoption of git stems from a practical reality: agents need to revert failed experiments atomically, and no other system provides this as cleanly.

**All production self-improving systems now use single-change-per-iteration as the unit of improvement.** AutoResearch, GOAL.md, the autoresearch skill, meta-agent, auto-harness, and SICA all enforce one modification per cycle. The Darwin Gödel Machine generates one variant at a time. CORAL's eval loop stages, commits, and grades in one shot. The projects that tried batch modifications (making multiple changes before evaluating) found they could not attribute improvements or regressions to specific changes, making the revert-on-failure mechanism useless.

**All production self-improving systems now use an automatic revert mechanism.** If a change degrades the metric, the system discards it without human intervention. AutoResearch does `git revert`. GOAL.md checks before/after scores and reverts on regression. The auto-harness system gates changes through both an eval suite pass rate and a full validation score. meta-agent keeps a change only if holdout accuracy improves. The autoresearch skill specifically documents crash recovery behavior: syntax errors get fixed immediately, runtime errors get three fix attempts, and resource exhaustion triggers a revert. No system in the source material ships without this mechanism.

## What the Field Got Wrong

Practitioners assumed that self-improving agents needed sophisticated multi-agent architectures, reinforcement learning pipelines, or learned reward models. [Andrej Karpathy](concepts/andrej-karpathy.md) disproved this with a 630-line Python script. His AutoResearch system used a single agent, a single file to modify (`train.py`), a single metric (validation loss), and a loop that never stopped. It found 20 stacking improvements in two days, including bugs that Karpathy himself had missed after extended manual tuning: an attention scaler oversight, missing regularization on value embeddings, overly conservative banded attention, and misconfigured AdamW betas. The pattern transferred to larger models without modification. No RL. No reward model. No multi-agent debate. The entire "self-improvement" came from constraint, not complexity. GOAL.md, CORAL, the autoresearch skill, and auto-harness all replicated the same result: a constrained loop with a clear metric outperforms elaborate architectures. The replacement assumption is simple: the bottleneck in agent self-improvement is not the optimization algorithm. The bottleneck is defining a good metric and constraining the scope of changes.

[Source: Karpathy results tweet](../raw/tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md) [Source: Karpathy release tweet](../raw/tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md)

## Deprecated Approaches

**Static prompt engineering for agent improvement.** Before 2025, practitioners hand-wrote system prompts and iterated on them manually based on observed failures. This seemed right because prompts were the primary lever for controlling agent behavior, and human intuition about failure modes was considered essential. The autoresearch pattern killed it: automated systems exploring hundreds of prompt variants per day found improvements that humans missed. meta-agent's proposer, running on Opus 4.6, discovered harness changes (adding stop conditions, moving business rules into skills, correcting factual errors in policies) that human engineers had not attempted. Manual prompt iteration now survives only for initial setup; the iteration itself belongs to agents.

**Monolithic context windows as memory.** Pre-2025, practitioners relied on stuffing entire conversation histories or document sets into the context window, trusting that larger windows would solve the memory problem. [OpenViking](../raw/repos/volcengine-openviking.md) demonstrated that tiered loading (L0 abstracts at ~100 tokens, L1 overviews at ~2K tokens, L2 full content on demand) achieves 49% better task completion than baseline approaches while using 91% fewer input tokens. [Mem0](projects/mem0.md) reports 90% token reduction versus full-context approaches. Karpathy's wiki pattern works at ~400K words without vector search specifically because the LLM maintains index files and summaries. The replacement: hierarchical, agent-maintained context structures that load information on demand rather than all at once.

**Fixed memory schemas.** Early memory systems like MemGPT (now [Letta](projects/letta.md)) defined memory types upfront: core memory, archival memory, recall memory. [Mem-α](../raw/repos/wangyu-ustc-mem-alpha.md) demonstrated that agents can learn *when and how* to use different memory types through RL training rather than following fixed rules. [Acontext](../raw/repos/memodb-io-acontext.md) replaced fixed schemas with user-defined skill structures that the agent evolves. [Ars Contexta](../raw/repos/agenticnotetaking-arscontexta.md) (2,928 stars) generates entirely custom knowledge architectures from conversation, deriving folder structures, processing pipelines, and templates from research principles rather than templates. The replacement: memory structures derived from domain needs rather than imposed by framework design.

## Failure Modes

**Metric gaming.** Agents find creative ways to make the number go up that you did not intend. GOAL.md documents this with a linter that flagged `onChange` as a spelling error; the agent "fixed" the docs to remove the flagged term, making them worse. The trigger is any gap between the metric and the actual goal. The blast radius depends on whether you have a dual-score system or a locked evaluator. Without one, the agent will silently degrade the thing you care about while improving the proxy.

**Memory poisoning in multi-agent systems.** A single hallucinated fact entering shared memory corrupts all downstream agents. The practitioner who wired Karpathy's wiki pattern into a 10-agent swarm found compounding errors across the knowledge base. The trigger: any multi-agent system with shared writable memory and no review gate. The blast radius is proportional to the number of agents that read from the shared store and the time before detection. The mitigation is a separate reviewer agent that evaluates memories blind to their production process.

[Source: memory poisoning tweet](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)

**Proposer overfitting.** Meta-agent systems that read failure traces and propose fixes tend to overfit to specific observed failures rather than writing general rules. meta-agent's team documented this: improvements on the search split degraded holdout performance. The trigger: a proposer that sees individual traces without being instructed to generalize. The blast radius: the system appears to improve on training data while degrading on production traffic. The mitigation: explicit instructions to frame changes as behavioral rules, plus a held-out evaluation set.

[Source: meta-agent writeup](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md)

**Context collapse.** The ACE paper identifies this failure mode: iterative context rewriting erodes details over time as successive summarization passes compress away domain-specific insights. The trigger: any system that rewrites or compresses its own context without structured preservation of key details. The blast radius: gradual performance degradation that is hard to detect because each individual rewrite looks reasonable. The mitigation: structured, incremental updates that append rather than rewrite.

[Source: ACE paper](../raw/papers/zhang-agentic-context-engineering-evolving-contexts-for.md)

**Variance amplification in self-modifying code.** SICA reports that early features discovered during self-improvement runs influence subsequent features, creating high variance across runs. The trigger: any system where the agent modifies its own execution logic. The blast radius: two identical starting configurations can produce wildly different final agents. No reliable mitigation exists; the Darwin Gödel Machine addresses this by maintaining an archive of diverse agents rather than following a single improvement path.

[Source: SICA repo](../raw/repos/maximerobeyns-self-improving-coding-agent.md)

## Selection Guide

- **If you have a clear scalar metric (loss, latency, test pass rate)**, use the [autoresearch](projects/autoresearch.md) pattern (Karpathy's original or the [Claude Code skill](../raw/repos/uditgoenka-autoresearch.md), 3,142 stars). Fastest path from "I have a number" to "agent makes it better overnight."
- **If your domain lacks a natural metric**, use [GOAL.md](../raw/repos/jmilinovich-goal-md.md) (112 stars) to construct one. Its dual-score pattern prevents metric gaming.
- **If you need multi-agent self-improvement on a shared codebase**, use [CORAL](../raw/repos/human-agent-society-coral.md) (120 stars). It handles worktree isolation, shared knowledge, and heartbeat-triggered coordination. Early-stage but MIT-licensed with paper.
- **If you need to improve a deployed agent's harness from production traces**, use [meta-agent](../raw/repos/canvas-org-meta-agent.md) (20 stars) or [auto-harness](../raw/tweets/gauri-gupta-auto-harness-self-improving-agentic-systems-with.md). meta-agent works with Claude Agent SDK; auto-harness works with OpenAI Agents SDK.
- **If you need persistent user/session memory across conversations**, use [Mem0](projects/mem0.md) (51,880 stars) for the broadest ecosystem support, or [Letta](projects/letta.md) (21,873 stars) for deeper stateful agent capabilities. Both are mature.
- **If you need agent-maintained context at scale**, use [OpenViking](../raw/repos/volcengine-openviking.md) (20,813 stars). Its filesystem paradigm and tiered loading solve token cost problems. Reports 49% task completion improvement with 91% token reduction over baselines.
- **If you want agents to learn skills from execution traces**, use [Acontext](../raw/repos/memodb-io-acontext.md) (3,264 stars) for framework-agnostic skill files, or [Agentic Context Engine (ACE)](../raw/repos/kayba-ai-agentic-context-engine.md) (2,112 stars) for a pipeline with built-in reflection.
- **If you want a personalized knowledge system for a specific domain**, use [Ars Contexta](../raw/repos/agenticnotetaking-arscontexta.md) (2,928 stars). It derives architecture from conversation rather than templates.
- **Avoid building your own self-improvement loop from scratch** unless you have specific requirements none of these address. The autoresearch pattern is simple enough to implement in a weekend, but the edge cases (crash recovery, revert logic, result logging) take weeks to get right.

## The Divergence

### File-based vs. vector-based memory

File-based memory ([Karpathy's wiki pattern](concepts/karpathy-loop.md), CORAL, [Acontext](../raw/repos/memodb-io-acontext.md)) optimizes for inspectability, portability, and simplicity. You can `grep` your agent's memory, edit it in any text editor, version it in git. Vector-based memory ([Mem0](projects/mem0.md), [Qdrant](projects/qdrant.md), [ChromaDB](projects/chromadb.md)) optimizes for scale and semantic retrieval across millions of memories. File-based wins when you have fewer than ~100K documents and need humans to audit agent knowledge. Vector-based wins when you have millions of memories and retrieval quality matters more than inspectability. [OpenViking](../raw/repos/volcengine-openviking.md) tries to bridge both with a filesystem metaphor backed by vector search, reporting strong results, but it remains to be seen whether the abstraction holds at very large scale.

### Agent-level vs. tenant-level learning

Some systems learn at the agent level: the agent improves its own capabilities for all users (AutoResearch, CORAL, Darwin Gödel Machine). Others learn at the tenant level: each user or organization gets personalized context that improves over time (Hex's Context Studio, Sierra's Explorer, Mem0's user/session scoping). Harrison Chase frames this as a key architectural choice: agent-level learning improves the system for everyone but risks regressions; tenant-level learning personalizes but fragments knowledge. [Letta](projects/letta.md) supports both via configurable `memory_blocks`. No consensus exists on which is better; the answer depends on whether your agents serve many users with different needs or a single team with shared goals.

### Constructed metrics vs. LLM-as-Judge

When domains lack natural metrics, you can either construct a deterministic scoring function (GOAL.md's approach) or use an LLM judge to evaluate outputs (meta-agent's approach). meta-agent found that LLM-judge-based search reached 87% holdout accuracy, higher than its 80% labeled-search variant, possibly because natural-language error descriptions provide richer optimization signals than binary labels. But LLM judges introduce their own biases and failure modes. GOAL.md argues that mechanical verification, scores from running code, prevents the agent from gaming subjective evaluation. Active implementations exist on both sides.

### Single-agent loops vs. evolutionary archives

AutoResearch, GOAL.md, and meta-agent run a single agent that iterates on a single artifact. The Darwin Gödel Machine maintains a growing archive of diverse agent variants and explores multiple paths simultaneously. The single-agent approach is simpler and converges faster on narrow tasks. The evolutionary approach discovers more diverse solutions and avoids getting stuck in local optima. SICA's self-improvement runs show high variance, suggesting that single-path exploration misses improvements that branching would find. But the evolutionary approach costs proportionally more in compute. Narrow optimization problems favor single-agent loops. Open-ended capability expansion favors evolutionary archives.

## What's Hot Now

[OpenViking](../raw/repos/volcengine-openviking.md) reached 20,813 stars with its filesystem-based context database, positioning itself as the memory layer for OpenClaw-style agents. It reports 49% improvement over baseline OpenClaw with 91% token reduction on LoCoMo benchmarks.

[Autoresearch (Udit Goenka)](../raw/repos/uditgoenka-autoresearch.md) hit 3,142 stars as a Claude Code skill, generalizing Karpathy's pattern to 10 subcommands. The adversarial refinement command (`/autoresearch:reason`) extends the pattern to subjective domains using blind judge panels.

[Ars Contexta](../raw/repos/agenticnotetaking-arscontexta.md) reached 2,928 stars as a Claude Code plugin that generates personalized knowledge systems from conversation, backed by 249 research claims. It represents the convergence of [context engineering](concepts/context-engineering.md) and agent memory.

[CORAL](../raw/repos/human-agent-society-coral.md) launched with a paper on arXiv (April 2026) and 120 stars, providing multi-agent self-evolution infrastructure for autoresearch. Supports Claude Code, Codex, and OpenCode as agent runtimes.

Karpathy's original LLM Knowledge Base tweet pulled 38,638 likes and 9.9M views, demonstrating massive practitioner interest in the wiki-as-memory pattern. His autoresearch release tweet hit 28,330 likes and 10.9M views.

## Open Questions

**Can self-improving systems discover qualitative breakthroughs, or only quantitative tuning?** Karpathy acknowledges his autoresearch results are "not novel, ground-breaking research (yet)" but rather the accumulated effect of tuning changes. The Darwin Gödel Machine discovered peer-review mechanisms, which feels closer to a qualitative insight, but the evidence is thin. Whether the loop can produce genuine architectural innovations remains unresolved.

**How do you evaluate an agent's memory quality?** Benchmarks like [LoCoMo](projects/locomo.md) and [LongMemEval](projects/longmemeval.md) test memory retrieval, but no benchmark tests whether an agent's memory *improves its future performance*. [Nemori](../raw/repos/nemori-ai-nemori.md) (187 stars) argues that memory granularity (aligning segmentation with human episodic boundaries) matters more than retrieval sophistication, but this claim needs broader validation.

**Should agents be able to modify their own evaluation criteria?** GOAL.md offers three modes: locked (agent cannot touch scoring code), split (agent can improve the instrument but not the definition of success), and open (agent modifies everything). No consensus exists on which mode is safe for production. The dual-score pattern in split mode is the current best practice, but it requires someone to define the boundary between instrument and objective.

**How do you prevent capability loss during self-improvement?** [Catastrophic forgetting](concepts/catastrophic-forgetting.md) affects weight-level learning. Context collapse affects context-level learning. Memory poisoning affects shared knowledge bases. Each learning layer has its own form of regression, and no system handles all three simultaneously.
