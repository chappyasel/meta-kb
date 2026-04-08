---
title: The State of Agent Architecture
type: synthesis
bucket: agent-architecture
abstract: >-
  Agent architecture has converged on harness optimization as the primary
  performance lever, with systems like Meta-Harness demonstrating that the code
  surrounding a model creates up to 6x performance gaps on identical benchmarks,
  yet the field splits sharply on whether that harness should be hand-curated,
  self-modifying, or evolved through multi-agent feedback loops.
source_date_range: 2025-01-20 to 2026-04-08
newest_source: '2026-04-08'
staleness_risk: low
sources:
  - articles/x-twitter-meta-agent-continual-learning-for-agents.md
  - deep/repos/anthropics-skills.md
  - repos/mem0ai-mem0.md
  - repos/human-agent-society-coral.md
  - deep/repos/greyhaven-ai-autocontext.md
  - deep/repos/davebcn87-pi-autoresearch.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/repos/human-agent-society-coral.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/repos/maximerobeyns-self-improving-coding-agent.md
  - deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
  - repos/getzep-graphiti.md
  - repos/safishamsi-graphify.md
  - repos/kevin-hs-sohn-hipocampus.md
  - repos/anthropics-skills.md
  - repos/michaelliv-napkin.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/memodb-io-acontext.md
  - deep/repos/affaan-m-everything-claude-code.md
  - deep/repos/agenticnotetaking-arscontexta.md
  - deep/repos/kevin-hs-sohn-hipocampus.md
  - deep/repos/garrytan-gstack.md
  - deep/repos/foundationagents-metagpt.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
entities:
  - claude-code
  - andrej-karpathy
  - cursor
  - openai
  - anthropic
  - claude
  - react
  - langchain
  - opencode
  - windsurf
  - codex
  - agent-skills
  - vllm
  - ollama
  - gemini-cli
  - gemini
  - appworld
  - ace
  - swe-bench
  - gpt-4
  - tree-sitter
  - human-in-the-loop
  - execution-traces
  - langgraph
  - github-copilot
  - litellm
  - cognitive-architecture
  - webarena
  - mind2web
  - skill-book
  - skillweaver
  - tau-bench
  - lilian-weng
  - openai-agents-sdk
  - aider
  - autogpt
  - osworld
  - elizaos
  - pi
  - workflow-induction
  - agent-harness
  - docker-sandbox
  - observability
  - world-model
  - deepseek
  - composable-skills
  - tool-registry
  - structured-output
  - gaia
  - humaneval
  - antigravity
  - agent-zero
  - termination-bench
  - superagi
  - compound-engineering
  - loop-detection
  - tool-integrated-reasoning
last_compiled: '2026-04-08T02:31:48.998Z'
---
# The State of Agent Architecture

Meta-Harness gave a coding agent (Claude Haiku 4.5) access to its own execution traces and prior harness candidates, then let it rewrite its own scaffolding code. Everyone expected the agent to make incremental prompt tweaks. Instead, it discovered an environment bootstrapping pattern (injecting OS capabilities, language availability, and package manager state before the agent loop) that eliminated 3-5 wasted exploration turns per task and pushed Haiku 4.5 to the #1 ranking among all agents using that model on TerminalBench-2, beating hand-engineered harnesses that had months of human iteration [Source](../raw/deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md).

The equation that now governs the field: `agent = model + harness`. The harness is everything that is not model weights: system prompts, tools, skills, retrieval logic, memory management, sub-agents, hooks, stop conditions. And the harness, it turns out, matters as much as the model.

## Approach Categories

### How should an agent acquire and organize capabilities?

The skill-as-file pattern has won. [Anthropic](projects/anthropic.md)'s skills repository (110,064 stars) established the canonical format: a folder containing a SKILL.md file with YAML frontmatter (`name` and `description` required) plus markdown instructions, optionally bundled with scripts and reference files. The key innovation is [Progressive Disclosure](concepts/progressive-disclosure.md): metadata (~100 tokens) stays always loaded for routing decisions, instructions load when triggered, and resources load on demand [Source](../raw/deep/repos/anthropics-skills.md). This solves the context window budget problem. An agent can "know about" hundreds of skills at negligible token cost while paying full context cost only for active ones.

Everything Claude Code (136,116 stars) pressure-tests this pattern at scale: 156 skills across 12 language ecosystems, with a manifest-driven selective install system and three profiles (core, developer, full). At this scale, the hard problem shifts from individual skill quality to skill governance: conflict detection between overlapping skills, install profiles that prevent context budget exhaustion, and hook runtime controls that gate enforcement by environment variables rather than requiring file modifications [Source](../raw/deep/repos/affaan-m-everything-claude-code.md).

gstack (63,766 stars) adds process sequencing: skills compose into a Think-Plan-Build-Review-Test-Ship-Reflect pipeline where each skill's output feeds the next skill's context. Its SKILL.md.tmpl template system generates documentation from source code metadata, preventing the documentation drift that plagues large skill registries [Source](../raw/repos/garrytan-gstack.md).

**Wins when** you need modular, human-readable, version-controlled capabilities. **Loses when** skills need to learn from runtime experience or adapt to novel domains without human authorship. **Specific failure mode**: skill triggering depends entirely on description quality. [Anthropic](projects/anthropic.md)'s own skill-creator warns that Claude tends to under-trigger skills, and making descriptions "a little bit pushy" to compensate creates false-positive triggering [Source](../raw/deep/repos/anthropics-skills.md).

### How should an agent improve its own performance over time?

Three distinct self-improvement architectures now compete.

**Harness search** treats the scaffolding around a model as an optimization target. [Meta-Harness](concepts/agent-harness.md) gives a coding agent (Claude Code with Opus-4.6) filesystem access to all prior harness candidates' source code, execution traces, and scores, then lets it propose new harness variants. The agent reads a median of 82 files per iteration, referencing over 20 prior candidates. On text classification, it achieved +7.7 points over ACE with 4x fewer context tokens. The defining ablation: full execution trace access yields 50.0 median accuracy versus 34.6 with scores only and 34.9 with scores plus summaries. Compressed feedback destroys causal signal [Source](../raw/deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md).

The [meta-agent](concepts/meta-agent.md) project (from Canvas) applies this pattern to production traces specifically. It points an LLM judge at unlabeled production traces, has a proposer read failed traces and write targeted harness updates, and keeps updates only if holdout accuracy improves. On [Tau-bench](projects/tau-bench.md) v3 airline, it improved holdout accuracy from 67% to 87% using judge-based search rather than labeled data [Source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md).

**Scaffold self-modification** goes further. SICA (299 stars) has the agent modify its own Python source code: tools, reasoning structures, sub-agent implementations. SWE-Bench Verified accuracy went from 17% to 53% across 14 iterations. The agent invented an AST-based symbol locator at iteration 9 by reading its own failure traces. But path dependence is the dominant failure mode. The authors acknowledge: "poor quality initial feature suggestions often lower the quality of subsequent feature suggestions." Two runs from the same starting point produce very different trajectories [Source](../raw/deep/repos/maximerobeyns-self-improving-coding-agent.md).

**Multi-agent evolutionary search** distributes improvement across parallel agents. CORAL (120 stars) spawns autonomous coding agents in isolated git worktrees with shared state (attempts, notes, skills) symlinked via `.coral/public/`. Agents see each other's work in real time through the filesystem. A heartbeat system with plateau detection interrupts stalled agents with reflection prompts [Source](../raw/deep/repos/human-agent-society-coral.md). Autocontext (695 stars) takes the most ambitious approach: five specialized agents per generation (Competitor, Analyst, Coach, Architect, Curator), with Elo/Glicko scoring, Pareto frontier tracking, and frontier-to-local model distillation [Source](../raw/deep/repos/greyhaven-ai-autocontext.md).

**Wins when** you have a measurable metric and tolerance for compute costs. **Loses when** the feedback signal is noisy, the evaluation is expensive, or path dependence steers optimization into local optima. **Specific failure mode**: meta-agent's proposer tends to overfit to specific traces rather than writing general behavioral rules. The team mitigated this with a simple instruction: "State your change as a rule about agent behavior. If you can only justify it by pointing to specific traces, it's too narrow" [Source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md).

### How should an agent remember across sessions?

The field has split into three memory architectures with different tradeoff profiles, covered in depth in [The State of Agent Memory](../wiki/agent-memory.md). Briefly: [Mem0](projects/mem0.md) (51,880 stars) provides a flat memory layer with multi-level abstraction (user/session/agent) and claims 26% accuracy gains over OpenAI Memory with 90% fewer tokens [Source](../raw/repos/mem0ai-mem0.md). [Graphiti](projects/graphiti.md) (24,473 stars) implements temporal context graphs with bi-temporal edge invalidation, achieving 18.5% accuracy improvement and 90% latency reduction on LongMemEval [Source](../raw/deep/repos/getzep-graphiti.md). And file-based systems like Hipocampus (145 stars) achieve 21x improvement over no memory on implicit recall by maintaining a 3K-token compressed topic index that makes the agent aware of everything it has ever discussed [Source](../raw/deep/repos/kevin-hs-sohn-hipocampus.md).

### How should an agent learn from its own execution?

Acontext (3,300 stars) implements a three-stage pipeline: Task Agent extracts tasks from message streams, a Distillation phase classifies learnings as SOPs, failure warnings, or factual content using [LLM-as-Judge](concepts/llm-as-judge.md), and a Skill Learner Agent writes structured markdown skill files. The key design choice: memory is human-readable markdown, not opaque vector embeddings, making it debuggable and editable [Source](../raw/deep/repos/memodb-io-acontext.md).

[Pi-autoresearch](projects/pi.md) (3,393 stars) takes a different approach: the try/measure/keep/revert loop. An agent makes an edit, runs a benchmark, and keeps or reverts based on MAD-based statistical confidence. Tobi Lutke used it to achieve a 53% parse+render speedup on Shopify's 20-year-old Liquid template engine across ~120 automated experiments [Source](../raw/deep/repos/davebcn87-pi-autoresearch.md).

**Wins when** the learning signal is clear and the domain is stable. **Loses when** learnings are contradictory over time or the skill library grows past the phase transition point where routing accuracy collapses. The agent skills survey documents this transition: beyond a critical library size, skill selection accuracy degrades sharply [Source](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md).

## The Convergence

**All production systems now use structured, typed outputs for inter-component communication rather than free-form text.** [MetaGPT](projects/metagpt.md) (66,769 stars) routes messages between roles via `cause_by` metadata on typed Message objects with Pydantic `instruct_content` payloads [Source](../raw/deep/repos/foundationagents-metagpt.md). Graphiti extracts entities and edges as structured Pydantic models with typed temporal fields [Source](../raw/deep/repos/getzep-graphiti.md). Even SICA, which modifies its own code, uses structured JSON for benchmark results and contextual summaries. The last significant holdout was the [ReAct](concepts/react.md) pattern in its original form, which interleaved natural language reasoning with action strings. Modern implementations wrap ReAct outputs in structured schemas.

**All production systems now separate the evaluation signal from the improvement mechanism.** meta-agent separates the LLM judge (scoring) from the proposer (suggesting changes) and validates on a holdout set [Source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md). SICA separates benchmark evaluation from the meta-improvement agent and uses confidence-interval-aware selection rather than greedy best-pick [Source](../raw/deep/repos/maximerobeyns-self-improving-coding-agent.md). Autocontext separates the Analyst (diagnosis) from the Coach (lesson codification) from the Curator (quality gating) [Source](../raw/deep/repos/greyhaven-ai-autocontext.md). CORAL separates the grader (scoring function) from the agents (optimization). The system that held out longest against this consensus was AutoGPT, which originally had the same agent evaluate its own output and decide next steps. AutoGPT's well-documented looping problems drove the field toward explicit separation.

**All production systems now persist harness state to the filesystem rather than holding it in LLM context.** Pi-autoresearch persists to `autoresearch.jsonl` and `autoresearch.md` so a fresh agent can continue exactly where the previous session left off [Source](../raw/deep/repos/davebcn87-pi-autoresearch.md). CORAL persists attempts, notes, and skills to `.coral/public/` with symlinks into each agent's worktree [Source](../raw/deep/repos/human-agent-society-coral.md). Hipocampus persists to a compaction tree of markdown files [Source](../raw/deep/repos/kevin-hs-sohn-hipocampus.md). Ars Contexta persists to a three-space architecture (self/notes/ops) with hook-driven enforcement [Source](../raw/deep/repos/agenticnotetaking-arscontexta.md). The systems that held out longest were early [LangChain](projects/langchain.md) Memory implementations, which kept conversation history in Python objects and lost everything on process restart. The field learned from that failure.

## What the Field Got Wrong

Practitioners assumed that longer context windows would solve agent memory. The reasoning was straightforward: if you can fit more conversation history in context, the agent remembers more. [Anthropic](projects/anthropic.md) shipped 200K token windows, Google pushed to 1M, and many teams concluded that memory management was a solved problem.

The evidence now contradicts this assumption. Hipocampus's MemAware benchmark shows that BM25 search on full conversation history scores 2.8% on implicit context questions, barely better than no memory (0.8%), despite consuming 5x the tokens. The problem is not storage capacity but retrieval: you cannot search for connections you do not know exist. Hipocampus's 3K-token compressed topic index achieves 17.3%, a 5x improvement over search alone, because it gives the agent awareness of its own knowledge without requiring a query [Source](../raw/deep/repos/kevin-hs-sohn-hipocampus.md).

The [Zep](projects/zep.md) paper makes the same point from a different angle: on LongMemEval's 115K-token conversations (which fit in modern context windows), Zep's graph-based retrieval achieves 71.2% accuracy versus 60.2% for full-conversation baselines with gpt-4o, while reducing latency by 90% [Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md). Bigger windows do not help when the attention mechanism loses important details buried in the middle of long sequences. The replacement assumption: structured memory with proactive awareness beats large context with passive attention.

## Deprecated Approaches

**Single-agent loops with self-evaluation.** The original AutoGPT pattern had one agent plan, execute, evaluate its own output, and decide whether to continue. This seemed right because it mirrored how a human developer works. The evidence that killed it: chronic looping behavior where agents re-attempted failed approaches without progress, no external check on evaluation quality, and the inability to distinguish genuine progress from self-congratulation. Every serious system now separates evaluation from execution, whether through holdout sets (meta-agent), multi-agent review (Autocontext's Analyst-Coach-Curator pipeline), or external graders (CORAL).

**Compressed summaries as optimization feedback.** Early prompt optimization systems (and some current ones) fed LLM-generated summaries of execution results back to the optimizer. Meta-Harness's ablation demolished this approach: full trace access yields 50.0 median accuracy versus 34.9 with summaries, a +15.1 point gap. The summaries lose the causal signal needed for systematic improvement. The Meta-Harness proposer demonstrated sophisticated causal reasoning when given full traces (identifying that "prior attempts regressed because they modified the completion flow") that compressed summaries cannot support [Source](../raw/deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md). The replacement: give optimizers access to raw execution data, even if it means processing ~10 million tokens per iteration.

**Flat skill registries without governance.** Early skill sharing assumed more skills meant better agents. The agent skills survey found that 26.1% of community-contributed skills contain vulnerabilities, with 5.2% exhibiting high-severity patterns suggesting malicious intent. A single industrialized actor was responsible for 54.1% of confirmed malicious cases among 157 confirmed malicious skills [Source](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md). Beyond security, flat registries hit a phase transition: past a critical library size, skill selection accuracy collapses. The replacement: hierarchical skill organization with trust tiers, verification gates, and progressive capability grants.

## Failure Modes

**Path dependence in self-improvement.** SICA documents that "poor quality initial feature suggestions often lower the quality of subsequent feature suggestions," creating divergent trajectories from the same starting point [Source](../raw/deep/repos/maximerobeyns-self-improving-coding-agent.md). Autocontext's Coach can encode a misdiagnosis from the Analyst into the playbook, which then persists through the Curator if it seems plausible [Source](../raw/deep/repos/greyhaven-ai-autocontext.md). No current system provides a reliable mechanism for global restart or trajectory correction once optimization has committed to a suboptimal direction.

**Context window exhaustion during autonomous loops.** Pi-autoresearch tracks token consumption per iteration and proactively aborts when the next iteration would exceed context limits, triggering auto-resume in a fresh session. But information loss on context reset is inherent: the agent loses its in-memory reasoning about what approaches have been tried. The `autoresearch.md` file bridges context boundaries, but its quality determines whether the fresh agent repeats failed approaches [Source](../raw/deep/repos/davebcn87-pi-autoresearch.md). The auto-resume rate limit (once per 5 minutes, 20-turn cap) means rapid context exhaustion can stall the loop until a human intervenes.

**Knowledge pollution in persistent memory.** Autocontext's playbook accumulates contradictory lessons over many generations. The Curator's consolidation and lesson cap (`AUTOCONTEXT_SKILL_MAX_LESSONS`) mitigate this but use FIFO rather than quality-based pruning [Source](../raw/deep/repos/greyhaven-ai-autocontext.md). Hipocampus has no contradiction detection: if a user changes their mind about a technical decision, both old and new decisions can coexist in different compaction nodes [Source](../raw/deep/repos/kevin-hs-sohn-hipocampus.md). Acontext has no automatic skill pruning: entries accumulate without mechanism for removing superseded learnings [Source](../raw/deep/repos/memodb-io-acontext.md).

**Evaluation bottleneck in multi-agent systems.** CORAL requires a full grader execution for every eval. For expensive graders (ML training, complex simulations), this limits iteration speed. Agents cannot get partial feedback [Source](../raw/deep/repos/human-agent-society-coral.md). Meta-Harness processes ~10 million tokens per iteration, making each optimization step expensive even though it converges faster than alternatives [Source](../raw/deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md).

**Skill triggering failures at scale.** Everything Claude Code's 156 skills create inevitable overlap: `security-review` and `security-scan` may conflict or duplicate guidance. The project's own working context flags "overlapping skills, hooks, or agents should be consolidated when overlap is material" [Source](../raw/deep/repos/affaan-m-everything-claude-code.md). There is no formal skill dependency graph, so `springboot-tdd` might assume `springboot-patterns` is installed with no mechanism to verify this.

## Selection Guide

- **If you need a production agent memory layer with temporal reasoning**, use [Graphiti](projects/graphiti.md) (24,473 stars) because its bi-temporal edge model tracks how facts change over time with 18.5% accuracy improvement on LongMemEval. Requires Neo4j or FalkorDB infrastructure.
- **If you need zero-infrastructure agent memory that a human can inspect**, use Hipocampus (145 stars) because its file-based compaction tree achieves 21x improvement on implicit recall with no database required. Maturity is low; evaluate for production stability.
- **If you need to improve an agent's harness from production traces without labeled data**, use [meta-agent](concepts/meta-agent.md) because its LLM-judge-based search reached 87% holdout on Tau-bench. Currently supports Claude Agent SDK only.
- **If you need to structure an AI coding workflow with specialist roles**, use gstack (63,766 stars) because its sprint DAG enforces Think-Plan-Build-Review-Test-Ship sequencing with parallel specialist subagents. Single-user design; does not scale to teams without additional infrastructure.
- **If you need a reference catalog of agent skills for Claude Code**, use Everything Claude Code (136,116 stars) because it covers 12 language ecosystems with selective install profiles. Extract individual patterns rather than installing the full framework.
- **If you need agents to learn reusable skills from execution traces**, use Acontext (3,300 stars) because its three-stage pipeline produces debuggable markdown skill files rather than opaque embeddings. Requires PostgreSQL, Redis, and RabbitMQ for self-hosting.
- **If you need multi-agent parallel optimization against a scoring function**, use CORAL (120 stars) because its git-worktree isolation with shared state enables agents to explore independently while building on each other's discoveries. Very new; evaluate the 120-star signal.
- **If you need a multi-agent SOP-based pipeline with subscription routing**, avoid building custom orchestration. Use [MetaGPT](projects/metagpt.md) (66,769 stars) because its `_watch()` mechanism lets you add roles by defining subscriptions, not rewriting coordinators.
- **If you need autonomous benchmark-driven code optimization**, use [pi-autoresearch](projects/pi.md) (3,393 stars) because its try/measure/keep/revert loop with statistical confidence scoring works for any command + metric + direction triple.

## The Divergence

### Static skills vs. runtime-learned skills

Static skills ([Anthropic](projects/anthropic.md)'s SKILL.md, gstack, Everything Claude Code) are human-authored, version-controlled, inspectable, and portable. Runtime-learned skills (SAGE, SEAgent, Acontext's learning pipeline) are automatic but either opaque (model weights) or expensive to produce (multi-stage LLM pipelines). Static skills optimize for auditability and team collaboration. Learned skills optimize for adaptation to novel domains.

The agent skills survey identifies the bridge as the field's most important open problem: systems that can learn skills AND externalize them as auditable SKILL.md-like artifacts [Source](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md). Acontext's three-stage pipeline is the closest working implementation, but its LLM cost per learned skill (30-55 calls) makes it expensive for high-volume applications [Source](../raw/deep/repos/memodb-io-acontext.md).

### Harness optimization vs. scaffold self-modification

Meta-Harness and meta-agent optimize the code around the agent (prompts, retrieval logic, tools, hooks) while keeping the agent's own source code stable. SICA modifies the agent's actual Python code. The harness approach is safer (bad changes are easily rolled back) and cheaper per iteration. The self-modification approach is higher-leverage (the agent can restructure its own architecture) but exhibits path dependence and high variance across runs.

Autocontext sits between these camps: it modifies knowledge artifacts (playbooks, hints, tools, strategies) rather than source code, achieving more leverage than prompt optimization without the risks of code self-modification [Source](../raw/deep/repos/greyhaven-ai-autocontext.md).

### Derivation vs. templating for knowledge systems

Ars Contexta (2,900 stars) derives knowledge system architectures from a graph of 249 interconnected research claims, producing bespoke folder structures, context files, and processing pipelines tailored to each user's domain. The derivation engine maps conversation signals to eight configuration dimensions and justifies each choice by tracing to specific research claims [Source](../raw/deep/repos/agenticnotetaking-arscontexta.md). Most other systems (napkin, Hipocampus, standard CLAUDE.md files) use fixed templates that users customize.

Derivation produces better-fitted systems but costs ~20 minutes of setup and significant tokens. Templates are instant but force users into the template author's assumptions. The question is whether the 20-minute investment amortizes, and the answer depends on how long the agent will operate in that domain.

### Graph-based memory vs. file-based memory

[Graphiti](projects/graphiti.md) represents knowledge as entity-relationship triples in a graph database with bi-temporal indexing, enabling queries like "what relationships changed between January and March?" Napkin (264 stars) demonstrates that BM25 search on markdown files matches or exceeds RAG systems on LongMemEval while requiring zero infrastructure [Source](../raw/repos/michaelliv-napkin.md). Graphify (7,021 stars) splits the difference: it builds a knowledge graph from heterogeneous sources but stores results as local files with 71.5x token reduction per query [Source](../raw/repos/safishamsi-graphify.md).

**Source conflict:** Napkin's LongMemEval results (92.0% on Oracle, 91.0% on S set) are self-reported from the project's README [Source](../raw/repos/michaelliv-napkin.md), while Graphiti/Zep's LongMemEval results are published in a peer-reviewed paper [Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md). The benchmarks test different conversation scales (napkin: up to ~500 sessions; Zep: 115K tokens) and different question types. Direct comparison requires careful methodology alignment.

## What's Hot Now

[Anthropic](projects/anthropic.md)'s skills repository hit 110,064 stars, making it one of the highest-starred repositories in the AI tools space. The Agent Skills specification at agentskills.io has become the de facto standard for capability packaging across multiple agent platforms.

meta-agent launched in early April 2026 with the key claim that unlabeled production traces plus LLM judges can replace expensive labeled datasets for harness optimization. The project currently supports Claude Agent SDK with plans to add Codex SDK and OpenCode SDK [Source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md).

CORAL published its paper ("CORAL: Towards Autonomous Multi-Agent Evolution for Open-Ended Discovery," arXiv:2604.01658) in April 2026, positioning multi-agent self-evolution as an infrastructure problem rather than an algorithm problem [Source](../raw/repos/human-agent-society-coral.md).

The "harness engineering" framing has gained traction since Meta-Harness demonstrated 6x performance gaps from harness changes alone. The TerminalBench-2 benchmark has become the standard evaluation for harness quality, with Meta-Harness ranking #2 among all Opus 4.6 agents and #1 among all Haiku 4.5 agents [Source](../raw/deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md).

Everything Claude Code's growth to 136K stars, driven by an X thread with 900K+ views, demonstrates that practitioners are hungry for reference architectures even if adoption patterns are uncertain. The gap between starring and daily-driving remains a real signal to watch [Source](../raw/deep/repos/affaan-m-everything-claude-code.md).

## Open Questions

**Can harness optimization and model fine-tuning co-evolve?** Meta-Harness explicitly identifies co-evolution (letting the harness shape what the model learns, and vice versa) as unexplored future work. SICA's scaffold-level modifications cannot overcome the base model's reasoning ceiling, as demonstrated by flat performance on AIME and GPQA [Source](../raw/deep/repos/maximerobeyns-self-improving-coding-agent.md). No system bridges the gap.

**Where is the phase transition in skill library size?** The agent skills survey identifies a critical library size past which skill selection accuracy degrades sharply, but no one has published the curve or identified the threshold for specific agent platforms [Source](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md). Practitioners building large skill registries are flying blind.

**Can credit assignment scale in multi-agent systems?** Autocontext implements component sensitivity profiling to attribute score improvements to specific changes, but acknowledges it correlates rather than establishes causation [Source](../raw/deep/repos/greyhaven-ai-autocontext.md). When multiple agents modify playbooks, tools, hints, and strategies simultaneously, isolating which change drove improvement remains unsolved.

**How should agents handle contradictory memories over time?** Graphiti's bi-temporal model invalidates contradicted edges rather than deleting them, always prioritizing newer information [Source](../raw/deep/repos/getzep-graphiti.md). But in domains where older information may be more authoritative (medical records, legal documents), this heuristic fails. No system implements confidence-weighted or source-authority-weighted contradiction resolution.

**Is the autonomous improvement loop stable over hundreds of iterations?** SICA ran 14 iterations. Meta-agent ran 4-10 iterations. Autocontext's longest reported runs are in the tens of generations. No one has published results from hundreds of iterations, and the knowledge pollution, path dependence, and evaluation bottleneck problems all worsen with scale.
