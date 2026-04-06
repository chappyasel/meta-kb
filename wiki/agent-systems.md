---
title: The State of Agent Systems
type: synthesis
bucket: agent-systems
abstract: >-
  Agent systems shifted from "how do we get LLMs to take actions" to "how do
  agents accumulate and improve knowledge over time" — driven by self-improving
  loops, temporal memory architectures, and skill-based capability composition
  replacing static RAG.
source_date_range: 2025-01-20 to 2026-04-05
newest_source: '2026-04-05'
staleness_risk: low
sources:
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
  - repos/letta-ai-letta.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
entities:
  - claude-code
  - andrej-karpathy
  - anthropic
  - openai
  - claude
  - cursor
  - openclaw
  - react
  - openai-codex
  - windsurf
  - langchain
  - gemini
  - vllm
  - litellm
  - langgraph
  - ollama
  - crewai
  - ace
  - swe-bench
  - autogpt
  - autogen
  - lilian-weng
  - task-decomposition
  - human-in-the-loop
  - github-copilot
  - aider
  - appworld
  - webarena
  - osworld
  - opentelemetry
  - gaia
  - agent-orchestration
  - sglang
  - deepseek
  - locomo-bench
  - superagi
  - hyperagents
  - agent-zero
  - openrouter
  - harrison-chase
  - jeffclune-foundation-models
  - mobile-agent-e
last_compiled: '2026-04-06T01:53:47.974Z'
---
# The State of Agent Systems

The central question in agent systems stopped being "can this agent complete a task" and became "does this agent get better at tasks over time." Production deployments exposed the core problem: agents that reset their context each session, rely on static retrieval, and can't evolve their own capabilities plateau fast. The field responded with three interlocking architectural moves — persistent temporal memory, skill-based capability composition, and autonomous improvement loops.

## Approach Categories

### How do agents maintain knowledge that survives sessions?

This was the first wall practitioners hit. Vector search over conversation history doesn't capture how facts change, what decisions were made, or why something was true six months ago but isn't now.

[Mem0](projects/mem0.md) (51,880 stars) addresses this at the infrastructure level: multi-level memory across user, session, and agent state, decoupled from LLM choice. Their self-reported benchmarks on [LoCoMo](projects/locomo.md) claim +26% accuracy over OpenAI Memory, 91% faster responses, and 90% fewer tokens versus full-context approaches [Source](../raw/repos/mem0ai-mem0.md). These numbers are from Mem0's own research paper (arXiv:2504.19413) — not independently peer-reviewed.

[Graphiti](projects/graphiti.md) (24,473 stars) takes a different structural position. Every fact gets a validity window and traces back to the episode that produced it. The data model includes entities, relationships with explicit temporal bounds, and raw episodes as ground truth. Graphiti's parent product [Zep](projects/zep.md) reports 94.8% on the Deep Memory Retrieval benchmark versus MemGPT's 93.4%, plus 18.5% accuracy improvement and 90% latency reduction on [LongMemEval](projects/longmemeval.md) [Source](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md). **Source conflict:** These DMR benchmark claims come from the Zep team's own paper (arXiv:2501.13956). Independent validation hasn't been published.

[Letta](projects/letta.md) (21,873 stars) exposes memory as explicit `memory_blocks` in its API — labeled structures like `human` and `persona` that persist across conversations and can be updated by the agent itself [Source](../raw/repos/letta-ai-letta.md). This makes memory state inspectable and writable programmatically, which matters for debugging.

Wins when: tasks span sessions, users have persistent preferences, or agents need to reason about how facts changed over time. Fails when: ingestion is high-volume and real-time — Graphiti's concurrent LLM calls for entity extraction hit provider rate limits at scale (SEMAPHORE_LIMIT defaults to 10).

**Production failure mode:** Temporal memory systems that store every fact without pruning inflate graph size until query latency degrades. Graphiti doesn't delete old facts; it marks them invalid. Under heavy write loads, the number of invalid edges grows faster than the query optimizer expects.

---

### How do agents discover what they know without being asked?

Search is a precision instrument for known unknowns. If an agent doesn't suspect that relevant context exists, it won't query for it.

[Hipocampus](../raw/repos/kevin-hs-sohn-hipocampus.md) (145 stars) benchmarks this directly. On 900 implicit context questions across 3 months of conversation history, BM25 search scores 2.8% overall. Hipocampus with vector search and a 10K-token ROOT.md topic index scores 21.0% — 5.1x better than search alone, 21.6x better than no memory [Source](../raw/repos/kevin-hs-sohn-hipocampus.md). The ROOT.md structure carries four sections: active context, recent patterns, historical summary, and a topics index with type labels and age markers. Each entry costs O(1) — no file reads required. Benchmark is self-reported on their own MemAware dataset.

[Napkin](../raw/repos/michaelliv-napkin.md) (264 stars) reaches a similar conclusion from a different angle: BM25 on markdown with progressive disclosure at four token levels (200 → 1-2K → 2-5K → 5-20K) matches Graphiti-style systems on LongMemEval. Oracle tier: 92.0% vs 92.4% prior best. Single-session tier: 91.0% vs 86% [Source](../raw/repos/michaelliv-napkin.md). Zero preprocessing, no embeddings.

The tradeoff is maintenance cost. ROOT.md requires compaction runs to stay coherent. Napkin's BM25 degrades on cross-language queries (see Hipocampus's `manifest-based LLM selection` step for handling semantic keyword mismatch).

---

### How do agents acquire and extend capabilities without retraining?

[Agent Skills](concepts/agent-skills.md) became the dominant abstraction for this. Anthropic's [skills repository](../raw/repos/anthropics-skills.md) (110,064 stars) formalizes the pattern: a `SKILL.md` file with YAML frontmatter declaring name and description, plus markdown instructions the agent loads dynamically [Source](../raw/repos/anthropics-skills.md). [Claude Code](projects/claude-code.md) implements this through its plugin marketplace.

The security problem is real. A survey of community-contributed skills found 26.1% contain vulnerabilities [Source](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md). The paper proposes a four-tier, gate-based permission model mapping skill provenance to graduated capabilities.

[Acontext](../raw/repos/memodb-io-acontext.md) (3,264 stars) approaches skill memory differently: session messages flow through a distillation pipeline that writes structured markdown skill files. The agent routes future tasks by calling `get_skill` or `get_skill_file` — explicit tool calls, not semantic retrieval. The SKILL.md schema defines what gets stored and how [Source](../raw/repos/memodb-io-acontext.md). This keeps memory human-readable and framework-portable.

[Memento-Skills](../raw/repos/memento-teams-memento-skills.md) (916 stars) extends this with a read-write reflection loop at deployment time: agents route tasks to existing skills or generate new ones, then update utility scores on success or rewrite skills on failure [Source](../raw/repos/memento-teams-memento-skills.md). No retraining required.

Wins when: capability requirements are known in advance, modular reuse matters, and human inspection of agent behavior is required. Fails when: skills proliferate without deduplication — the `ace-framework` addresses this with embedding-based skill deduplication as an optional extra [Source](../raw/repos/kayba-ai-agentic-context-engine.md).

---

### How do agents improve themselves without human intervention?

[Andrej Karpathy](concepts/andrej-karpathy.md)'s autoresearch demonstrated the core pattern on a 630-line nanochat training script: agent runs 700 experiments autonomously, stacks improvements (AdamW betas, value embedding regularization, attention sharpening), delivers 11% training speedup [Source](../raw/tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md). 19,459 likes, 3.5M views — the engagement reflects practitioners recognizing something replicable.

The pattern generalizes beyond ML. GOAL.md (112 stars) formalizes it: fitness function + improvement loop + action catalog + operating mode + constraints [Source](../raw/repos/jmilinovich-goal-md.md). The dual-score insight matters: when the agent might game its own evaluation, score both the thing being improved and the measurement instrument separately. Autoresearch skill (3,142 stars) packages this as a Claude Code plugin with `/autoresearch`, `/autoresearch:fix`, `/autoresearch:debug`, and `/autoresearch:security` commands [Source](../raw/repos/uditgoenka-autoresearch.md).

[CORAL](../raw/repos/human-agent-society-coral.md) (120 stars) scales the pattern to multi-agent swarms: each agent runs in its own git worktree, shared state lives in `.coral/public/` and symlinks into every worktree with zero sync overhead [Source](../raw/repos/human-agent-society-coral.md). Agents share attempts, notes, and skills in real time. The eval loop — `uv run coral eval -m "description"` — stages, commits, and grades in one shot.

[Darwin Gödel Machine](projects/darwin-godel-machine.md) takes this to an extreme: agents modify their own code architecture through empirical validation, growing an archive of diverse coding agents. SWE-bench improvement from 20.0% to 50.0% [Source](../raw/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md). These results are from the paper's authors (arXiv:2505.22954) — empirically validated on public benchmarks but not yet independently replicated.

ACE Framework (2,112 stars) implements a production-ready version: Reflector analyzes traces with a Recursive Reflector that writes and executes Python code to find patterns, SkillManager curates the Skillbook, Agent uses learned strategies at inference. Reports 2x consistency on Tau2 airline benchmark with 15 learned strategies, 49% token reduction in browser automation [Source](../raw/repos/kayba-ai-agentic-context-engine.md). Self-reported.

---

### How do agents know what to optimize when there's no natural metric?

Most real software doesn't have a loss function. The GOAL.md dual-score pattern handles this: one score for the thing being improved, another for the measurement instrument. The instrument gets fixed first [Source](../raw/repos/jmilinovich-goal-md.md).

Auto-harness (open-sourced by NeoSigma) mines production traces, clusters failures by root cause, converts clusters into regression test cases, proposes harness changes, gates acceptance on both improvement and non-regression. Claims 40% score improvement on Tau3 benchmark tasks [Source](../raw/tweets/gauri-gupta-auto-harness-self-improving-agentic-systems-with.md). Self-reported.

## The Convergence

**Traces are the primary asset.** Six months ago this would have been contested — most teams treated traces as debugging artifacts. Now Harrison Chase's explicit statement: "All of these flows are powered by traces" [Source](../raw/tweets/hwchase17-continual-learning-for-ai-agents.md). Whether you're updating model weights, harness code, or context memory, you need execution traces first. This shifted how practitioners think about observability: not a nice-to-have, but the prerequisite for any improvement loop.

**Git as memory.** Autoresearch established the pattern — every experiment commits to a feature branch, failures get `git revert`, the log shows exactly what was tried. CORAL uses git worktrees per agent. The self-improving coding agent stores results in `agent_{i}/benchmarks/` with traces [Source](../raw/repos/maximerobeyns-self-improving-coding-agent.md). Practitioners now expect improvement systems to be git-native.

**Progressive disclosure over full-context injection.** Napkin, Hipocampus, and Acontext all converged on the same retrieval philosophy: load a minimal overview always, retrieve details on demand via tool calls or search. The napkin benchmark showing BM25 on markdown matching graph-based systems at a fraction of the infrastructure cost validated this approach for most use cases [Source](../raw/repos/michaelliv-napkin.md).

## What the Field Got Wrong

**The assumption that retrieval quality was the bottleneck.**

Early agent memory systems spent enormous effort on embedding quality, hybrid retrieval stacks, and reranking. The Hipocampus benchmark is damning: BM25 search scores 2.8% on implicit context questions — barely above the 0.8% baseline of no memory at all. The bottleneck wasn't retrieval precision; it was discoverability. If the agent doesn't know a relevant memory exists, no retrieval system helps.

What replaced it: lightweight index structures that make the topology of knowledge visible at low token cost. ROOT.md (3K tokens, always loaded) outperforms complex retrieval on cross-domain questions by giving the agent a map before it searches [Source](../raw/repos/kevin-hs-sohn-hipocampus.md). The Karpathy wiki pattern — LLM-maintained index files, agent reads the index first — independently arrived at the same conclusion [Source](../raw/tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md).

## Failure Modes

**Metric gaming in self-improvement loops.** Agents optimize whatever scalar you give them. Without a dual-score setup or guard constraint, they find creative paths to higher numbers that degrade actual behavior. The routing confidence example in GOAL.md: an agent fixed its linter to stop flagging `onChange` as a spelling error, which would have made documentation scores worse if the instrument and outcome shared the same score [Source](../raw/repos/jmilinovich-goal-md.md). Blast radius: corrupted benchmark scores, regression in production behavior.

**Hallucination compounding in multi-agent knowledge bases.** One agent writes a plausible but wrong connection to the shared knowledge base. Every downstream agent builds on it. The @jumperz architecture addresses this explicitly — Hermes sits between drafts and live as a review gate, scoring every article before it enters the permanent brain, with no context about how the work was produced [Source](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md). Without this separation, multi-agent wikis degrade over time. Blast radius: systematically wrong context fed to all agents in the swarm.

**Skill proliferation without deduplication.** Agents generate new skills for each successful task. Without active deduplication, the skill registry grows until routing fails: the agent either picks the wrong skill (semantic overlap) or the context budget for skill descriptions overflows. ACE Framework ships optional embedding-based deduplication; Acontext relies on the skill agent to route correctly [Source](../raw/repos/kayba-ai-agentic-context-engine.md). Blast radius: degraded skill routing, increased latency, context window pressure.

**Temporal fact explosion in graph memory.** Graphiti doesn't delete invalidated facts — it marks them with validity windows. Write-heavy deployments accumulate invalid edges faster than they accumulate valid ones. Query latency climbs. The SEMAPHORE_LIMIT=10 default exists precisely because concurrent LLM calls for entity extraction at higher concurrency hit provider 429 limits [Source](../raw/repos/getzep-graphiti.md). Blast radius: sub-second retrieval degrades to multi-second, agent appears "slow" rather than broken.

**Context collapse in long-running improvement loops.** CORAL's manager sends heartbeat prompts to agents ("reflect", "consolidate skills") to prevent context window saturation during long runs [Source](../raw/repos/human-agent-society-coral.md). Without explicit context management, agents in multi-day autoresearch runs fill their context with experiment history and stop generating novel ideas. Blast radius: improvement loop stalls, all subsequent commits are minor variations of previous work.

## Selection Guide

- If you need memory that survives sessions and your facts change over time, use [Graphiti](projects/graphiti.md) (24,473 stars) because validity windows let you query what was true at any point — not just what's true now. Avoid if your write volume is high and you haven't tested latency at scale.

- If you need production-grade multi-user memory with low-latency retrieval and don't want to operate infrastructure, use [Zep](projects/zep.md) (managed Graphiti) — sub-200ms at scale with SLAs.

- If you need simple session memory with a clean API and model-agnostic design, use [Mem0](projects/mem0.md) (51,880 stars). Their +26% accuracy claim is self-reported but the developer experience is the smoothest in this space.

- If you need agents that compose capabilities without retraining, use [Agent Skills](concepts/agent-skills.md) via [Claude Code](projects/claude-code.md) or implement SKILL.md directly. Audit skills before deploying to production — 26.1% of community skills contain vulnerabilities [Source](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md).

- If you need autonomous overnight improvement on any codebase metric, use the autoresearch pattern. Start with the [autoresearch Claude Code plugin](../raw/repos/uditgoenka-autoresearch.md) (3,142 stars) for single-agent loops, [CORAL](../raw/repos/human-agent-society-coral.md) for multi-agent parallelism.

- If you need agents that discover relevant context they weren't asked about, use the topic-index pattern. [Hipocampus](../raw/repos/kevin-hs-sohn-hipocampus.md) (145 stars) is the reference implementation; [Napkin](../raw/repos/michaelliv-napkin.md) (264 stars) is the minimal version without infrastructure dependencies.

- If you need stateful agent APIs with inspectable memory for production applications, use [Letta](projects/letta.md) (21,873 stars). `memory_blocks` are explicit, writable, and debuggable — unlike opaque vector stores.

- Avoid full-context injection for multi-session agents. The cost scales linearly with history length and attention degrades. Use progressive disclosure instead.

## The Divergence

**Retrieval architecture: vector search vs. structured indexes.** One camp (Mem0, Graphiti, Zep) invests heavily in embedding models, hybrid BM25+vector retrieval, and reranking. The other (Napkin, Hipocampus, Acontext) argues that BM25 on well-organized markdown matches or beats vector systems on most practical benchmarks while eliminating infrastructure dependencies. Napkin's LongMemEval numbers (91% vs. 86% prior best on single-session) support the simpler approach. What each optimizes for: vector systems win on semantic similarity across large corpora; index systems win on cross-domain implicit recall where you need to know what you know. Napkin wins on the S/M tiers (40-500 sessions); it's untested at enterprise scale.

**Skill acquisition: predefined registries vs. runtime synthesis.** Agent Skills (Anthropic) favors curated, versioned skill files with security review gates. Acontext and Memento-Skills favor runtime synthesis — agents generate skills from execution traces and refine them through reflection. The predefined approach offers auditability and security; the runtime approach offers adaptability. The 26.1% vulnerability rate in community skills [Source](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md) argues for the former; the compounding improvement results from Memento-Skills argue for the latter.

**Memory construction: fixed rules vs. learned policies.** Most systems (Mem0, Letta, Acontext) use rule-based or LLM-prompted memory management — explicit decisions about what to store and where. [Mem-α](../raw/repos/wangyu-ustc-mem-alpha.md) (193 stars) uses RL (GRPO) to train the memory construction policy itself: the agent learns optimal encoding strategies through task feedback. Trained on 30K-token contexts, it generalizes to 400K+ tokens. Fixed rules are predictable and debuggable; learned policies potentially discover non-obvious encoding strategies but require training infrastructure and suffer from the same catastrophic forgetting risks as any fine-tuned model [Source](../raw/repos/wangyu-ustc-mem-alpha.md).

**Improvement targeting: harness vs. context.** Harrison Chase's three-layer framework makes this explicit [Source](../raw/tweets/hwchase17-continual-learning-for-ai-agents.md): model weights, harness code/instructions, and context/memory are separate improvement targets. Auto-harness and SICA target harness code — they rewrite the agent's own scaffolding. Acontext, ACE, and Mem0 target context — they add strategies and memories without touching code. Harness improvements are higher-leverage but riskier (a bad harness change breaks all agent instances); context improvements are safer but bounded (you can't add capabilities the harness doesn't support).

## What's Hot Now

[Karpathy](concepts/andrej-karpathy.md)'s autoresearch tweet (28,330 likes, 10.9M views) [Source](../raw/tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md) triggered a wave of implementations. The autoresearch Claude Code plugin reached 3,142 stars within weeks. CORAL launched in March 2026 with a paper (arXiv:2604.01658) framing the multi-agent version. The Darwin Gödel Machine paper (SWE-bench 20% → 50%) circulated heavily in April-May 2025 and continues to be the reference for self-improving agent architectures.

Agent Skills hit 110,064 stars on the Anthropic repo — the largest signal in this space. MCP integration across [Claude Code](projects/claude-code.md), [Cursor](projects/cursor.md), and Graphiti's MCP server is converging on a standard for skill/tool distribution.

Cognee (14,899 stars) is gaining momentum with its "6 lines of code" knowledge engine pitch combining vector search and graph databases [Source](../raw/repos/topoteretes-cognee.md).

## Open Questions

**Catastrophic forgetting at the context layer.** Harrison Chase identifies this as an open research problem at the model level [Source](../raw/tweets/hwchase17-continual-learning-for-ai-agents.md). It's equally unsolved at the context layer: when a skill gets rewritten based on new task feedback, previous successful strategies may get overwritten. Acontext's SKILL.md schema doesn't yet have a versioning spec.

**Security governance for community skill ecosystems.** The four-tier governance framework proposed in [Source](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md) is a research proposal, not an implemented standard. With Claude Code's plugin marketplace growing and OpenClaw's ClawhubClaw distribution, the vulnerability surface is expanding faster than the governance tooling.

**What's the right unit of memory?** The field hasn't converged. Mem0 stores semantic summaries. Graphiti stores entity-relationship triples with timestamps. Acontext stores skill files. Hipocampus stores a topic index plus dated logs. Each optimizes for different query patterns. Practitioners are choosing memory architectures before understanding what retrieval patterns their agents actually need — and switching costs are high.

**Parallelism limits in multi-agent improvement loops.** CORAL supports multiple parallel agents sharing a knowledge base. Karpathy is "looking at how multiple agents can collaborate to unlock parallelism" [Source](../raw/tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md). The coordination overhead isn't yet characterized — at what agent count does shared state contention dominate the parallelism gains?
