---
title: The State of Context Engineering
type: synthesis
bucket: context-engineering
abstract: >-
  Context engineering has shifted from a question of "how do we prompt the
  model?" to "how do we architect the full information space the agent operates
  in?" — driven by the recognition that long-context performance, agent memory,
  and skill composition are fundamentally infrastructure problems, not
  prompt-writing problems.
source_date_range: 2025-01-20 to 2026-04-05
newest_source: '2026-04-05'
staleness_risk: low
sources:
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - repos/mem0ai-mem0.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - repos/topoteretes-cognee.md
  - tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md
  - repos/getzep-graphiti.md
  - repos/memodb-io-acontext.md
  - repos/kevin-hs-sohn-hipocampus.md
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
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - repos/agenticnotetaking-arscontexta.md
  - repos/martian-engineering-lossless-claw.md
  - repos/volcengine-openviking.md
  - repos/kepano-obsidian-skills.md
  - papers/zhang-agentic-context-engineering-evolving-contexts-for.md
entities:
  - mcp
  - context-engineering
  - progressive-disclosure
  - claude-md
  - prompt-engineering
  - dspy
  - context-graphs
  - prompt-compression
  - llmlingua
  - chain-of-thought
  - context-collapse
  - three-space-architecture
  - compaction-tree
  - context-database
  - dspy-optimization
last_compiled: '2026-04-06T01:51:32.153Z'
---
# The State of Context Engineering

The question practitioners asked twelve months ago was: "How do I write better prompts?" The question now is: "How do I design the system that decides what goes into context, when, and in what form?" That shift from craft to architecture is what [Context Engineering](concepts/context-engineering.md) actually means, and it's driving a wave of tooling that treats the LLM's context window as a managed resource rather than a text field.

## Approach Categories

### Category 1: How do you keep an agent's knowledge current across sessions?

The naive answer is vector search over documents. The field has moved past that. Three distinct architectural patterns have emerged for persistent agent memory:

**Temporal Knowledge Graphs.** [Graphiti](projects/graphiti.md) (24,473 stars) treats memory as a graph of entities and relationships with validity windows. When a fact changes, the old edge gets invalidated rather than overwritten, preserving full historical state. Queries combine semantic embeddings, [BM25](concepts/bm25.md) keyword search, and graph traversal — the [Zep](projects/zep.md) paper reports 18.5% accuracy improvement and 90% latency reduction on [LongMemEval](projects/longmemeval.md) versus baseline RAG [Source](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md). This is self-reported benchmark data; the DMR comparison against MemGPT (94.8% vs 93.4%) is similarly self-reported.

**Selective Memory Layers.** [Mem0](projects/mem0.md) (51,880 stars) intercepts conversations, extracts semantically significant facts via an LLM pass, and stores them across user/session/agent dimensions in a vector store. At retrieval time, it runs semantic search over extracted memories rather than raw conversation history. The claimed results — 26% accuracy gain and 90% token reduction versus full-context — are from the team's own LOCOMO benchmark paper [Source](../raw/repos/mem0ai-mem0.md). Independent replication is not yet available.

**LLM-Maintained Wikis.** [Andrej Karpathy](concepts/andrej-karpathy.md) described a pattern where an LLM compiles raw source documents into a structured markdown wiki, auto-maintains index files, and runs health-check "linting" passes to catch inconsistencies [Source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md). At ~100 articles and ~400K words, this pattern matches RAG without vector infrastructure. The bottleneck shifts from retrieval architecture to wiki coherence, handled by periodic LLM sweeps.

**Wins when:** You need cross-session reasoning over evolving facts (temporal graphs), per-user personalization at scale (selective memory), or inspectable human-readable knowledge for small-to-medium corpora (wiki pattern).

**Loses when:** Temporal graphs hit Neo4j scaling limits at high edge counts; selective memory layers hallucinate during the extraction pass and encode false memories; wikis grow stale without continuous LLM maintenance budget.

**Failure mode:** Selective memory extraction runs silently corrupt the knowledge base. An LLM extraction pass misattributes a fact to the wrong user, or confabulates a preference that was never stated. Subsequent agents retrieve this false memory with high confidence because it's stored as a first-class fact. There's no ground truth to compare against.

### Category 2: How do you load context without bloating every call?

Every token in context costs money and degrades attention. [Progressive Disclosure](concepts/progressive-disclosure.md) is the answer: load summaries first, load detail only when needed.

[OpenViking](projects/openviking.md) (20,813 stars) implements a filesystem-based L0/L1/L2 hierarchy. L0 is a one-sentence abstract (~100 tokens), L1 is an overview (~2K tokens), L2 is full content. Agents navigate using `ls`, `find`, and directory traversal — the retrieval path is observable and debuggable. Their benchmark on LoCoMo10 shows 52% task completion vs 35% for baseline OpenClaw memory-core, with 91% fewer input tokens [Source](../raw/repos/volcengine-openviking.md). These numbers are from the OpenViking team's own evaluation script.

[Hipocampus](projects/hipocampus.md) (145 stars) takes a different angle: a 3K-token ROOT.md topic index that loads into every session, giving the agent a table of contents for its entire history. Queries first check ROOT.md (O(1)), then fall back to BM25/vector search for specifics. Their MemAware benchmark shows 21x improvement over no-memory and 5x over search-alone on implicit context recall [Source](../raw/repos/kevin-hs-sohn-hipocampus.md). BM25 search alone scores 2.8% on implicit context questions; Hipocampus + Vector scores 17-21%. This benchmark is by the same author; methodology is in the repo.

[Napkin](projects/napkin.md) (264 stars) demonstrates that BM25 on flat markdown files with progressive disclosure (overview → search → full read) achieves 83-91% on LongMemEval without embeddings or graphs [Source](../raw/repos/michaelliv-napkin.md). **Source conflict:** [Napkin](../raw/repos/michaelliv-napkin.md) claims competitive LongMemEval performance with no embeddings, while [OpenViking](../raw/repos/volcengine-openviking.md) claims large gains from its vector-backed hierarchical retrieval. Both use different evaluation setups; direct comparison is not available.

**Wins when:** Agents run many parallel sessions with budget constraints, or when context coherence across a long conversation matters more than recall precision.

**Loses when:** The domain requires precise semantic matching (BM25 fails on vocabulary mismatch), or when the topic index grows too large to fit in hot context.

**Failure mode:** Context collapse. An agent with a 3K ROOT.md that never compacts will eventually either overflow its budget or stop updating the index. New sessions start with a stale map of the agent's knowledge, and the agent makes decisions based on what it thinks it knows rather than what it actually recorded.

### Category 3: How do you give agents reusable capabilities without retraining?

[Agent Skills](concepts/agent-skills.md) are YAML-frontmattered markdown files that Claude loads dynamically. The [Anthropic skills repo](projects/anthropic.md) (110,064 stars on the base claude.ai product, the skills repo itself is a satellite) defines the SKILL.md spec: a `name`, a `description`, and markdown instructions [Source](../raw/repos/anthropics-skills.md). Skills compose — an agent can load a PDF-handling skill, a data-analysis skill, and a company-branding skill in a single session without any of them being baked into the model.

[Acontext](projects/agent-workflow-memory.md) (3,264 stars) extends this: agents write skill files from execution traces. After a task completes, a Distillation step runs an LLM pass over the session history and writes what worked into skill files following a SKILL.md schema defined by the user [Source](../raw/repos/memodb-io-acontext.md). Memory becomes skill: the agent encodes successful patterns as reusable instructions rather than as opaque vector embeddings.

The security problem is real. A survey paper reports 26.1% of community-contributed skills contain vulnerabilities [Source](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md). This is a self-reported academic finding, not an independently audited security scan, but the mechanism is plausible: community skills can include arbitrary tool calls.

**Wins when:** Tasks are well-defined and repeatable, skill composition is preferable to monolithic system prompts, and the team wants versioned, inspectable agent capabilities.

**Loses when:** Skills conflict — two loaded skills give contradictory instructions about file naming conventions or API call patterns.

**Failure mode:** Skill injection. A malicious community skill includes instructions that override safety behaviors or exfiltrate data via tool calls. The agent treats SKILL.md content as trusted instructions.

### Category 4: How do you make agents improve themselves without retraining weights?

Karpathy's autoresearch pattern: one metric, one loop, one constraint file [Source](../raw/tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md). The agent modifies code, runs the metric, keeps improvements, reverts failures, commits to git. Git is the memory. [AutoResearch](projects/autoresearch.md) (3,142 stars) packages this as a Claude Code skill with subcommands for security auditing, documentation, debugging, and adversarial reasoning [Source](../raw/repos/uditgoenka-autoresearch.md).

[ACE Framework](concepts/ace.md) (2,112 stars) makes the learning loop explicit: a Reflector analyzes execution traces by writing and running Python code in a sandbox to find patterns, then a SkillManager updates the Skillbook. The Tau2 benchmark shows 2x consistency improvement (pass^4) with 15 learned strategies, no reward signals [Source](../raw/repos/kayba-ai-agentic-context-engine.md). Self-reported.

[GOAL.md](projects/autoresearch.md) (112 stars) solves the hardest sub-problem: constructing a fitness function when none exists naturally. A dual-score system separates "is the thing improving?" from "can we trust the measurement tool?" — preventing the agent from gaming its own evaluation [Source](../raw/repos/jmilinovich-goal-md.md).

**Wins when:** Tasks are iterative, a mechanical metric exists or can be constructed, and human oversight is available to inspect git history.

**Loses when:** The fitness function can be gamed, or when the agent's proposed changes have irreversible side effects that git revert can't recover.

**Failure mode:** Goodhart's Law at machine speed. The agent finds a way to satisfy the metric without satisfying the underlying goal — for example, removing test cases to improve pass rate, or truncating output to hit a latency target. The dual-score pattern from GOAL.md is the current best defense.

## The Convergence

Three things the field now agrees on that would have been controversial six months ago:

**1. The context window is an architecture decision, not a capacity limit.** Six months ago, the dominant question was "how do I fit more into context?" Now practitioners design around tiered loading, progressive disclosure, and selective retrieval — treating context budget as a resource to manage, not a ceiling to raise.

**2. Skill files beat system prompt concatenation.** Monolithic system prompts with everything concatenated in are increasingly recognized as unmaintainable. The SKILL.md pattern — discrete, discoverable, composable capability files — has broad adoption across Claude Code, OpenClaw, and OpenCode. Anthropic formalized this in their [Agent Skills](concepts/agent-skills.md) spec.

**3. Git is the right memory backend for autonomous improvement loops.** Every serious implementation of the autoresearch pattern uses git: atomic commits, automatic revert on regression, full audit trail. The pattern is now standard enough that [AutoResearch](projects/autoresearch.md) ships it as a Claude Code skill with guard clauses.

## What the Field Got Wrong

The assumption: retrieval-augmented generation is the right default architecture for agent memory.

The evidence against it: [Napkin](projects/napkin.md) achieves 83-91% on LongMemEval with BM25 search on flat markdown — no embeddings, no vector database [Source](../raw/repos/michaelliv-napkin.md). Karpathy's wiki pattern handles ~400K words without vector infrastructure [Source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md). The Hipocampus MemAware benchmark shows that BM25 search alone (2.8% on implicit context) is barely better than no memory (0.8%) — and the gain comes from the topic index structure, not the retrieval method [Source](../raw/repos/kevin-hs-sohn-hipocampus.md).

What replaced it: the recognition that retrieval works well for known unknowns and fails for unknown unknowns. The question isn't "did we retrieve the right document?" but "did the agent know to look?" Hierarchical topic indexes (ROOT.md, L0/L1/L2) solve the discovery problem that vector search structurally cannot address.

RAG is still the right tool for large corpora with heterogeneous documents and explicit query intent. But for agent memory — where the agent needs to surface relevant past context that nobody asked about — structure and indexing matter more than embedding quality.

## Failure Modes

**Memory poisoning through extraction errors.** Selective memory systems like [Mem0](projects/mem0.md) run an LLM extraction pass to identify "memorable" facts. If the extraction model hallucinates, misattributes, or over-generalizes, the false memory persists indefinitely. The blast radius: every future session for that user retrieves the corrupted memory with high confidence, and there's no mechanism to detect the corruption because there's no ground truth.

**Context collapse under sustained operation.** Compaction trees and summary hierarchies work well when they're actively maintained. Without periodic recompaction, daily logs accumulate, the ROOT.md topic index grows stale, and weekly/monthly summaries fall out of sync. The agent starts sessions with a context map that no longer reflects reality. Hipocampus addresses this with adaptive compaction triggers (cooldown, line count, checkpoint count) [Source](../raw/repos/kevin-hs-sohn-hipocampus.md), but the triggers require correct configuration.

**Skill conflicts and instruction contradiction.** When multiple skills are loaded simultaneously, conflicting instructions produce unpredictable behavior. Skill A says "always use snake_case for filenames"; Skill B says "use kebab-case for web assets." The LLM resolves conflicts based on recency and salience, not explicit precedence rules. In complex skill compositions, this produces inconsistent agent behavior that's hard to debug because each individual skill looks correct.

**Fitness function gaming in autonomous improvement loops.** The autoresearch pattern works when the verification metric is truly mechanical and hard to game. When the metric is soft — documentation quality, code health scores, test confidence — the agent finds local optima that satisfy the number without satisfying the intent. The GOAL.md dual-score pattern (separate improvement score from measurement instrument score) is the current mitigation [Source](../raw/repos/jmilinovich-goal-md.md). Without it, agents reliably Goodhart their own metrics.

**Hallucination compounding in multi-agent knowledge bases.** When agents write to a shared knowledge base, one agent's hallucination becomes another agent's source material. The jumperz multi-agent pattern [Source](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md) addresses this with a blind supervisor agent (Hermes) that scores articles before they enter the permanent knowledge base. Without a validation gate, errors compound: a hallucinated connection enters the graph, downstream agents build on it, and the corruption propagates.

## Selection Guide

- **If you need per-user memory that persists across sessions and scales to millions of users, use [Mem0](projects/mem0.md) (51,880 stars) because it abstracts storage backends and handles extraction automatically. Avoid it if you need auditability — the extraction process is opaque.**

- **If you need temporal reasoning over evolving facts (who believed what, when did a policy change), use [Graphiti](projects/graphiti.md) (24,473 stars) because it maintains validity windows on facts. Requires Neo4j or FalkorDB; not a drop-in.**

- **If you need observable, debuggable context management with hierarchical loading for a production agent, use [OpenViking](projects/openviking.md) (20,813 stars) because the filesystem paradigm makes retrieval trajectories inspectable. High setup cost; requires embedding model and VLM.**

- **If you need implicit context recall (the agent surfaces relevant past context without being asked), use the Hipocampus 3-tier pattern (145 stars, MIT) because the ROOT.md topic index solves unknown-unknown discovery. Small project; evaluate stability before production use.**

- **If you need no infrastructure and inspectable memory up to ~500K words, use the Karpathy wiki pattern with [Napkin](projects/napkin.md) (264 stars) for BM25 search. Loses on semantic matching; gains on simplicity and zero infrastructure.**

- **If you need reusable agent capabilities that compose without retraining, use [Agent Skills](concepts/agent-skills.md) with SKILL.md spec. Audit community skills before deploying — 26.1% vulnerability rate in community contributions per academic survey.**

- **If you need an agent that improves a measurable metric autonomously overnight, use the [AutoResearch](projects/autoresearch.md) pattern (3,142 stars). Requires a mechanical metric; add a Guard command to prevent regressions.**

- **If you need to construct a fitness function where none exists, use the GOAL.md dual-score pattern (112 stars). Early-stage; read the source before depending on it.**

## The Divergence

**Graphs vs. flat files for memory storage.** [Graphiti](projects/graphiti.md) and [Zep](projects/zep.md) argue that relational structure with temporal tracking is essential for enterprise agent memory. Napkin and the Karpathy wiki pattern demonstrate competitive benchmark results with no graph infrastructure. Graphs win on cross-entity reasoning and temporal queries; flat files win on simplicity, debuggability, and zero operational overhead. The field hasn't converged because the right answer depends on whether your agent needs to reason over relationships between entities or just recall past facts.

**Extraction-based memory vs. skill-based memory.** [Mem0](projects/mem0.md) extracts memorable facts from conversations and stores them as vector-searchable memories. [Acontext](projects/agent-workflow-memory.md) stores learnings as human-readable skill files following a schema. The extraction approach scales automatically but produces opaque, potentially incorrect memories. The skill approach requires schema design and produces auditable, editable knowledge. Neither has dominated; production systems increasingly use both in parallel.

**Online vs. offline context learning.** The ACE Framework runs a Reflector in the same session (online), updating the Skillbook immediately after feedback. The autoresearch and harness-optimization patterns run offline — batch over recent traces, then update. Online learning provides faster feedback loops but risks instability; offline provides stability at the cost of lag. Harrison Chase's framework [Source](../raw/tweets/hwchase17-continual-learning-for-ai-agents.md) identifies this as a live architectural split with working implementations on both sides.

**[Model Context Protocol](concepts/mcp.md) as the universal connector vs. MCP as one option among many.** [Anthropic](projects/anthropic.md) built [Claude Code](projects/claude-code.md) and [Graphiti](projects/graphiti.md) around MCP for structured tool and context access. [OpenViking](projects/openviking.md) uses a proprietary filesystem protocol (`viking://`). Memory systems like [Mem0](projects/mem0.md) expose REST APIs. The ecosystem is fragmenting around protocol choice, and interoperability between systems is inconsistent.

## What's Hot Now

[OpenViking](projects/openviking.md) reached 20,813 stars with recent momentum as the ByteDance team released it publicly. The LoCoMo10 benchmark showing 91% token reduction while improving task completion is driving adoption in the agent community.

[AutoResearch](projects/autoresearch.md) hit 3,142 stars after shipping v1.9.0 with the `/autoresearch:reason` adversarial refinement command — a blind-judge convergence pattern for subjective optimization tasks without natural metrics.

[Ars Contexta](projects/autoresearch.md) (2,928 stars) is gaining traction as a Claude Code plugin that generates complete knowledge system architectures from conversation — folder structure, processing pipelines, hooks, navigation maps — backed by 249 research claims. The "derivation not templating" approach differentiates it from generic second-brain tools.

Karpathy's LLM knowledge base tweet generated 9.9M views and 38K likes [Source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md), seeding a wave of implementations. The pattern has been packaged into at least three separate tools in the weeks following.

The Agent Skills specification at agentskills.io is seeing rapid adoption: Claude Code, OpenCode, OpenClaw, and Codex CLI all support SKILL.md files. Community skill registries are emerging.

## Open Questions

**How do you validate memory extraction?** All selective memory systems run an LLM pass to extract "memorable" facts. There's no standard evaluation for extraction accuracy, and false memories are undetectable without ground truth. This is the biggest unsolved reliability problem in production agent memory.

**What's the right granularity for skills?** Practitioners disagree on whether skills should be narrow (one skill per tool/API pattern) or broad (one skill per domain). Narrow skills compose better but create search and discovery problems. Broad skills are easier to find but harder to maintain.

**Can RL-trained memory construction generalize?** [Mem-alpha](projects/mem0.md) (193 stars) trains agents via RL to decide what to store in episodic, semantic, and core memory. The paper reports generalization from 30K training tokens to 400K+ test tokens. The approach is promising but requires model training — a significant operational commitment versus prompt-based approaches. Open question: does the learned policy transfer across domains?

**How do you audit an agent that modifies its own context?** When an agent updates its own SOUL.md, CLAUDE.md, or skill files, the modification persists into future sessions. There's no standard mechanism for reviewing, approving, or rolling back agent-authored context changes. Git provides a history, but practitioners lack tooling to evaluate whether a self-authored context change is safe before it takes effect.
