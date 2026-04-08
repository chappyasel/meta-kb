---
title: The State of Agent Architecture
type: synthesis
bucket: agent-architecture
abstract: >-
  The harness around an LLM agent now matters more than the model inside it:
  optimizing prompts, hooks, skills, and memory routing produces larger
  performance gains than model upgrades, and the field has converged on this
  insight faster than anyone anticipated.
source_date_range: 2025-01-20 to 2026-04-08
newest_source: '2026-04-08'
staleness_risk: low
sources:
  - articles/x-twitter-meta-agent-continual-learning-for-agents.md
  - deep/repos/anthropics-skills.md
  - tweets/dimitrispapail-memento-teaching-llms-to-manage-their-own-context.md
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
  - sqlalchemy
  - pydantic
  - openviking
  - gstack
  - sage
  - webshop
  - perplexity
  - qwen
  - jack-dorsey
  - jaya-gupta
  - udit-goenka
  - garry-tan
  - tobi-lutke
  - sqlite
  - postgresql
  - redis
  - langsmith
  - gpt-4o
  - chatgpt
  - groq
  - llama-cpp
  - block
  - agent0
  - webshop-bench
  - qwq-32b
  - ai-frontiers
  - qwen2-5-7b
  - qwen3-8b
  - qwen3-32b
  - phi-4-reasoning
  - olmo3-7b-think
  - dynamic-programming
  - shivam-garg
  - lingjiao-chen
  - hao-tang
  - ziyan-wang
  - ahmed-awadallah
  - eric-horvitz
  - aime26
  - gpqa-d
  - lcb
last_compiled: '2026-04-08T22:47:51.438Z'
---
# The State of Agent Architecture

[Anthropic](projects/anthropic.md) built a skills system with 110,064 GitHub stars and a simple specification: a folder with a SKILL.md file containing YAML frontmatter. Everything Claude Code took that specification and scaled it to 156 skills across 12 language ecosystems. Within months, the maintainers discovered that the hard problem was no longer writing individual skills but governing them: detecting conflicts between overlapping skills, managing install profiles, controlling hook execution at runtime, and preventing documentation drift. The obvious approach, "add more skills," created problems that only governance solved.

## Approach Categories

### How should agents structure their cognitive scaffolding?

Two camps have formed around what practitioners call "agent harness engineering," the code surrounding a fixed LLM that determines what information the model receives.

Meta-Harness demonstrated that harness changes alone produce up to 6x performance gaps on the same benchmark with the same model. The system gives a coding agent (Claude Code with Opus-4.6) filesystem access to all prior candidates' source code, execution traces, and scores, then iterates. On text classification, it achieved +7.7 points over ACE while using 4x fewer context tokens. The critical ablation: full execution trace access scored 50.0 median accuracy versus 34.6 with scores alone and 34.9 with scores plus summaries. Compressed feedback destroys the causal signal needed for systematic improvement. [Source](deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md)

meta-agent (120 stars, emerging) automates this optimization on unlabeled production traces. It points an LLM judge at a stream of agent executions, scores them, proposes targeted harness updates (prompts, hooks, tools, subagents), and keeps updates only if they improve holdout accuracy. On [Tau-bench](projects/tau-bench.md) v3 airline, holdout accuracy went from 67% to 87%. The LLM-judge-based search actually outperformed labeled-search (80%) in their setup because natural-language error descriptions like "the agent refunded without checking the cancellation policy" provide richer optimization signal than binary supervision. [Source](articles/x-twitter-meta-agent-continual-learning-for-agents.md)

SICA (299 stars) takes the most radical approach: the coding agent modifies its own Python source code, tools, reasoning structures, and sub-agents inside a Docker sandbox, evaluates the modified version against benchmarks, and selects the best-performing ancestor via confidence-interval-aware selection. SWE-Bench Verified accuracy went from 17% to 53% across 14 iterations. The selection function balances performance (weight 0.5), cost efficiency (0.25), and execution time (0.25) to prevent regression from lucky variance. Path dependence is the dominant failure mode: a bad early modification steers the entire trajectory. [Source](deep/repos/maximerobeyns-self-improving-coding-agent.md)

**Wins when:** You have a measurable metric and can afford iteration cost. **Loses when:** Your evaluation signal is noisy or you lack a reliable holdout set.

**Specific failure mode:** The meta-agent proposer tends to overfit to specific traces rather than writing general behavioral rules. Early iterations fix the exact failures the proposer observed, improving search accuracy while hurting holdout. The mitigation: instruct the proposer to "state your change as a rule about agent behavior. If you can only justify it by pointing to specific traces, it's too narrow." [Source](articles/x-twitter-meta-agent-continual-learning-for-agents.md)

### How should agents organize domain knowledge for dynamic loading?

The [SKILL.md specification](concepts/agent-skills.md) from [Anthropic's skills repo](projects/anthropic.md) (110,064 stars) established a three-tier [progressive disclosure](concepts/progressive-disclosure.md) architecture. Level 1: metadata (name + description, ~100 tokens, always in context). Level 2: instructions (full SKILL.md body, loaded on trigger). Level 3: bundled resources (scripts, reference docs, loaded on demand). This solves the tension between rich skill knowledge and finite context windows. The claude-api skill demonstrates how 20+ reference files across 8 languages load only the relevant language's docs when triggered. [Source](deep/repos/anthropics-skills.md)

[gstack](projects/gstack.md) (63,766 stars) innovates beyond individual skills with the sprint-as-DAG pattern: 23 specialist roles compose into a Think-Plan-Build-Review-Test-Ship-Reflect pipeline where each skill's output feeds the next skill's context. A SKILL.md.tmpl template system generates documentation from source code metadata, preventing documentation drift. The `/review` command dispatches 7 parallel specialist subagents (testing, maintainability, security, performance, data-migration, API contract, red team), merges findings, and deduplicates via fingerprint matching. Creator Garry Tan reports averaging 10,000 lines of code and 100 pull requests per week over a 50-day period. [Source](deep/repos/garrytan-gstack.md)

Everything Claude Code (136,116 stars) tackles scale governance with manifest-driven selective install (`./install.sh --profile developer typescript`), hook runtime controls via environment variables (`ECC_HOOK_PROFILE=minimal|standard|strict`), and a continuous learning system where an Observer Agent runs every 5 minutes analyzing tool-call observations, detecting patterns, and converting them into atomic "instincts" with confidence scores that decay over time. [Source](deep/repos/affaan-m-everything-claude-code.md)

**Wins when:** You need composable, auditable capabilities across many domains. **Loses when:** Your skill library exceeds the phase-transition threshold where routing accuracy collapses. The [agent skills survey](papers/xu-agent-skills-for-large-language-models-architectu.md) documents this phase transition: beyond a critical library size, the agent's ability to select the right skill degrades sharply.

**Specific failure mode:** Undertriggering. The skill-creator meta-skill explicitly warns that Claude tends not to invoke skills when they would be useful. Aggressive description writing helps, but overly broad descriptions trigger inappropriately. [Source](deep/repos/anthropics-skills.md)

### How should agents remember across sessions?

Three architecturally distinct approaches compete.

[Graphiti](projects/graphiti.md) (24,473 stars) by [Zep](projects/zep.md) builds temporal context graphs where edges carry `valid_at` and `invalid_at` timestamps. A multi-stage LLM pipeline (extract entities, extract edges, deduplicate nodes, resolve contradictions) with Pydantic structured output produces a genuine bi-temporal [knowledge graph](concepts/knowledge-graph.md). On the LongMemEval benchmark, [Zep](projects/zep.md) achieved +18.5% accuracy improvement with 90% latency reduction compared to full-context baselines. The temporal edge invalidation drove +38.4% on temporal reasoning tasks specifically. 4-5 LLM calls per episode ingestion makes this expensive. [Source](deep/repos/getzep-graphiti.md)

Hipocampus (145 stars) takes the opposite infrastructure approach: zero database, zero server, zero embeddings. A compaction tree (Raw → Daily → Weekly → Monthly → Root) compresses months of conversation into a ~3K token ROOT.md topic index that loads into every session. On the MemAware benchmark (900 implicit context questions), Hipocampus + Vector scored 17.3% versus 0.8% for no memory and 3.4% for vector search alone, a 5.1x improvement over search. On hard questions (cross-domain, zero keyword overlap), it scored 8.0% versus 0.7% for vector search, an 11.4x improvement. The insight: you cannot search for what you do not know you know. [Source](deep/repos/kevin-hs-sohn-hipocampus.md)

Acontext (3,300 stars) implements a three-stage learning pipeline: Task Extraction (identifies user requests from message streams), Distillation (LLM-as-judge classifies completed tasks into SOPs, failure warnings, or factual content), and Skill Learner (writes structured markdown skill files). Skills are human-readable, editable, and portable. Progressive disclosure replaces embedding search: agents navigate skills via `list_skills` → `get_skill` → `get_skill_file` tool calls. [Source](deep/repos/memodb-io-acontext.md)

**Wins when (Graphiti):** You need temporal reasoning, cross-session entity tracking, and enterprise-grade retrieval. **Loses when:** You cannot afford 4-5 LLM calls per data ingestion event.

**Wins when (Hipocampus):** You need proactive context surfacing with zero infrastructure. **Loses when:** The cross-domain reasoning ceiling (8.0% on hard questions) limits utility for complex knowledge synthesis.

**Specific failure mode:** Graphiti's single-session-assistant tasks showed a 17.7% performance *decrease*. The knowledge graph extraction loses assistant-side reasoning chains and meta-commentary that existed in the full conversation. [Source](deep/repos/getzep-graphiti.md)

### How should agents learn to compress their own reasoning?

[Memento](projects/memento.md) teaches LLMs to segment their own chain-of-thought into blocks, compress each into a dense summary, and mask the original block from attention, all within a single generation call. Peak KV cache drops 2-3x, throughput nearly doubles. The training requires ~30K examples with a three-stage curriculum: standard causal attention first (learn the format), then block masking (learn to compress under constraint). A critical finding: erased blocks do not fully disappear. Their information persists in the KV cache representations of memento tokens that attended to the block during generation. Restart mode (recomputing KV from scratch) drops AIME'24 from 66.1% to 50.8%, a 15 percentage point loss proving this implicit information channel matters. [Source](tweets/dimitrispapail-memento-teaching-llms-to-manage-their-own-context.md)

**Wins when:** You run long chain-of-thought inference at scale where KV cache is the bottleneck. **Loses when:** You need the simplicity of context restart approaches.

**Specific failure mode:** Training data mismatch. The models train on OpenThoughts traces generated by QwQ-32B, a different model. SFT on another model's reasoning traces costs accuracy even before compression. The gap is closable: majority voting at k=3 matches the original baseline.

### How should multiple agents coordinate on shared problems?

[CORAL](projects/coral.md) (120 stars) spawns autonomous coding agents in isolated git worktrees with a shared `.coral/public/` state directory (attempts, notes, skills) symlinked into each worktree. The filesystem is the message bus: when Agent-1 writes to `.claude/notes/finding.md`, Agent-2 sees it immediately through the symlink. A heartbeat system with plateau detection interrupts stalled agents with reflection prompts. [Source](deep/repos/human-agent-society-coral.md)

Autocontext (695 stars) deploys five specialized agents per generation: Competitor (proposes strategies), Analyst (diagnoses failures), Coach (updates playbooks), Architect (proposes tooling changes), and Curator (quality-gates what knowledge persists). Each agent has a narrow responsibility. The separation creates cleaner feedback signals: the analyst does not pollute its diagnosis with solution proposals. The tradeoff is ~5x LLM calls per generation. [Source](deep/repos/greyhaven-ai-autocontext.md)

**Wins when (CORAL):** You have an optimization problem with a clear grading function and want parallel exploration. **Loses when:** Multiple agents converge on the same approach despite pivot mechanisms.

**Specific failure mode (Autocontext):** Backpressure oscillation. The trend gate's plateau relaxation can cause cycles: relax threshold → accept marginal improvement → tighten threshold → reject similar improvements → plateau detected → relax again. This wastes generations without genuine progress. [Source](deep/repos/greyhaven-ai-autocontext.md)

## The Convergence

**Claim 1: All serious systems now treat execution traces as first-class optimization input.** Meta-Harness showed that full trace access scores 15.4 points higher than compressed summaries. meta-agent reads production traces to propose harness updates. SICA reads benchmark traces to propose self-modifications. Autocontext reads per-task traces to update playbooks. [CORAL](projects/coral.md) records every eval as a JSON attempt with commit hash, score, and feedback. The holdout against this consensus was text-level prompt optimizers (GEPA, OpenEvolve, TTT-Discover), which operate on 0.002-0.026 million tokens per iteration versus Meta-Harness's ~10 million. Meta-Harness matches their final performance within 4 evaluations. [Source](deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md)

**Claim 2: All production skill systems now enforce progressive disclosure with at most three tiers.** Anthropic's spec codifies this: metadata (~100 tokens, always loaded), instructions (<5000 tokens, loaded on activation), resources (loaded on demand). [gstack](projects/gstack.md) follows the same pattern with SKILL.md templates. Hipocampus implements three memory tiers (Hot/Warm/Cold). Acontext uses `list_skills` → `get_skill` → `get_skill_file` as its disclosure cascade. Ars Contexta derives its three-space architecture (self/notes/ops) from 249 interconnected research claims. The project that held out longest was Everything Claude Code, which initially loaded all installed rules into context. Its v1.8.0 release added hook runtime controls and selective install profiles to manage context budget. [Source](deep/repos/affaan-m-everything-claude-code.md)

**Claim 3: All self-improving systems now separate the improvement mechanism from the target being improved.** meta-agent separates the proposer (Opus 4.6) from the agent being optimized (Haiku 4.5). Meta-Harness uses Claude Code with Opus-4.6 to discover harnesses for any deployment model. SICA's review committee provides governance over self-modifications. Autocontext's five-agent architecture splits diagnosis (Analyst) from knowledge synthesis (Coach) from quality gating (Curator). The longest holdout was the unified meta-agent/target-agent design in early SICA iterations, where the improving agent was limited by its own capabilities. The system evolved to include a mandatory review committee that the agent must consult before implementing changes. [Source](deep/repos/maximerobeyns-self-improving-coding-agent.md)

## What the Field Got Wrong

Practitioners assumed that longer context windows would solve the memory problem. The reasoning: if you can fit 1 million tokens in context, you do not need sophisticated retrieval. Hipocampus tested this assumption directly. BM25 + Vector search on full conversation history scored 3.4% on implicit context recall. Hipocampus's compaction tree with a 3K-token topic index scored 17.3%. The 5.1x improvement comes from a structural difference: search requires a query, and a query requires suspecting that relevant context exists. When the user asks "refactor this API endpoint for the new payment flow," no search query connects this to a rate-limiting decision made three weeks ago. The compaction tree makes the connection visible because the agent already sees all topics at zero cost. [Source](deep/repos/kevin-hs-sohn-hipocampus.md)

The Zep paper found a related result in a different context. On LongMemEval with gpt-4o, full-context baseline scored 60.2% while Zep's knowledge graph scored 71.2%, an 18.5% improvement despite using less than 2% of the baseline's tokens. The full conversation (115k tokens) actively *hurt* performance compared to structured retrieval (1.6k tokens). Attention degradation over long contexts produces worse results than targeted extraction. [Source](deep/repos/getzep-graphiti.md)

The assumption that "more context is better" was held by practitioners building on [GPT-4](projects/gpt-4.md)'s expanding context windows. Structured memory retrieval, whether through knowledge graphs, compaction trees, or progressive disclosure, now outperforms context stuffing on both accuracy and latency.

## Deprecated Approaches

**Single-pass skill loading.** Pre-2025, practitioners loaded all agent capabilities into the system prompt at session start. This seemed right because context windows were growing and loading everything ensured no capability was missed. The evidence that killed it: Everything Claude Code discovered that 156 skills across 12 language ecosystems consumed unmanageable context budget when loaded simultaneously. The replacement: progressive disclosure with description-driven triggering, where only metadata is always-loaded and full instructions activate on demand. The [agent skills survey](papers/xu-agent-skills-for-large-language-models-architectu.md) formalized this as the three-tier architecture now adopted across the field.

**Summary-based feedback for self-improvement loops.** Systems like early prompt optimizers compressed execution traces into summaries before feeding them to improvement mechanisms. This seemed right because summaries save tokens. Meta-Harness's ablation killed it: summaries add only +0.3 accuracy over bare scores, while full trace access adds +15.4. The reason: compressed summaries lose the causal signal. A proposer that sees "the agent failed on task 23" cannot form causal hypotheses. A proposer that sees the exact prompts, retrieval results, and decision points can reason about *why* it failed. The replacement: full execution trace access with ~10 million tokens per iteration. [Source](deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md)

**Flat skill registries without governance.** Early skill ecosystems treated skill authoring as a purely creative act: write a SKILL.md, drop it in the skills directory. The [agent skills survey](papers/xu-agent-skills-for-large-language-models-architectu.md) analyzed 42,447 community skills and found 26.1% contain at least one vulnerability. 5.2% exhibit high-severity patterns suggesting malicious intent. Skills with executable scripts are 2.12x more vulnerable than instruction-only skills. A single industrialized actor was responsible for 54.1% of confirmed malicious cases. The replacement: tiered trust models with verification gates (static analysis, semantic classification) before skills can load. The survey proposes a four-tier governance framework mapping skill provenance to graduated deployment capabilities.

## Failure Modes

**Context budget exhaustion under skill composition.** When multiple skills load simultaneously, their combined context consumption can exceed the effective working budget. A TypeScript + Python + Go project using Everything Claude Code loads rules for all three languages. Each MCP tool definition consumes 2-5K tokens. With 10 MCPs and 3 language rule sets, you lose ~80K of a 200K context window before the agent starts working. No current system implements skill-level token budgeting or priority-based unloading. [Source](deep/repos/affaan-m-everything-claude-code.md)

**Path dependence in self-improvement loops.** SICA's authors document this explicitly: "poor quality initial feature suggestions (e.g. fixating on caching open files) often lower the quality of subsequent feature suggestions." A bad early modification steers the entire improvement trajectory. Different runs from the same starting point produce very different outcomes. meta-agent shows the same pattern: early harness updates that overfit to specific traces can lock the optimization into a local minimum. No current system implements principled exploration strategies that guarantee coverage of the solution space. [Source](deep/repos/maximerobeyns-self-improving-coding-agent.md)

**Knowledge pollution in persistent memory.** Autocontext's five-agent architecture includes a Curator specifically to prevent bad lessons from accumulating. Without this gate, the Analyst might misdiagnose a failure, the Coach encodes a bad lesson in the playbook, and the lesson persists through future generations. CORAL's notes system has no pruning mechanism. Hipocampus's compaction tree has no contradiction detection. In all systems, stale or incorrect knowledge degrades future performance silently. [Source](deep/repos/greyhaven-ai-autocontext.md)

**Triggering failures in description-driven skill activation.** Anthropic's skill system triggers skills based solely on the LLM's semantic interpretation of the description field. Complex triggering conditions (the claude-api skill's language detection logic) must be re-implemented inside the SKILL.md body after triggering, not at the trigger layer. There are no programmatic triggers, no file-pattern matchers, no project-type detectors. A skill with a narrow description goes unused; a skill with a broad description triggers inappropriately. [Source](deep/repos/anthropics-skills.md)

**LLM judge reliability in automated improvement loops.** meta-agent and Autocontext both rely on LLM judges to score unlabeled traces. The LLM judge's 4-tier fallback parser in Autocontext can still produce parse failures. Novel failure modes go undetected. Judge inconsistency introduces noise into the score trajectory, and backpressure gates that rely on noisy scores produce oscillating accept/reject decisions. The meta-agent authors note these are "single-run results on a small benchmark split" and plan variance estimates. [Source](articles/x-twitter-meta-agent-continual-learning-for-agents.md)

## Selection Guide

- **If you need a process layer for a solo developer shipping product**, use [gstack](projects/gstack.md) (63,766 stars) because its 23-role sprint pipeline has concrete evidence of 10K+ LOC/week throughput. Avoid Everything Claude Code at full install because the 156-skill governance overhead exceeds solo needs.

- **If you need persistent temporal memory with entity tracking**, use [Graphiti](projects/graphiti.md) (24,473 stars) / [Zep](projects/zep.md) because the bi-temporal data model and +18.5% LongMemEval improvement are peer-reviewed. Requires Neo4j or FalkorDB infrastructure.

- **If you need proactive memory with zero infrastructure**, use Hipocampus (145 stars) because the 21x improvement over no-memory on MemAware validates the compaction tree approach. Accept the 8% ceiling on hard cross-domain questions.

- **If you need agents to learn from production without labels**, evaluate meta-agent because it improved tau-bench holdout from 67% to 87% using LLM judges on unlabeled traces. Currently supports Claude Agent SDK only.

- **If you need parallel agent optimization with a grading function**, use [CORAL](projects/coral.md) (120 stars) because git-worktree isolation and symlinked shared state create clean multi-agent coordination. Requires a deterministic scoring function.

- **If you need self-modifying agents for research**, evaluate SICA (299 stars) because the 17% → 53% SWE-Bench improvement demonstrates scaffold-level self-improvement is measurable. Accept high variance between runs and substantial compute cost.

- **If you need a knowledge graph from heterogeneous sources with no server**, use Graphify (7,021 stars) because it achieves 71.5x token reduction on mixed code/docs/papers corpora using NetworkX + tree-sitter locally. Does not handle temporal reasoning.

- **If you need a derived, domain-specific knowledge system**, evaluate Ars Contexta (2,900 stars) because its derivation engine composes cognitive architectures from 249 research claims rather than stamping out templates. Requires ~20 minutes and significant tokens for setup.

## The Divergence

### Execution trace storage: full traces vs. compressed state

Meta-Harness stores full execution traces (~10M tokens per evaluation) and gives the proposer filesystem access to everything. meta-agent stores per-task traces with LLM-generated critiques. pi-autoresearch (3,393 stars) stores append-only JSONL with metric values and ASI (Actionable Side Information) per experiment but discards code changes on revert, keeping only the description. Meta-Harness optimizes for causal reasoning quality; pi-autoresearch optimizes for iteration speed and low storage overhead. Full traces win when the improvement mechanism needs to diagnose *why* something failed. Compressed state wins when iteration count matters more than per-iteration quality, such as Shopify's 120 experiments on Liquid achieving 53% speedup. [Source](deep/repos/davebcn87-pi-autoresearch.md)

### Memory representation: knowledge graphs vs. compaction trees vs. skill files

[Graphiti](projects/graphiti.md) represents knowledge as entity-relationship triples with temporal validity windows. Hipocampus represents knowledge as hierarchically compressed markdown. Acontext represents knowledge as structured skill files (SOPs, warnings, facts). Graphs win on temporal reasoning (+38.4% improvement) and cross-session entity tracking. Compaction trees win on proactive recall (21x over no memory) with zero infrastructure. Skill files win on editability, portability, and framework independence. No system combines all three strengths, and attempts to merge approaches (e.g., Graphiti's MCP server feeding skills) remain nascent.

### Self-improvement target: harness vs. knowledge vs. source code

meta-agent and Meta-Harness modify the harness (prompts, hooks, tools) around a fixed model. Autocontext modifies knowledge artifacts (playbooks, hints, skills). SICA modifies the agent's own Python source code. Harness modification is lowest-risk and most reversible. Knowledge modification accumulates institutional learning. Source code modification has the highest ceiling (3x SWE-Bench improvement) but the highest variance and cost. The field has not established when each approach is appropriate, and no system combines all three.

### Single specialist vs. multi-agent review

[gstack](projects/gstack.md) dispatches 7 parallel specialist subagents for code review, merging and deduplicating findings. [MetaGPT](projects/metagpt.md) (66,769 stars) encodes organizational SOPs as message-routing topology where each agent role subscribes to specific upstream action types. Both bet on specialist diversity as a quality signal. The counter-argument, held by practitioners using [Claude Code](projects/claude-code.md) with a well-tuned [CLAUDE.md](concepts/claude-md.md), is that a single capable model with good context produces comparable results at 5-7x lower cost. The evidence is mixed: gstack reports concrete productivity gains, but the single-user design and self-reported metrics make controlled comparison difficult.

## What's Hot Now

[Anthropic's skills repo](projects/anthropic.md) crossed 110,064 stars, making it the largest agent skills registry by adoption. The skill-creator meta-skill that teaches Claude to create, evaluate, and iterate on other skills via an eval-driven development loop represents the field's direction: skills that create skills. [Source](deep/repos/anthropics-skills.md)

[Memento](projects/memento.md) released OpenMementos (228K annotated reasoning traces), a full data generation pipeline, and a vLLM fork with native block masking. The finding that erased reasoning blocks leave exploitable traces in KV cache representations opens a new research direction in learned context management. [Source](tweets/dimitrispapail-memento-teaching-llms-to-manage-their-own-context.md)

pi-autoresearch (3,393 stars) demonstrated the autoresearch pattern beyond ML: Shopify CEO [Tobi Lütke](concepts/tobi-lutke.md) ran it against Shopify's 20-year-old Liquid template engine, achieving 53% parse+render speedup across ~120 automated experiments with zero test regressions. The ecosystem now includes 13+ implementations across different agent platforms. [Source](deep/repos/davebcn87-pi-autoresearch.md)

meta-agent's release alongside a paper showing judge-based search outperforming labeled search (87% vs 80% holdout on tau-bench) signals a shift toward continuous production improvement without labeled data requirements. [Source](articles/x-twitter-meta-agent-continual-learning-for-agents.md)

## Open Questions

**Can context management become a trainable skill?** Memento shows models can learn to segment, compress, and mask their own reasoning through standard SFT on ~30K examples. The authors argue this extends to agent settings where each action-observation cycle forms a natural block. No one has validated this claim in multi-turn agent benchmarks.

**Where is the phase transition in skill library size?** The [agent skills survey](papers/xu-agent-skills-for-large-language-models-architectu.md) documents that skill selection accuracy degrades sharply beyond a critical library size, but no one has measured where this threshold lies for different routing architectures. Hierarchical skill organization, meta-skill routing, and skill embedding spaces are proposed mitigations with no validated results.

**Can scaffold-level and weight-level self-improvement compose?** SICA modifies scaffold code but cannot improve the LLM's reasoning capabilities. Performance on AIME and GPQA barely improved because those tasks test model intelligence, which scaffold changes cannot enhance. The SICA authors identify "more integrated co-training between agent logic and model behavior" as future work. Memento's demonstration that context management can be trained into weights suggests a path, but no system combines both approaches.

**How should multi-agent teams share memory across machines?** CORAL's filesystem-based coordination works on a single machine. Autocontext's SQLite-backed knowledge persists locally. An Epsilla analysis identifies "agent drift" as gstack's scaling limitation: agents on different machines operate in silos. No open-source system solves distributed agent memory with the reliability required for team-scale deployment.

**What is the right governance model for community skill ecosystems?** The 26.1% vulnerability rate in community skills and the identification of a single industrialized malicious actor responsible for 54.1% of confirmed malicious cases demand concrete answers. The proposed four-tier trust framework (static analysis → semantic classification → runtime sandboxing → full verification) remains theoretical. No major skill platform has deployed automated security gates at scale.
