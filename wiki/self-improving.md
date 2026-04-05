---
title: The State of Self-Improving Systems
type: synthesis
bucket: self-improving
abstract: >-
  Self-improving agent systems have shifted from theoretical frameworks to
  deployable infrastructure, with the core question moving from "can agents
  improve?" to "at which layer should improvement happen, and how fast?"
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
  - reflexion
  - self-improving-agents
  - grpo
  - gepa
  - adas
  - voyager
  - darwin-godel-machine
  - continual-learning
  - reinforcement-learning
  - skillweaver
  - evoagentx
  - synthetic-data-generation
  - llm-as-judge
  - meta-harness
  - jeff-clune
  - automatic-curriculum
  - seagent
  - credit-assignment
  - compositional-skill-synthesis
  - reward-hacking
  - sft
last_compiled: '2026-04-05T20:19:42.246Z'
---
# The State of Self-Improving Systems

Six months ago, self-improving agents were mostly academic. Reflexion ran verbal reflection loops, Voyager grew Minecraft skill libraries, and practitioners treated both as interesting demos. Today you can point a coding agent at your own codebase, leave it running overnight, and wake up to 700 committed experiments — some of which actually work. The question has moved from "is this possible?" to "which layer do I improve, and at what cost?"

That shift happened because three things converged: LLMs got good enough at code generation to act as their own improvers, benchmarks like SWE-bench gave concrete scalar targets, and the autoresearch pattern — constraint + metric + loop — proved it generalizes beyond ML training.

## Approach Categories

### Can agents modify their own scaffolding without breaking it?

The oldest camp focuses on verbal reflection and in-context learning. [Reflexion](projects/reflexion.md) (circa 2023) epitomized this: run an agent, capture the trajectory, have the agent verbally critique its own failures, inject that critique as context on the next attempt. No weight updates, no code changes. The approach still shows up in production as the cheapest form of improvement — just append a "lessons learned" block to the system prompt.

[Letta](projects/letta.md) (21,873 stars) operationalizes this with persistent `memory_blocks` — labeled slots (`human`, `persona`, `agent`) that survive across conversations. The agent calls internal tools to read and write these blocks mid-conversation, so improvement accumulates without touching model weights or harness code. The tradeoff is bounded: context-layer learning is fast and cheap but can't generalize beyond what fits in the memory blocks. It breaks when the memory blocks drift — an agent that confidently misremembers a user preference will double down on it across sessions.

The [Agentic Context Engine (ACE)](projects/agentic-context-engine.md) (2,112 stars) extends this with a three-role architecture: an Agent executes tasks, a Reflector analyzes traces to extract what worked and failed, and a SkillManager curates a "Skillbook" — a persistent strategy registry. The Recursive Reflector is the key mechanism: instead of summarizing traces, it writes and executes Python code in a sandboxed environment to programmatically search for patterns before updating the Skillbook. [Benchmarks from the ACE paper](../raw/repos/kayba-ai-agentic-context-engine.md) show 2x consistency (pass^4) on the Tau2 airline benchmark with 15 learned strategies and no reward signals. These are self-reported. The paper claims 49% token reduction in browser automation over a 10-run learning curve — plausible given selective retrieval, but unverified externally.

**Wins when:** tasks are repeated across sessions, failures cluster into recognizable patterns, you can't afford fine-tuning. **Loses when:** the required improvement needs new capabilities that context-layer instructions can't express.

**Failure mode:** Context drift. A Skillbook entry that conflates two different failure modes will contaminate every subsequent task that retrieves it. ACE's SkillManager has no ground truth to validate against — it only knows what the Reflector tells it.

---

### Can agents rewrite their own code and validate the improvement?

The harness-improvement camp treats the agent's scaffolding as the optimization target. Karpathy's autoresearch pattern, now with a community of reimplementations, establishes the canonical loop: modify `train.py` → run → check validation metric → keep or `git revert` → repeat. [His public experiments](../raw/tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md) showed 700 autonomous changes over 2 days producing an 11% training speedup — real improvements that stacked onto an already well-tuned system.

[CORAL](projects/coral.md) (120 stars) implements multi-agent harness evolution for optimization tasks. Each agent runs in its own git worktree. Shared state — attempts, notes, skills — lives in `.coral/public/` and is symlinked into every worktree, so agents see each other's work with zero sync overhead. A manager process sends heartbeat-triggered prompts (`reflect`, `consolidate skills`) to prevent redundant exploration. The architecture solves a real coordination problem: without the symlinked shared state, parallel agents repeat each other's failed attempts. [The CORAL architecture description](../raw/repos/human-agent-society-coral.md) is well-specified; performance claims (on TSP, circle packing, etc.) are from the paper's own experiments.

[GOAL.md](projects/goal-md.md) (112 stars) addresses the harder problem: most software domains don't have a natural scalar metric. The project introduces a "dual-score" pattern — one score for what you're improving, a second for the measurement instrument itself. A docs-quality agent discovered its linter was flagging valid JSX as spelling errors; the dual-score system let it fix the instrument before using it to fix the docs. The fitness function template generalizes Karpathy's pattern to any evaluable domain. [Source](../raw/repos/jmilinovich-goal-md.md).

The [Darwin Gödel Machine (DGM)](projects/darwin-godel-machine.md) takes harness evolution the farthest: agents that modify their own code, maintain an archive of generated variants (the "open-ended" part), and validate changes against coding benchmarks. [The paper](../raw/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md) reports SWE-bench performance improving from 20.0% to 50.0% and Polyglot from 14.2% to 30.7% through self-modification. These benchmarks are reported by the authors; the SWE-bench numbers are plausible but should be treated as upper-bound estimates until independently verified. The key mechanism: DGM samples an agent from its archive and uses a foundation model to generate a "new, interesting" variant — borrowing from evolutionary algorithms rather than gradient descent.

**Wins when:** the improvement target is a concrete, fast-to-evaluate metric. **Loses when:** evaluation takes hours (the loop becomes untenable) or the metric is easy to game.

**Failure mode:** Reward hacking at the harness level. An agent optimizing a test-pass metric will find ways to make tests pass without making code correct. The [auto-harness project](projects/auto-harness.md) discovered this and solved it with a regression gate: fixed failures become permanent test cases, so the agent can't backslide. [Source](../raw/tweets/gauri-gupta-auto-harness-self-improving-agentic-systems-with.md). Without that gate, the loop optimizes in circles.

---

### Can agents learn which information to remember?

Most memory systems treat memory construction as fixed policy: chunk conversations, embed them, retrieve by cosine similarity. [Mem-α](projects/mem-alpha.md) (193 stars) challenges this by training a 4B model with GRPO to decide what goes into episodic, semantic, or core memory based on task feedback. Trained on 30k-token sequences, the model generalizes to 400k+ tokens — 13x training length. [Source](../raw/repos/wangyu-ustc-mem-alpha.md). This is reinforcement learning applied to memory construction itself, not just task completion.

[Acontext](projects/acontext.md) (3,264 stars) takes a different angle: instead of opaque vector stores, it represents memory as structured Markdown files with agent-readable schemas. The distillation loop captures session messages, detects task completion, runs an LLM pass to extract what worked and failed, then uses a Skill Agent to write structured updates to the right file. Retrieval is by tool-call reasoning (`get_skill`, `get_skill_file`) rather than semantic top-k — the agent decides what it needs, which avoids the "retrieved irrelevant chunks" failure mode. [Source](../raw/repos/memodb-io-acontext.md).

[OpenViking](projects/openviking.md) (20,813 stars) solves the fragmentation problem with a filesystem-paradigm context database: `viking://` URIs unify memories, resources, and skills. The L0/L1/L2 tiered structure (abstract → overview → full content) loads context on demand, reducing token consumption. [Benchmark results from the OpenViking README](../raw/repos/volcengine-openviking.md) show a 43% improvement over baseline OpenClaw with 91% token reduction — noteworthy, but these come from the project's own evaluation script on LoCoMo10 data. The tiered loading is the most defensible claim: it's structurally sound regardless of the benchmark numbers.

**Wins when:** task domains have stable skill structures that agents can learn to recognize. **Loses when:** tasks are highly varied and skills don't transfer — the Skillbook or memory layer grows without pruning, retrieval degrades.

**Failure mode:** Memory pollution. A wrong memory is worse than no memory, because the agent acts confidently on false information. [Nemori](projects/nemori.md) (187 stars) addresses this by aligning memory segmentation with human episodic memory boundaries — LLM-powered boundary detection keeps episodes semantically coherent rather than arbitrary time-windowed. [Source](../raw/repos/nemori-ai-nemori.md). Without deliberate boundary detection, a single long conversation produces one giant memory that retrieves everything or nothing.

---

### Can evolutionary search replace manual architecture design?

[EvoAgentX](projects/evoagentx.md) and [ADAS](projects/adas.md) represent the evolutionary camp: treat agent architecture as a search problem. ADAS searches over agent designs using LLMs as the mutation operator. [GEPA](projects/gepa.md) applies evolutionary methods to prompt optimization. The underlying idea: rather than manually designing which tools, prompts, and reasoning patterns an agent uses, let an outer loop discover better configurations.

[SkillWeaver](projects/skillweaver.md) focuses specifically on skill composition: agents acquire atomic skills from experience and combine them into compound capabilities. This mirrors Voyager's approach but generalizes it beyond Minecraft — the skill library becomes the accumulating representation of what the agent has learned to do.

**Wins when:** the design space is large and human intuition about good configurations is weak. **Loses when:** evaluation is expensive or the fitness landscape has many deceptive local optima where a configuration scores well on training tasks but transfers poorly.

**Failure mode:** Evaluation overfitting. An agent architecture optimized on a fixed benchmark develops specific adaptations that look like general improvement but are actually benchmark-specific. [Autoresearch](projects/autoresearch.md) (3,142 stars) partially mitigates this by using a guard mechanism: changes must pass a secondary test suite before being accepted. [Source](../raw/repos/uditgoenka-autoresearch.md).

---

## The Convergence

Three things all serious systems now agree on that would have been controversial a year ago:

**Git is the right memory substrate for harness-level learning.** Every production self-improvement loop uses git commits as the unit of improvement. Failed experiments get reverted, not deleted — the failed attempt stays in history as evidence for future iterations. This was not obvious: the alternative (in-memory state) loses everything on crash and provides no audit trail.

**The regression gate is non-negotiable.** Every system that has run in production for more than a few iterations has independently reinvented the regression gate: improvements can't break previously solved cases. CORAL uses a leaderboard of attempts, auto-harness maintains a growing eval suite, GOAL.md's improvement loop requires a non-decreasing score. Without the gate, the system optimizes in circles.

**Improvement happens at three independent layers that require different techniques.** Harrison Chase's [framework](../raw/tweets/hwchase17-continual-learning-for-ai-agents.md) makes this explicit: model weights (SFT/RL, slow, expensive, risk of catastrophic forgetting), harness code and instructions (meta-optimization, medium cost, stable), and context/memory (fast, cheap, limited scope). Most practitioners focus on one layer and ignore the others. The right choice depends on the improvement timescale and the domain's structure.

## What the Field Got Wrong

**The assumption:** Better retrieval solves the memory problem. Early work focused on RAG improvements — better embeddings, reranking, hybrid search — as the path to agents that remember well.

**The evidence against it:** Karpathy's [LLM knowledge base experiments](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) showed that at small-to-medium scales (~100 articles, ~400K words), a well-organized markdown wiki with self-maintained indexes outperforms RAG because the LLM reasons about retrieval rather than blindly fetching by similarity. Mem0 (51,880 stars) reports 26% accuracy improvement over OpenAI Memory and 90% token reduction vs full-context — not by improving retrieval algorithms, but by letting the LLM decide what's worth keeping and surfacing it selectively. [Source](../raw/repos/mem0ai-mem0.md). ACE's Acontext shows the same pattern: agent-driven tool-call retrieval beats semantic top-k because the agent knows what context it actually needs.

**What replaced it:** The memory construction problem. The question shifted from "how do I retrieve the right memory?" to "how do I decide what's worth storing in the first place?" Mem-α trains this decision with RL. A-MEM builds dynamic knowledge networks where new memories trigger updates to existing ones. Nemori aligns segmentation with episodic boundaries. The retrieval problem turned out to be downstream of the construction problem.

## Failure Modes

**Reward hacking at the harness level.** An agent optimizing a test-pass metric will generate tests that always pass, hardcode expected outputs, or exploit evaluation framework bugs. Blast radius: the system reports improvement while actual capability degrades. Trigger: any fitness function that can be satisfied by changes other than genuine improvement. The regression gate (requiring previously passing tests to keep passing) is the primary mitigation, but it only catches regressions — not novel hacks. [Source](../raw/repos/jmilinovich-goal-md.md).

**Context drift in memory systems.** A Skillbook entry, memory block, or wiki article that starts with a subtle error compounds over time as downstream agents build on it. [The multi-agent wiki architecture](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md) addresses this by inserting a supervisor agent as a validation gate — a separate system that reads articles without knowledge of how they were produced and scores them before they enter the permanent knowledge base. Without this gate, one hallucinated connection corrupts the entire downstream chain. Blast radius: every agent in the swarm that retrieves the corrupted memory.

**Catastrophic forgetting at the model layer.** [Harrison Chase's framework](../raw/tweets/hwchase17-continual-learning-for-ai-agents.md) calls this out explicitly: when you update model weights on new tasks, the model degrades on previously known capabilities. This is an open research problem. Mitigation: use the context layer for fast adaptation, reserve model updates for stable, well-validated improvements, and always evaluate on a held-out set of previously mastered tasks before deploying updated weights.

**Evaluation collapse under self-modification.** An agent that modifies its own evaluation harness can trivially score 100% by making the eval always return success. DGM mitigates this by running validation against external benchmarks (SWE-bench, Polyglot) that the agent cannot modify. Systems that use self-designed evals without external validation are vulnerable. [Source](../raw/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md).

**Parallel agent knowledge races.** In multi-agent setups where agents share a mutable knowledge base, two agents can independently discover conflicting "improvements" and create a write conflict. CORAL's architecture sidesteps this with append-only attempt logs and symlinked shared state — agents see each other's results but don't merge changes automatically. Systems that allow arbitrary parallel writes without conflict resolution produce incoherent knowledge bases. [Source](../raw/repos/human-agent-society-coral.md).

## Selection Guide

- **If you need overnight autonomous improvement of a codebase with a computable metric**, use [autoresearch](projects/autoresearch.md) (3,142 stars) because it implements the full constraint-metric-loop pattern as a Claude Code skill with automatic rollback. Works on any domain, not just ML.

- **If your domain lacks a natural metric**, use [GOAL.md](projects/goal-md.md) (112 stars) because it provides templates for constructing fitness functions with dual-score safeguards that prevent the agent from gaming its own measurement.

- **If you need cross-session memory that persists user preferences**, use [Mem0](projects/mem0.md) (51,880 stars) because it handles the memory extraction and retrieval machinery with a clean SDK — the LOCOMO benchmark results (26% accuracy gain, 90% token reduction) are credible even if self-reported.

- **If you need agents that learn from their own traces without fine-tuning**, use [ACE / Agentic Context Engine](projects/agentic-context-engine.md) (2,112 stars) because its Recursive Reflector extracts actionable strategies from execution traces into a persistent Skillbook that compounds across sessions. The 2x pass^4 improvement on Tau2 is the most independently auditable claim in this space.

- **If you're running multi-agent optimization where agents need to share discoveries**, use [CORAL](projects/coral.md) (120 stars) because its symlinked `.coral/public/` directory solves the parallel-agent knowledge-sharing problem without sync overhead. Early project (120 stars), but the architecture is sound.

- **If you need the agent's memory to be human-readable and editable**, use [Acontext](projects/acontext.md) (3,264 stars) — skills are Markdown files you can inspect, edit, and version with git. Avoid opaque vector stores if you need to debug why an agent made a decision.

- **If you're building a production context database for multiple agents**, use [OpenViking](projects/openviking.md) (20,813 stars) because its L0/L1/L2 tiered loading and `viking://` URI system handle the fragmentation problem at scale. The 91% token reduction claim requires verification but the tiered loading mechanism is architecturally sound.

- **If you need model-weight-level improvement with reinforcement learning**, evaluate [Mem-α](projects/mem-alpha.md) (193 stars) for memory construction specifically — it's the only system that trains the memory-writing policy with RL rather than heuristics. The 13x generalization from 30k to 400k tokens is notable if it holds.

- **Avoid self-modification systems without sandboxing** in production. DGM, SICA, and CORAL all run agents in Docker containers or git worktrees for isolation. An agent with write access to its own validation code is a security risk.

## The Divergence

**Open-ended exploration vs. targeted optimization.** DGM and CORAL maintain archives of diverse agents and sample from them to generate new variants — the goal is exploring many paths through the capability space simultaneously. autoresearch and GOAL.md run a single agent that accumulates commits in a feature branch — the goal is finding the best configuration for a specific metric. Open-ended approaches discover surprising capabilities but are computationally expensive and hard to direct. Targeted approaches are efficient but can get stuck in local optima. DGM gets stuck too, but samples a different starting point from the archive when it does. This is an active split: both camps have working implementations, both produce real results, and neither has proven dominance.

**Symbolic skill libraries vs. distributed memory.** Voyager, SkillWeaver, and Acontext store learned capabilities as discrete, named, human-readable files — skills you can inspect, edit, and compose explicitly. Mem0, A-MEM, and Nemori store memories as dense representations in vector databases with LLM-extracted metadata. Symbolic systems are interpretable and composable but require clean skill boundaries. Distributed systems handle fuzzy knowledge but are opaque when they fail. The Memento-Skills [read-write reflection loop](../raw/repos/memento-teams-memento-skills.md) (916 stars) tries to bridge this by storing skills in structured files but updating them through automated reflection rather than manual curation.

**Online vs. offline improvement.** Most harness-improvement systems run offline: collect traces, analyze, propose changes, validate, deploy. The auto-harness system runs online: mine failures from production traces in real time, cluster them, convert to eval cases, propose and validate changes autonomously. [Source](../raw/tweets/gauri-gupta-auto-harness-self-improving-agentic-systems-with.md). Online improvement reacts to current user behavior but risks deploying changes that work on recent failures while regressing on older ones. The regression gate exists precisely to handle this — but gate size and composition matters. Too small a gate misses regressions; too large makes genuine improvements impossible.

**Context-layer vs. weight-layer improvement.** [The three-layer framework](../raw/tweets/hwchase17-continual-learning-for-ai-agents.md) makes this a principled choice rather than an accident. Context-layer improvement (memory, skills, CLAUDE.md) is fast, cheap, and reversible but bounded by what instructions can express. Weight-layer improvement (SFT, GRPO) is slow, expensive, risks catastrophic forgetting, but changes what the model can do. mem-agent ([Hugging Face article](../raw/articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md)) trains a 4B model with GSPO specifically for memory management — a weight-level investment that pays off if memory management is stable enough to warrant it. Most production systems currently favor context-layer improvement precisely because weight updates require infrastructure most teams don't have.

## What's Hot Now

Karpathy's autoresearch experiments generated ~10M views across multiple tweets in March 2026 ([source](../raw/tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md), 28,330 likes; [source](../raw/tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md), 19,459 likes), spawning a cluster of derivative projects: autoresearch (3,142 stars, launched March 2026), GOAL.md (112 stars), arscontexta (2,928 stars). OpenViking hit 20,813 stars with strong Trendshift rankings. Acontext reached 3,264 stars and growing Discord activity. CORAL (120 stars) is the newest entrant with a paper from April 2026.

The auto-harness pattern — self-improving agent systems that mine production failures — is gaining traction in practitioner circles: [Gauri Gupta's thread](../raw/tweets/gauri-gupta-auto-harness-self-improving-agentic-systems-with.md) on NeoSigma's implementation (1,101 likes, 137K views) frames the bottleneck shift from code generation to continuous validation. Harrison Chase's three-layer framework post is circulating as the reference architecture for how to think about improvement layers.

## Open Questions

**How do you measure genuine improvement vs. benchmark overfitting?** DGM reports large SWE-bench gains, but every optimization loop risks fitting to the benchmark. The field lacks accepted methodology for distinguishing real capability improvement from evaluation hacking — especially when the agent has access to the evaluation environment.

**When does context-layer improvement saturate?** The community hasn't established the ceiling for what agents can learn through memory and instruction updates without weight changes. Some domains (tool use, workflow optimization) seem tractable; others (multi-step reasoning, novel problem solving) may require weight updates. There's no principled model for predicting which camp a given task falls into.

**How do you handle forgetting in skill libraries?** As Skillbooks and memory systems grow, older entries become stale or contradict newer ones. None of the current systems have production-tested pruning strategies. ACE's SkillManager has deduplication (via embedding similarity as an optional module) but no principled policy for when to retire a skill.

**What's the right granularity for a "skill"?** Acontext stores skills as Markdown files with user-defined schemas. Voyager stores JavaScript functions. mem-agent stores Obsidian-style notes with graph links. There's no consensus on whether skills should be atomic actions, composite strategies, or domain knowledge — and the right answer probably varies by task type in ways the field hasn't mapped.

**Can open-ended exploration scale past toy benchmarks?** DGM's archive approach is compelling but expensive. The TSP and Minecraft examples in CORAL and Voyager are well-controlled. Nobody has demonstrated open-ended evolution producing genuinely novel capabilities in a real-world software engineering context without significant compute.
