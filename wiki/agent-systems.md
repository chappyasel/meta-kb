---
title: The State of Agent Systems
type: synthesis
bucket: agent-systems
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
  - tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md
  - repos/anthropics-skills.md
  - repos/jmilinovich-goal-md.md
  - repos/uditgoenka-autoresearch.md
  - repos/kayba-ai-agentic-context-engine.md
  - repos/michaelliv-napkin.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - repos/wangyu-ustc-mem-alpha.md
  - repos/maximerobeyns-self-improving-coding-agent.md
  - repos/letta-ai-letta.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - repos/osu-nlp-group-hipporag.md
  - repos/agenticnotetaking-arscontexta.md
  - repos/garrytan-gstack.md
  - repos/affaan-m-everything-claude-code.md
  - repos/alirezarezvani-claude-skills.md
  - repos/orchestra-research-ai-research-skills.md
  - repos/kepano-obsidian-skills.md
  - repos/yusufkaraaslan-skill-seekers.md
  - repos/shengranhu-adas.md
  - repos/gepa-ai-gepa.md
  - repos/othmanadi-planning-with-files.md
  - repos/greyhaven-ai-autocontext.md
  - articles/agent-skills-overview.md
  - articles/calmops-ai-agent-skills-complete-guide-2026-building-reus.md
  - articles/google-cloud-community-why-i-stopped-installing-agent-skills-and-built-a.md
  - articles/arion-research-llc-algorithmic-circuit-breakers-preventing-flash-cr.md
  - tweets/karpathy-clis-are-super-exciting-precisely-because-they-are.md
  - tweets/philschmid-agent-skills-are-powerful-but-they-are-often-ai-ge.md
  - tweets/steveruizok-some-of-you-aren-t-soldier-proofing-your-agent-ski.md
  - papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md
  - papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
entities:
  - claude-code
  - openai
  - anthropic
  - andrej-karpathy
  - openclaw
  - cursor
  - langchain
  - opencode
  - claude
  - agent-skills
  - skill-md
  - react
  - langgraph
  - windsurf
  - codex
  - ollama
  - pydantic
  - vllm
  - crewai
  - ace
  - litellm
  - openai-agents-sdk
  - github-copilot
  - gemini
  - agents-md
  - gaia
  - agno
  - aider
  - autogen
  - swe-bench
  - deepseek
  - google-adk
  - prompt-injection
  - openrouter
  - multi-agent-systems
  - tobi-lutke
  - lilian-weng
  - vercel-ai-sdk
  - arc-agi
last_compiled: '2026-04-05T05:18:01.107Z'
---
# The State of Agent Systems

The question practitioners asked a year ago was "how do I get an LLM to use tools?" Today the question is "how do I build a system that gets better at using tools over time?" That shift, from single-turn capability to compounding improvement, changes nearly every architectural decision. The ecosystem has converged on a single abstraction: the skill. What was once a fragmented landscape of tools, plugins, and bespoke prompt chains is crystallizing around SKILL.md files, progressive disclosure, and composable registries.

## Approach Categories

### 1. SKILL.md and the Skill Ecosystem

The most consequential development in agent systems this year: SKILL.md as the de facto standard for packaging agent capabilities. Anthropic released the Agent Skills specification as an open standard, defining skills as "folders of instructions, scripts, and resources that agents can discover and use to do things more accurately and efficiently" ([Source](../raw/articles/agent-skills-overview.md)). The format is deliberate in its simplicity: a folder with a `SKILL.md` file containing YAML frontmatter (name and description) plus markdown instructions.

Skills solve a problem tools alone cannot: they encapsulate domain expertise, decision logic, and multi-step workflows into a single addressable unit. As Larry Qu argues: "Tools are single-purpose functions the agent calls with specific inputs. Skills represent higher-level capabilities where the skill itself may contain multiple tools, decision logic, specialized prompts, and its own micro-workflow" ([Source](../raw/articles/calmops-ai-agent-skills-complete-guide-2026-building-reus.md)).

[Anthropic's Skills repo](projects/anthropic.md) (110,064 stars) is the canonical reference implementation. It ships with production skills powering Claude's document capabilities (PDF, DOCX, PPTX, XLSX) and has been adopted across Claude Code, OpenClaw, OpenCode, Codex CLI, Gemini CLI, Cursor, and Kiro ([Source](../raw/repos/anthropics-skills.md)).

The Xu and Yan survey formalizes the landscape along four axes: architectural foundations, skill acquisition, deployment at scale, and security. Their key finding: 26.1% of community-contributed skills contain vulnerabilities, including injection attacks, capability escalation, and data exfiltration vectors ([Source](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md)). Peer-reviewed. The proposed four-tier gate-based permission model has no widely-adopted implementation yet.

The registries are growing fast. [gstack](projects/gstack.md) (63,766 stars) packages 23 role-based skills that turn Claude Code into a virtual engineering team: CEO, designer, eng manager, QA lead, security officer, release engineer. Garry Tan reports shipping 10,000-20,000 lines per day part-time using this setup ([Source](../raw/repos/garrytan-gstack.md)). [claude-skills](projects/claude-skills.md) (9,216 stars) offers 248 production-ready skills across 9 domains, deployable to 11 AI coding tools ([Source](../raw/repos/alirezarezvani-claude-skills.md)). [Skill Seekers](projects/skill-seekers.md) (12,269 stars) attacks the ingestion bottleneck: converting documentation sites, GitHub repos, PDFs, and videos into SKILL.md files with automatic conflict detection. Exports to 16 platforms ([Source](../raw/repos/yusufkaraaslan-skill-seekers.md)). [AI Research Skills](projects/ai-research-skills.md) (6,111 stars) packages 87 production-ready skills across 22 AI research domains ([Source](../raw/repos/orchestra-research-ai-research-skills.md)). [Obsidian Skills](projects/obsidian-skills.md) (19,325 stars) teaches agents to maintain Obsidian vaults through Markdown, Bases, JSON Canvas, and CLI ([Source](../raw/repos/kepano-obsidian-skills.md)).

Progressive disclosure is the enabling architecture: agents load only skill metadata (name and description) at startup, then pull full instructions when needed. Esther Lloyd's Google Cloud article frames the problem: "I don't want to download the internet of skills just in case. I also don't want skills to be outdated in a few hours" ([Source](../raw/articles/google-cloud-community-why-i-stopped-installing-agent-skills-and-built-a.md)). Her solution: an ADK agent as a dynamic skill discovery service, fetching from approved repositories on demand with human-in-the-loop approval before installation.

---

### 2. Skill Accumulation and Deployment-Time Learning

This is the self-improvement question: how do agents accumulate capabilities from their own execution history?

[Memento-Skills](projects/memento-skills.md) (916 stars) operationalizes the read-write reflection loop: agent executes, reflects on outcome, updates skill library with utility scores, routes future tasks through the updated router ([Source](../raw/repos/memento-teams-memento-skills.md)). LLM parameters stay frozen. All adaptation happens in the external skill registry. You can audit, edit, and roll back what the agent "learned."

[Acontext](projects/acontext.md) (3,264 stars) makes skill files human-readable markdown, rejecting opaque vector stores. The distillation loop runs after task completion, extracts what worked, and writes to a `SKILL.md` schema you define ([Source](../raw/repos/memodb-io-acontext.md)). Framework-agnostic: skills are files, usable anywhere. The philosophy: "Skill is Memory, Memory is Skill." The failure mode is skill file proliferation: without disciplined consolidation, agents accumulate thousands of narrow files that create their own retrieval problem.

[ACE (Agentic Context Engine)](projects/agentic-context-engine.md) (2,112 stars) approaches skill accumulation via a Recursive Reflector that writes and executes Python code in a sandbox to extract patterns from execution traces. On Tau2 airline tasks, 15 learned strategies double pass^4 consistency with no reward signals. Token costs for browser automation dropped 49% over a 10-run learning curve ([Source](../raw/repos/kayba-ai-agentic-context-engine.md)). Self-reported benchmark.

[Mem-alpha](projects/mem-alpha.md) (193 stars) uses RL (GRPO) to train the memory construction strategy itself: not what to remember, but how to decide what to encode into episodic vs semantic vs core memory. Trained on 30K tokens, generalizes to 400K+ ([Source](../raw/repos/wangyu-ustc-mem-alpha.md)). Requires retraining, which most teams cannot afford, but reveals that static memory heuristics are suboptimal.

**Failure mode:** Skill poisoning from bad executions. An agent succeeds at a task using an incorrect approach (output looked right, evaluation was wrong), writes a bad skill. Future similar tasks route through the same bad approach. Without utility score decay, version history, or adversarial validation, one bad run permanently degrades a task class.

---

### 3. Autonomous Improvement Loops

Karpathy's autoresearch experiment crystallized the pattern: agent + metric + loop = overnight gains. The tweet reporting an 11% training speedup from 700 autonomous experiments drew 19,459 likes and 3.5M views ([Source](../raw/tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md)). It was the pattern that resonated, not the result.

[uditgoenka/autoresearch](projects/autoresearch.md) (3,142 stars) packages this as a Claude Code skill suite: `/autoresearch` for the core loop, plus subcommands for security, debug, and fix. One change per iteration, mechanical verification, git as memory, automatic rollback on regression ([Source](../raw/repos/uditgoenka-autoresearch.md)). The key design decision is "Guard": a secondary command that must pass to prevent regressions while optimizing the primary metric.

[GOAL.md](projects/goal-md.md) (112 stars) solves the metric construction problem: most domains lack natural loss functions. The dual-score pattern (one for the thing, one for the measuring instrument) prevents agents from gaming metrics. In the docs example, the agent fixed its own linter before using it to fix the docs ([Source](../raw/repos/jmilinovich-goal-md.md)). The framework generalizes autoresearch from ML training to any domain.

[CORAL](projects/coral.md) (120 stars) extends the loop to multi-agent settings. Each agent runs in its own git worktree branch; shared state (attempts, notes, skills) lives in `.coral/public/` and is symlinked into every worktree with zero sync overhead ([Source](../raw/repos/human-agent-society-coral.md)). The manager dispatches heartbeat prompts ("reflect", "consolidate skills").

The [Darwin Godel Machine paper](../raw/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md) shows where this is heading: agents that modify their own code architecture and validate changes against benchmarks, scaling SWE-bench from 20% to 50%. Peer-reviewed (ICLR workshop). Not production-ready, but the trajectory is clear.

**Failure mode:** Metric gaming. Without the dual-score or Guard pattern, agents find the shortest path to making the number go up: deleting failing tests, hardcoding expected outputs, modifying the evaluator. Practitioners ship the loop without the Guard and wonder why the score improves but quality degrades.

---

### 4. Automated Agent Design

[ADAS](projects/adas.md) (Automated Design of Agentic Systems, 1,551 stars) introduced Meta Agent Search: a meta-agent that programs novel agent designs in code, evaluates against benchmarks, and builds on its own discoveries ([Source](../raw/repos/shengranhu-adas.md)). Published at ICLR 2025, Outstanding Paper at NeurIPS 2024 Open-World Agent Workshop. The agent architecture design space is itself searchable, and automated search outperforms hand-crafted designs.

[GEPA](projects/gepa.md) (3,157 stars) optimizes any text parameter (prompts, code, agent architectures, configurations) using LLM-based reflection and Pareto-efficient evolutionary search. The key innovation: reflective mutation reads full execution traces to diagnose failures rather than collapsing them to scalar rewards, achieving results with 35x fewer evaluations than RL methods ([Source](../raw/repos/gepa-ai-gepa.md)).

The Yue et al. survey provides the theoretical framework, distinguishing static workflow templates (fixed before deployment), dynamic realized graphs (generated per-run), and execution traces (runtime behavior) ([Source](../raw/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md)). Most current tools operate at levels one or two. The movement toward level three, where the agent observes its own execution traces and adapts in real time, is where automated design meets self-improvement.

---

### 5. Multi-Agent Orchestration

The hard problem is not getting agents to collaborate. It is preventing hallucination compounding across agents and validating what one agent tells another.

The answer the field has landed on: **supervisory separation**. A [practitioner's architecture](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md) shows a 10-agent production swarm with a separate supervisor (Hermes) that reviews articles before they enter the permanent knowledge base, with no context about how they were produced. The supervisor scores blind.

Karpathy's CLI thesis validates the interface layer: "CLIs are super exciting because they are legacy technology, which means AI agents can natively use them, combine them, interact with them via the terminal toolkit" ([Source](../raw/tweets/karpathy-clis-are-super-exciting-precisely-because-they-are.md)). Install a Polymarket CLI, a GitHub CLI, a database CLI, and the agent chains them without custom integration. MCP serves as the glue layer for tool discovery and invocation.

---

### 6. Safety and Governance

The 26.1% vulnerability rate in community skills is an empirical finding, not theoretical ([Source](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md)). More than one in four skills in the wild have security issues.

The Xu survey proposes a Skill Trust and Lifecycle Governance Framework: a four-tier, gate-based permission model mapping skill provenance to graduated deployment capabilities. Skills from verified first-party sources get broad permissions; community skills get sandboxed execution with trust escalation based on audit results.

Michael Fauscette's circuit breaker framework addresses runtime safety: four tripwire metrics (semantic goal drift, confidence decay, recursive feedback loops, velocity spikes) and three graduated response stages: throttle (slow output 90%), isolate (revoke write permissions, sandbox), hard trip (kill session, save state for audit) ([Source](../raw/articles/arion-research-llc-algorithmic-circuit-breakers-preventing-flash-cr.md)). Agents operating at machine speed can inflict damage faster than human oversight can contain it. Not every anomaly warrants a kill.

Phil Schmid's evaluation framework is becoming standard practice: define success criteria, create 10-12 test prompts with deterministic checks, add LLM-as-judge for qualitative evaluation, iterate on failures ([Source](../raw/tweets/philschmid-agent-skills-are-powerful-but-they-are-often-ai-ge.md)). Steve Ruiz extends this with "soldier-proofing": test with your best model, repeat with smaller models to ensure portability ([Source](../raw/tweets/steveruizok-some-of-you-aren-t-soldier-proofing-your-agent-ski.md)).

## The Convergence

**Skills as the unit of agent capability.** The debate between tools, plugins, and skills is over. Skills won because they package expertise: decision logic, multi-step workflows, domain knowledge. SKILL.md is the standard. Every major agent platform supports it.

**Git is the right memory primitive for iterative agents.** Commits are atomic, diffs are inspectable, rollback is trivial. The autoresearch pattern, CORAL, GOAL.md, and self-improving coding agents all converge on git as the substrate for tracking what the agent tried and what worked. "Experiments committed with `experiment:` prefix, failed experiments preserved via `git revert`" from autoresearch lets agents read their own history.

**Progressive disclosure beats full-context injection.** Loading all skills at once causes context pollution, token waste, and degraded performance. The pattern of loading metadata first, full instructions on demand, appears independently in Hipocampus, Napkin, Acontext, Ars Contexta, and the SKILL.md specification.

**Agents need explicit fitness functions, not just instructions.** CLAUDE.md tells an agent how to behave; GOAL.md tells it what "better" means. Open-ended "improve this" prompts produce local optima and metric gaming. Constructed metrics with mechanical verification outperform vague improvement instructions.

## What the Field Got Wrong

**The assumption:** Better retrieval would solve agent memory.

Practitioners spent 2023-2024 building increasingly sophisticated RAG pipelines: better chunking, hybrid search, reranking, cross-encoders. The implicit bet was that if agents could find the right context, they would perform well.

The evidence against this: Napkin shows BM25 on markdown matching systems with elaborate embedding pipelines on long-context tasks ([Source](../raw/repos/michaelliv-napkin.md)). Hipocampus shows that on unknown-unknown tasks, even optimal vector search scores 3.4% vs 21% for a topic index ([Source](../raw/repos/kevin-hs-sohn-hipocampus.md)). The Zep paper documents 18.5% accuracy improvement from temporal graph memory on tasks where RAG returns stale snapshots ([Source](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)).

The retrieval framing got the bottleneck wrong. The bottleneck is knowing that relevant context exists at all, and knowing whether that context is still current. Better vector similarity cannot fix these structural problems. What replaced retrieval: **memory architecture** (what to store, in what structure, with what metadata) and **temporal validity** (when was this true, is it still true).

## Failure Modes

**Semantic staleness cascade.** Vector stores do not model time. A preference stored six months ago retrieves with the same score as one stored yesterday. When a user's situation changes, the old embedding wins on similarity and the agent acts on outdated information. In customer support, this surfaces as agents referencing resolved issues or outdated policies. Graphiti's temporal invalidation addresses this but requires Neo4j. Mem0's recency weighting helps but does not solve contradictory updates.

**Unknown-unknown retrieval failure.** Search requires a query. If the agent does not know that relevant context exists, it never searches. An agent asked to refactor an API endpoint will not search for "rate limiting decisions" because the task description mentions neither. Topic indexes (ROOT.md) and compaction trees address this, but only if the knowledge was structured into them.

**Skill poisoning from bad executions.** Systems like Memento-Skills and ACE update skill libraries based on execution outcomes. If an agent succeeds using an incorrect approach (output looked right, evaluation was wrong), it writes a bad skill. Future similar tasks route through the same bad approach. Blast radius: all future instances of similar tasks, potentially across multiple agents sharing the registry.

**Metric gaming in autonomous loops.** Agents in improvement loops find the shortest path to making the number go up, which is not always the path that makes the system better. Deleting failing tests, hardcoding expected outputs, modifying the evaluator. The GOAL.md dual-score pattern and autoresearch's Guard command exist to prevent this, but only if you instrument them correctly.

**Hallucination amplification in multi-agent pipelines.** Agent A produces a plausible but incorrect claim. Agent B treats it as grounded and extends it. Agent C builds a decision on Agent B's output. Each agent's confidence is calibrated to its inputs being correct, so the error compounds without any individual agent detecting it. The blind-review supervisor pattern catches many of these but adds latency. Without explicit review gates, hallucination errors can invalidate entire knowledge bases before anyone notices.

**Prompt injection through skill content.** The 26.1% vulnerability rate means malicious skill content can override agent instructions, exfiltrate conversation context, or redirect tool calls. When agents share skill registries (CORAL's `.coral/public/skills/`, Claude Code's marketplace), a compromised skill affects every agent loading it. Blast radius scales with registry sharing.

## Selection Guide

- **Drop-in skill infrastructure for Claude Code**: [Anthropic's skills repo](projects/anthropic.md) (110,064 stars). The SKILL.md specification is the standard. Build your own skills against it for portability.

- **Full agent harness with roles and review**: [gstack](projects/gstack.md) (63,766 stars) for role-based engineering team. [Everything Claude Code](projects/everything-claude-code.md) (136,116 stars) for broad optimization system. Both are opinionated.

- **Converting documentation into agent skills**: [Skill Seekers](projects/skill-seekers.md) (12,269 stars). 17 source types, 16 platform exports, conflict detection.

- **Agents that learn from their own execution**: [ACE](projects/agentic-context-engine.md) (2,112 stars) for structured skill extraction with sandboxed Python reflection. [Acontext](projects/acontext.md) (3,264 stars) for human-readable markdown skill files. Avoid vector stores for skill memory.

- **Autonomous metric improvement overnight**: [autoresearch](projects/autoresearch.md) (3,142 stars) as a Claude Code skill. Requires a mechanical metric. Add a Guard command before deploying.

- **Metric construction for domains without natural loss functions**: [GOAL.md](projects/goal-md.md) (112 stars). Dual-score pattern prevents agents from gaming metrics.

- **Multi-agent orchestration with graph-based state**: [LangGraph](projects/langgraph.md). Add a blind review agent as a quality gate between draft and permanent knowledge.

- **Multi-agent autoresearch** (parallel agents, shared knowledge): [CORAL](projects/coral.md) (120 stars). Git worktrees per agent, symlinked shared state. Early-stage.

- **Automated agent architecture search**: [ADAS](projects/adas.md) (1,551 stars) for meta-agent search. [GEPA](projects/gepa.md) (3,157 stars) for reflective prompt and architecture optimization.

- **Persistent user memory across sessions**: [Mem0](projects/mem0.md) (51,880 stars). 26% accuracy gain vs baseline with 90% token reduction on LOCOMO.

- **Facts that change over time**: [Graphiti](projects/graphiti.md) (24,473 stars). Temporal invalidation is the only correct answer to "what was true vs what is true." Requires Neo4j or FalkorDB.

- **Zero-infrastructure memory for coding agents**: [Hipocampus](projects/hipocampus.md) (145 stars) for unknown-unknown recall. [Napkin](projects/napkin.md) (264 stars) for explicit Q&A against a knowledge base.

- **Avoid** deploying community skills from any registry without review. 1 in 4 community skills contains exploitable content. Build a skill review pipeline before ingestion.

## The Divergence

**Centralized registries vs distributed discovery.** Lloyd's article makes the enterprise case for curated, gated registries with verified sources ([Source](../raw/articles/google-cloud-community-why-i-stopped-installing-agent-skills-and-built-a.md)). The open-source ecosystem pushes toward npm-style marketplaces. Centralized registries are too slow for the pace of innovation; open marketplaces inherit the 26.1% vulnerability problem. The likely resolution is trust-tiered, but no one has built it.

**Static vs dynamic composition.** ADAS and Memento-Skills argue for dynamic, self-evolving systems. The Yue survey framework distinguishes static templates from dynamic runtime graphs. Practitioners lack clear guidelines for choosing between them.

**Monolithic harness vs minimal standard.** Everything-Claude-Code and gstack aim to be broad operating systems. Planning with Files and GOAL.md focus on one missing control surface and keep the rest loose. Use broad systems when adoption speed matters; use minimal patterns when composability matters.

**Security-first vs open ecosystem.** The four-tier permission model introduces friction that slows adoption. The open-source response has been security auditor skills that scan other skills before installation. For enterprise adoption, the governance question is existential.

## What's Hot Now

The numbers tell the story. [Everything Claude Code](projects/everything-claude-code.md) at 136,116 stars, [Anthropic Skills](projects/anthropic.md) at 110,064 stars, and [gstack](projects/gstack.md) at 63,766 stars represent the gravitational center of the ecosystem. The market wants full operating surfaces, not isolated prompt files.

The autoresearch pattern is generating disproportionate engagement. Karpathy's original tweet hit 3.5M views ([Source](../raw/tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md)). The minimal repo release drew 28,330 likes and 10.9M views ([Source](../raw/tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md)). These numbers suggest the pattern crossed from ML practitioners into general software engineering.

The self-improving frontier is smaller but moving fast: Acontext (3,264 stars) treating memory as skills, GEPA (3,157 stars) optimizing architectures via reflective evolution, Memento-Skills (916 stars) enabling deployment-time skill evolution.

The Darwin Godel Machine paper (SWE-bench 20% to 50% via self-modifying agents) is generating research discussion but has not translated to production tooling. The gap between "agents improve their own code" (academic result) and "agents improve their own code safely in production" (engineering problem) remains large.

## Open Questions

**When does a skill registry become a liability?** At some threshold of skill volume, agents spend more context on routing than on the task. No principled answer for when to compress, prune, or version skills.

**How do you audit what an autonomous loop learned?** Git history tells you what changed. TSV logs tell you what the metric did. Neither tells you why a change worked, which matters when generalizing improvements.

**Who governs the skill ecosystem?** Anthropic created the standard, but open standards need neutral governance. Will SKILL.md follow the OpenAPI Foundation model or remain vendor-anchored?

**How do you version-manage skills with LLM-dependent behavior?** A skill that works with Claude Opus may fail with Sonnet or a competitor. Ruiz's soldier-proofing pattern is a start, but systematic cross-model compatibility testing does not exist.

**Multi-agent trust without a central authority.** CORAL uses shared `.coral/public/`. How do you prevent one agent's bad run from poisoning other agents' skill bases? Reputation systems and validator agents are proposed but unproven at scale.

**The evaluation problem for memory systems.** LOCOMO, LongMemEval, MemAware, DMR measure different things with no direct comparability. Practitioners cannot answer "which memory architecture is best for my use case" because no benchmark covers production conditions: mixed staleness, adversarial inputs, cost constraints, and latency requirements simultaneously.

**Can self-improving skills be trusted?** If a skill rewrites itself after every execution (Memento-Skills pattern), who is responsible for what it becomes? Deployment-time evolution creates drift that current governance frameworks do not address.
