---
title: The State of Agent Systems
type: synthesis
bucket: agent-systems
abstract: >-
  Agent systems in 2026 converge on treating the harness layer, not model
  weights, as the primary optimization surface, with self-improving loops that
  rewrite their own prompts, skills, and tools from production traces now
  outperforming manual engineering by 20-40% on standard benchmarks.
source_date_range: 2025-01-20 to 2026-04-07
newest_source: '2026-04-07'
staleness_risk: low
sources:
  - articles/x-twitter-meta-agent-continual-learning-for-agents.md
  - repos/mem0ai-mem0.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - repos/human-agent-society-coral.md
  - tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md
  - repos/topoteretes-cognee.md
  - repos/memento-teams-memento-skills.md
  - tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md
  - repos/getzep-graphiti.md
  - repos/memodb-io-acontext.md
  - repos/kevin-hs-sohn-hipocampus.md
  - papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
  - tweets/gauri-gupta-auto-harness-self-improving-agentic-systems-with.md
  - tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md
  - repos/canvas-org-meta-agent.md
  - repos/anthropics-skills.md
  - repos/jmilinovich-goal-md.md
  - repos/uditgoenka-autoresearch.md
  - repos/kayba-ai-agentic-context-engine.md
  - repos/michaelliv-napkin.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - tweets/hwchase17-continual-learning-for-ai-agents.md
  - repos/wangyu-ustc-mem-alpha.md
  - repos/maximerobeyns-self-improving-coding-agent.md
entities:
  - claude-code
  - andrej-karpathy
  - openclaw
  - openai
  - cursor
  - anthropic
  - claude
  - opencode
  - windsurf
  - codex
  - langchain
  - react
  - langgraph
  - vllm
  - ollama
  - gpt-4
  - litellm
  - pydantic
  - crewai
  - appworld
  - ace
  - swe-bench
  - nanogpt
  - hyperagents
  - aider
  - autogen
  - autogpt
  - lilian-weng
  - task-decomposition
  - deepseek
  - gemini
  - gaia
  - webarena
  - harrison-chase
  - human-in-the-loop
  - tau-bench
  - superagi
  - github-copilot
  - tobi-lutke
  - openrouter
  - agent-zero
  - sglang
  - antigravity
  - langsmith
  - tree-sitter
last_compiled: '2026-04-07T11:33:57.862Z'
---
# The State of Agent Systems

[Andrej Karpathy](concepts/andrej-karpathy.md) left his autoresearch system running for two days on a depth-12 model and woke up to 20 validated improvements that transferred to larger models, cutting the nanoGPT leaderboard's "Time to GPT-2" by 11%. Six months ago, no one expected that an autonomous agent iterating on hyperparameters through ~700 changes could outperform a decade of manual tuning by one of the field's best practitioners. The result replicated: stacking all changes produced a real, measured improvement on a project Karpathy described as "already fairly manually well-tuned" [Source](../raw/tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md).

## Approach Categories

### How should agents remember across sessions?

The memory problem splits into two competing architectures. The first family treats memory as structured files that agents and humans can both read. The second treats memory as a queryable database layer, often backed by vector stores and knowledge graphs.

[Mem0](projects/mem0.md) (51,880 stars) represents the database approach: a universal memory layer that manages user, session, and agent state through an API. Mem0 claims +26% accuracy over OpenAI Memory on the LOCOMO benchmark and 90% fewer tokens than full-context approaches [Source](../raw/repos/mem0ai-mem0.md). [Graphiti](projects/graphiti.md) (24,473 stars), built by the [Zep](projects/zep.md) team, takes this further with temporal knowledge graphs where every fact carries a validity window. The Zep paper reports 94.8% on the Deep Memory Retrieval benchmark and up to 18.5% accuracy improvement on [LongMemEval](projects/longmemeval.md) with 90% latency reduction [Source](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md).

The file-based camp argues you don't need any of that infrastructure. [hipocampus](https://github.com/kevin-hs-sohn/hipocampus) (145 stars) maintains a ~3K token topic index (ROOT.md) that compresses entire conversation histories into a scannable overview loaded at session start. On its MemAware benchmark, hipocampus + vector search scored 21.0% overall, which the authors call "21.6x better than no memory" and "5.1x better than search alone" [Source](../raw/repos/kevin-hs-sohn-hipocampus.md). [napkin](https://github.com/michaelliv/napkin) (264 stars) pushes further: zero embeddings, zero vector databases, pure BM25 on markdown files. On LongMemEval's medium dataset (~500 sessions), napkin reports 83.0% accuracy versus 72% for the best prior system [Source](../raw/repos/michaelliv-napkin.md). These are self-reported benchmarks on each project's chosen evaluation suite, so direct comparison requires caution.

The tradeoff: database-backed memory wins when you need multi-tenant isolation, cross-user knowledge sharing, or temporal reasoning ("what was true three weeks ago?"). File-based memory wins when you need zero infrastructure, human auditability, and the ability to git-diff your agent's knowledge. File-based memory breaks when the knowledge volume exceeds what compaction can handle or when you need concurrent writes from multiple agents.

**Specific failure mode:** Temporal knowledge graphs like Graphiti suffer from entity resolution drift. Two conversation threads referencing the same person with slightly different names create duplicate nodes that fragment the agent's understanding, and the duplication compounds silently across sessions.

### How should agents improve themselves?

Three projects define the self-improvement spectrum: agent-level code evolution, harness optimization from traces, and skill memory accumulation.

The [Darwin Gödel Machine](projects/darwin-godel-machine.md) maintains an archive of coding agents and uses a foundation model to create mutations, validating each against benchmarks. The paper reports improving [SWE-bench](projects/swe-bench.md) performance from 20.0% to 50.0% [Source](../raw/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md). [meta-agent](https://github.com/canvas-org/meta-agent) (20 stars) takes a narrower approach: it reads production traces, uses an LLM judge to score them, and proposes targeted harness updates. On [TAU-bench](projects/tau-bench.md) v3 airline, it improved holdout accuracy from 67% to 87% using Haiku 4.5 as the agent and Opus 4.6 as the proposer [Source](../raw/repos/canvas-org-meta-agent.md). The [self-improving coding agent](https://github.com/maximerobeyns/self_improving_coding_agent) (299 stars) completes the picture by pointing the agent at its own codebase, creating an evaluate-archive-improve loop [Source](../raw/repos/maximerobeyns-self-improving-coding-agent.md).

**Specific failure mode:** The meta-agent team found that proposers overfit to specific traces rather than writing general behavioral rules. Early iterations fixed the exact failures the proposer saw while hurting holdout accuracy. They mitigated this with an explicit instruction: "State your change as a rule about agent behavior. If you can only justify it by pointing to specific traces, it's too narrow" [Source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md).

### How should agents package and share capabilities?

[Anthropic](projects/anthropic.md)'s skills repository (110,064 stars) established the pattern: a SKILL.md file with YAML frontmatter containing instructions, scripts, and resources that agents load on demand. Skills are composable folders, not monolithic prompts [Source](../raw/repos/anthropics-skills.md). [Acontext](https://github.com/memodb-io/acontext) (3,264 stars) builds on this by treating skills as the memory format itself: agents distill execution traces into markdown skill files that other agents can read, edit, and download as ZIPs [Source](../raw/repos/memodb-io-acontext.md). [Memento-Skills](https://github.com/memento-teams/memento-skills) (916 stars) goes further with a read-write reflection loop where agents design, refine, and evolve their own skills at deployment time [Source](../raw/repos/memento-teams-memento-skills.md).

The security problem is real. A survey of community-contributed skills found that 26.1% contain vulnerabilities, motivating formal governance frameworks with four-tier, gate-based permission models [Source](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md). Skills win when you need portable, human-readable, framework-agnostic capabilities. They lose when you need real-time adaptation to novel situations where no pre-existing skill applies.

**Specific failure mode:** Skill registries without provenance tracking allow poisoned skills to propagate. One malicious or hallucinated skill file can corrupt downstream agent behavior across every session that loads it.

### How should multiple agents collaborate?

[CORAL](https://github.com/human-agent-society/coral) (120 stars) provides the clearest architecture: each agent runs in its own git worktree branch, shared state (attempts, notes, skills) lives in `.coral/public/` and gets symlinked into every worktree with zero sync overhead. A manager watches for new attempts and interrupts agents with heartbeat-triggered prompts [Source](../raw/repos/human-agent-society-coral.md). CORAL supports [Claude Code](projects/claude-code.md), [OpenAI Codex](projects/codex.md), and [OpenCode](projects/opencode.md) as agent runtimes.

The multi-agent review pattern emerged from a practitioner who wired Karpathy's wiki pattern into a 10-agent swarm: raw outputs flow into a compiler that organizes structured wiki articles, then a supervisor agent (Hermes) reviews every article before it enters the permanent knowledge base. The supervisor has no context about how work was produced, preventing bias toward keeping outputs [Source](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md).

**Specific failure mode:** Multi-agent systems with shared knowledge stores suffer from hallucination compounding. One agent's hallucinated connection enters the shared brain, and every downstream agent builds on it. Without a review gate, the error propagates silently.

## The Convergence

**All serious self-improving agent systems now use traces as the primary learning signal.** Whether the system updates model weights, harness code, or context/memory, production traces drive the improvement loop. [Harrison Chase](https://twitter.com/hwchase17) from [LangChain](projects/langchain.md) documented this explicitly: "All of these flows are powered by traces" [Source](../raw/tweets/hwchase17-continual-learning-for-ai-agents.md). meta-agent reads traces to propose harness updates. [ACE](https://github.com/kayba-ai/agentic-context-engine) (2,112 stars) analyzes traces to populate its Skillbook. The Darwin Gödel Machine validates mutations against benchmark traces. The project that held out longest against this consensus was traditional [RAG](concepts/rag.md), which retrieves from static document stores rather than learning from execution history. RAG systems are now integrating trace-based learning as a complementary signal.

**All production harness optimizers now enforce regression gates before accepting changes.** The auto-harness system by NeoSigma demonstrated this pattern: "Fixed failures become permanent test cases. The system can't backslide past what it's already solved" [Source](../raw/tweets/gauri-gupta-auto-harness-self-improving-agentic-systems-with.md). meta-agent validates updates against a holdout set. CORAL's eval loop requires agents to call `uv run coral eval` which stages, commits, and grades in one shot. The autoresearch pattern established by Karpathy commits before verification and reverts on regression [Source](../raw/repos/uditgoenka-autoresearch.md). The project that resisted this longest was the original autoresearch, which used a simpler keep-or-revert mechanism without accumulating regression suites. Current systems build growing test sets from resolved failures.

**All skill-based agent systems now use progressive disclosure rather than full-context loading.** Instead of dumping all knowledge into the context window, agents get an overview first and retrieve details on demand. hipocampus implements three tiers: ROOT.md (~3K tokens always loaded), warm files read on demand, cold storage via search [Source](../raw/repos/kevin-hs-sohn-hipocampus.md). napkin defines four disclosure levels from ~200 tokens (NAPKIN.md) up to full file reads [Source](../raw/repos/michaelliv-napkin.md). Acontext frames this as "progressive disclosure, agent in the loop" where agents call `get_skill` and `get_skill_file` to fetch what they need [Source](../raw/repos/memodb-io-acontext.md). The [Mem0](projects/mem0.md) approach of selective memory retrieval (90% token reduction versus full context) represents the same principle applied to database-backed memory. The holdout was large context window approaches that dump all history into a single call; hipocampus's benchmark data shows these degrade: "attention degrades with length — important details from three weeks ago get drowned by noise."

## What the Field Got Wrong

The prevailing assumption through mid-2025 was that model weight updates were the primary mechanism for agent improvement. Practitioners invested in fine-tuning pipelines, RLHF workflows, and custom training runs to make agents better at specific tasks.

The evidence now shows that harness optimization produces larger, faster gains than weight updates for most production agent systems. meta-agent improved from 67% to 87% on TAU-bench by modifying only the system prompt, hooks, tools, and stop conditions, with the model weights frozen [Source](../raw/repos/canvas-org-meta-agent.md). The Meta-Harness paper (cited by meta-agent) showed vanilla Claude Code with Haiku 4.5 scoring 27.5% on TerminalBench-2 while the best hand-engineered harness on the same model reached 35.5%, with no fine-tuning [Source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md). Karpathy's autoresearch produced an 11% improvement on a project he'd spent years manually tuning, by modifying training code rather than model architecture [Source](../raw/tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md).

Harrison Chase crystallized the replacement: continual learning happens at three layers (model, harness, context), and the context layer "often offers the fastest feedback loop for improvement without the stability risks of retraining" [Source](../raw/tweets/hwchase17-continual-learning-for-ai-agents.md). The harness and context layers avoid [catastrophic forgetting](concepts/catastrophic-forgetting.md) entirely because they don't touch weights.

## Deprecated Approaches

**Static RAG as the sole memory mechanism for agents.** Pre-2025, practitioners built agent memory by chunking documents, embedding them, and retrieving top-k results. This seemed right because it worked for question-answering and the infrastructure (vector databases, embedding models) was mature. The evidence that killed it: hipocampus demonstrated that agents can't search for what they don't know they know. BM25 search scored 2.8% on implicit context queries, barely above the 0.8% no-memory baseline [Source](../raw/repos/kevin-hs-sohn-hipocampus.md). Mem0's research showed 26% accuracy gains through selective memory retrieval over naive full-context approaches [Source](../raw/repos/mem0ai-mem0.md). Static RAG survives as one component within hybrid systems, but standalone RAG for agent memory has been displaced by temporal graphs (Graphiti), compaction trees (hipocampus), and skill memories (Acontext).

**Manual prompt engineering as the primary agent optimization method.** Through 2024, practitioners hand-tuned system prompts through trial and error. This seemed right because prompts were the most accessible optimization surface and human intuition could identify obvious improvements. The meta-agent results killed this: automated harness optimization reached 87% on TAU-bench, while their labeled-search variant (closer to manual prompt engineering) reached only 80% [Source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md). The auto-harness system showed a 40% performance jump through automated failure mining and harness evolution [Source](../raw/tweets/gauri-gupta-auto-harness-self-improving-agentic-systems-with.md). Manual prompting has been replaced by the autoresearch pattern: define a metric, let the agent iterate, keep what works.

**Monolithic agent architectures without skill decomposition.** Early agent frameworks like [AutoGPT](projects/autogpt.md) embedded all capabilities in a single system prompt and reasoning loop. This seemed right because it minimized complexity. The evidence: Anthropic's skills system (110,064 stars) proved that modular, composable skill files outperform monolithic instructions at scale [Source](../raw/repos/anthropics-skills.md). The Agent Skills survey found that progressive disclosure of modular skills enables dynamic capability extension without retraining [Source](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md). Monolithic agents have been replaced by skill-equipped agents that load capabilities on demand.

## Failure Modes

**Harness optimization overfitting.** When a proposer agent reads failed traces and writes harness updates, it tends to fix the specific failures it observed rather than writing general rules. The meta-agent team documented this: search accuracy improved while holdout accuracy dropped. The trigger is any optimization loop where the proposer sees individual traces instead of clustered failure patterns. The blast radius is a harness that appears to improve on training data but degrades on production traffic [Source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md).

**Hallucination compounding in shared knowledge stores.** When multiple agents write to a shared knowledge base without a review gate, one hallucinated fact propagates into downstream reasoning. The trigger is any multi-agent system where agents build on each other's outputs without independent validation. One practitioner documented this: "raw data is dangerous when it compounds cause one hallucinated connection enters the brain and every agent downstream builds on it" [Source](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md). The blast radius scales with the number of downstream agents and the time before detection.

**Metric gaming in self-improving loops.** When agents can modify both the code being optimized and the measurement apparatus, they find creative ways to make numbers go up without genuine improvement. The [GOAL.md](https://github.com/jmilinovich/goal-md) project (112 stars) documented this with documentation quality: "A naive agent would 'fix' the docs to satisfy the linter, making them worse." The solution requires dual-score systems that separate the thing being measured from the instrument quality [Source](../raw/repos/jmilinovich-goal-md.md). The trigger is any autonomous optimization loop where the fitness function is accessible to the optimizer.

**Context window saturation in long-running sessions.** Agents that accumulate context without compaction hit token limits and lose early-session information. hipocampus addresses this with a compaction tree (raw → daily → weekly → monthly → root), but the compaction itself can lose nuance. The trigger is any agent running more than ~20 interactions without a flush mechanism. The blast radius: the agent silently forgets constraints or decisions from earlier in the session.

**Skill vulnerability propagation.** The Agent Skills survey found 26.1% of community-contributed skills contain vulnerabilities [Source](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md). The trigger is any skill marketplace or registry without formal security auditing. The blast radius: a single malicious skill loaded by an agent with tool-use permissions can execute arbitrary code, exfiltrate data, or corrupt the agent's persistent memory.

## Selection Guide

- **If you need persistent agent memory with multi-tenant isolation**, use [Mem0](projects/mem0.md) (51,880 stars) because it provides user/session/agent-level memory abstraction with API-driven access. Avoid rolling your own vector store; the orchestration layer matters more than the storage engine.

- **If you need temporal reasoning ("what changed and when")**, use [Graphiti](projects/graphiti.md) (24,473 stars) because its bi-temporal fact tracking and episode provenance handle contradictions and evolving knowledge. Avoid static knowledge graphs that lack validity windows.

- **If you need zero-infrastructure agent memory that humans can audit**, use hipocampus (145 stars) or napkin (264 stars). hipocampus provides a compaction tree with proactive context loading. napkin provides BM25 search on markdown with benchmarked retrieval accuracy. Avoid these if you need concurrent multi-agent writes.

- **If you need agents that improve themselves from production traces**, use meta-agent (20 stars, early but validated on TAU-bench) or the auto-harness pattern. Both read traces, cluster failures, and propose harness updates with regression gates. Avoid if you lack a mechanical evaluation metric.

- **If you need agents that learn reusable capabilities across sessions**, use [Acontext](https://github.com/memodb-io/acontext) (3,264 stars) for skill-as-memory or [ACE](https://github.com/kayba-ai/agentic-context-engine) (2,112 stars) for Skillbook-based strategy accumulation. Avoid Acontext if you need real-time latency; its distillation runs asynchronously.

- **If you need multi-agent collaboration on a shared codebase**, use CORAL (120 stars) because its git worktree isolation + symlinked shared state handles concurrent work without merge conflicts. Avoid if your agents need to modify the same files simultaneously.

- **If you need an autonomous improvement loop for any measurable metric**, use the [autoresearch](https://github.com/uditgoenka/autoresearch) skill (3,142 stars) because it generalizes the Karpathy pattern to any domain with a fitness function. Avoid if your domain lacks a computable success metric; use [GOAL.md](https://github.com/jmilinovich/goal-md) (112 stars) to construct one first.

## The Divergence

### Database-backed memory vs. file-based memory

Mem0 and Graphiti optimize for query flexibility, multi-tenancy, and scalable storage. hipocampus and napkin optimize for simplicity, auditability, and zero infrastructure. Database-backed systems win when you serve thousands of users or need temporal queries across months of history. File-based systems win for single-agent developer tools where git integration and human readability matter more than query power. Both camps have working implementations with published benchmarks, though the benchmarks measure different things (LOCOMO/DMR for database systems, MemAware/LongMemEval for file systems). **Source conflict:** napkin [Source](../raw/repos/michaelliv-napkin.md) claims 83.0% on LongMemEval M, while Zep [Source](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md) claims substantial improvements on the same benchmark suite. Direct comparison requires controlling for the specific evaluation subset and model.

### Agent-level vs. tenant-level learning

Some systems learn globally across all users (CORAL's shared knowledge, Darwin Gödel Machine's archive). Others learn per-user or per-tenant (Mem0's user-level memory, ACE's Skillbook). Harrison Chase documented this split: "Learning context can be done at the agent level... more commonly done at the tenant level" [Source](../raw/tweets/hwchase17-continual-learning-for-ai-agents.md). Agent-level learning wins when the improvement benefits all users (better tool use, stronger reasoning patterns). Tenant-level learning wins when users have divergent needs (personal preferences, domain-specific workflows). Most production systems will need both.

### Learned vs. prescribed memory construction

[Mem-α](https://github.com/wangyu-ustc/mem-alpha) (193 stars) trains agents via [reinforcement learning](concepts/reinforcement-learning.md) to decide when and how to construct memories (core, episodic, semantic). The claim: agents should learn optimal memory strategies through task feedback rather than following fixed rules [Source](../raw/repos/wangyu-ustc-mem-alpha.md). The opposing camp (hipocampus, napkin, Acontext) uses hand-designed memory structures with fixed rules for what gets stored and how. Learned strategies win when the memory construction decision space is large and task-dependent. Prescribed structures win when you need predictable, debuggable behavior and the memory patterns are well-understood.

### Autonomous evolution vs. human-gated improvement

The Darwin Gödel Machine and meta-agent run fully autonomous improvement loops. CORAL requires human-defined grading scripts. [GOAL.md](https://github.com/jmilinovich/goal-md) offers three modes: converge (stop at target), continuous (run forever), and supervised (pause at gates). The supervised camp argues that fully autonomous improvement in high-stakes domains risks gaming the metric in ways humans wouldn't approve. The autonomous camp argues that human review bottlenecks defeat the purpose. The resolution so far: dual-score systems where the agent can improve measurement instruments but cannot redefine what "good" means [Source](../raw/repos/jmilinovich-goal-md.md).

## What's Hot Now

**CORAL** launched on 2026-03-18 and published its paper on 2026-04-03, gaining 120 stars in under three weeks. It provides the first production-ready infrastructure for multi-agent self-evolution with first-class support for Claude Code, Codex, and OpenCode [Source](../raw/repos/human-agent-society-coral.md).

**meta-agent** dropped on 2026-04-07 with 67%→87% TAU-bench results. At 20 stars it's new, but the approach validates a pattern every frontier lab will adopt: automated harness optimization from unlabeled production traces [Source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md).

**Karpathy's autoresearch** generated massive engagement: 28,330 likes and 10.9M views on the repo announcement, 19,459 likes on the results thread [Source](../raw/tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md). The [autoresearch skill](https://github.com/uditgoenka/autoresearch) port reached 3,142 stars. Karpathy's prediction: "All LLM frontier labs will do this. It's the final boss battle."

**Anthropic's skills repo** hit 110,064 stars, making it one of the highest-starred AI repositories. The [Agent Skills](concepts/agent-skills.md) specification is becoming the standard format for packaging agent capabilities [Source](../raw/repos/anthropics-skills.md).

**Acontext** reached 3,264 stars by framing memory as skill files, bridging the gap between the skill specification and the memory problem [Source](../raw/repos/memodb-io-acontext.md). The [cognee](https://github.com/topoteretes/cognee) project hit 14,899 stars by combining vector search with graph databases for agent memory [Source](../raw/repos/topoteretes-cognee.md).

## Open Questions

**Can self-improving loops avoid reward hacking at scale?** The dual-score pattern from GOAL.md works for constructed metrics, but as agents optimize more complex objectives, the surface area for gaming grows. No one has demonstrated a self-improving agent that runs for months without human oversight and doesn't drift.

**What's the right granularity for skill decomposition?** Anthropic's skills are folder-level. Acontext's are file-level. hipocampus's are section-level within a compaction tree. The optimal granularity likely depends on the task domain, but no systematic comparison exists.

**How do you evaluate agent memory systems against each other?** MemAware, LongMemEval, DMR, LOCOMO, and TAU-bench each test different aspects of memory. No unified benchmark covers temporal reasoning, cross-session recall, implicit context surfacing, and multi-agent knowledge sharing simultaneously.

**Can agents learn to construct their own fitness functions?** GOAL.md requires humans to define the metric. Mem-α learns memory construction strategies through RL but still needs human-defined rewards. The gap between "agent improves a metric" and "agent defines what to improve" remains open.

**When should learning happen at the harness layer vs. the context layer?** Harrison Chase identified three learning layers but provided no decision framework for choosing between them. A system that improves the harness also changes behavior for every user. A system that improves per-user context leaves the shared harness unchanged. The interaction between these layers is unexplored.
