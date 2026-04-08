---
entity_id: skill-book
type: concept
bucket: agent-architecture
abstract: >-
  SkillBook is a structured repository pattern for agent procedural knowledge
  where skills (discrete capability packages with metadata, instructions, and
  resources) load progressively into context on demand, enabling runtime
  capability extension without model retraining.
sources:
  - repos/kayba-ai-agentic-context-engine.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/repos/garrytan-gstack.md
  - deep/repos/anthropics-skills.md
  - deep/repos/kayba-ai-agentic-context-engine.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
related:
  - claude-md
  - agent-skills
  - model-context-protocol
last_compiled: '2026-04-08T02:59:22.640Z'
---
# SkillBook

## What It Is

A SkillBook is a structured repository of agent skills: discrete, self-contained packages of procedural knowledge that an agent can look up and invoke at runtime. Each skill encodes "how to do X" — through natural language instructions, executable scripts, reference documents, and metadata — stored persistently outside the model and loaded into context only when relevant.

The concept sits at the intersection of [Procedural Memory](../concepts/procedural-memory.md) and [Context Engineering](../concepts/context-engineering.md): it externalizes what the agent knows how to do from model weights into an inspectable, auditable, modifiable artifact store. The agent does not need to be retrained to acquire new skills — a new SKILL.md file is sufficient.

SkillBook implementations appear under different names across the ecosystem. Anthropic's [Agent Skills](../concepts/agent-skills.md) repository uses flat skill directories with SKILL.md files. ACE (Agentic Context Engine) maintains a `Skillbook` class with persistent JSON storage. [Voyager](../projects/voyager.md) keeps a skill library of JavaScript functions. The underlying concept is consistent: a persistent store of named procedures an agent can retrieve and apply.

## Why It Matters

The alternative to a SkillBook is encoding all procedural knowledge in model weights or flat prompt text. Both approaches fail at scale. Baking procedures into weights requires retraining whenever workflows change. Injecting all instructions into every prompt exhausts the context window and degrades performance on unrelated tasks (the [Lost in the Middle](../concepts/lost-in-the-middle.md) problem).

SkillBook solves this through selective loading: the agent sees skill summaries always, loads full instructions on demand, and defers supporting resources until needed within a skill. An agent can "know about" hundreds of skills at negligible context cost while paying full context cost only for the 1-2 skills currently active.

This makes SkillBook a precondition for [Self-Improving Agents](../concepts/self-improving-agents.md): you cannot update an agent's capabilities between sessions without some external store to write to.

## Core Mechanism: Three-Tier Progressive Disclosure

The defining architectural pattern, formalized in the [Agent Skills](../concepts/agent-skills.md) specification and consistent across implementations.

**Tier 1 — Metadata (always loaded, ~dozen tokens):** Each skill exposes a name and short description. These are permanently resident in the agent's available context. This is the routing layer: the agent reads descriptions to decide whether a skill is relevant, without paying the cost of loading the skill itself.

**Tier 2 — Instructions (loaded on trigger, ~hundreds to thousands of tokens):** The full procedural content: step-by-step instructions, decision rules, format specifications, constraints. Injected into context when the agent determines the skill applies.

**Tier 3 — Resources (loaded on demand, unbounded):** Scripts, reference documents, API documentation, templates, example outputs. Loaded selectively within skill execution, often without ever entering the LLM's context at all (executable scripts run directly). The Anthropic skills repository demonstrates this with the `claude-api` skill: 20+ reference files across 8 programming languages, each loaded only when that language is relevant.

The practical consequence: a SkillBook with 200 skills costs roughly 200 × 15 tokens = 3,000 tokens at Tier 1. Loading one skill's instructions might cost another 2,000 tokens. Total context budget for skills in most sessions: under 10,000 tokens. Without progressive disclosure, the same knowledge would be unmanageable.

## Architectural Variants

### Static File-Based (Anthropic SKILL.md)

Skills live as directories in a filesystem. Each directory contains a `SKILL.md` with YAML frontmatter (`name`, `description`) and markdown instructions, plus optional subdirectories for scripts and reference files. The [CLAUDE.md](../concepts/claude-md.md) file or a plugin manifest declares which skills are available. Loading is triggered by the agent's semantic match against the description field.

Key design choices: names must match directory names (enforced by validation tooling), descriptions drive all triggering (no programmatic matchers), and the `allowed-tools` frontmatter field pre-authorizes specific tool invocations — a nascent permission mechanism.

Distribution happens through a `marketplace.json` manifest enabling bundle installation. The Anthropic skills repository bundles skills into `document-skills`, `example-skills`, and `claude-api` packages installable via a single command through [Claude Code](../projects/claude-code.md).

### Persistent Object Store (ACE Skillbook)

ACE implements `Skillbook` as a thread-safe Python class with a dictionary of `Skill` objects. Each skill carries:

- `id`: auto-generated as `{section_prefix}-{counter:05d}` (e.g., `general-00042`)
- `section`: organizational category
- `content`: natural language strategy text
- `justification` and `evidence`: rationale with supporting data
- `sources`: list of `InsightSource` objects tracking provenance (epoch, trace_uid, sample_question)
- `embedding`: optional float vector for similarity search
- `status`: `"active"` or `"invalid"` (soft-delete)

This object model enables features impossible with flat files: embedding-based retrieval (`retrieve_top_k()`), automated deduplication via `SimilarityDetector`, provenance tracking to specific execution traces, and mutation operations (ADD, UPDATE, REMOVE) with audit trails.

The ACE skillbook serializes to JSON and persists after each training epoch. Its rendering pipeline supports two formats: a TOON compressed tab-delimited format (default) and an XML `<strategy id="..." section="...">` format used when per-task retrieval is active.

### Learned Function Libraries (Voyager)

[Voyager](../projects/voyager.md) maintains a skill library of executable JavaScript functions for Minecraft agents. Skills are code, not prose. The library grows as the agent completes novel tasks: each successful task produces a new function added to the library. Retrieval uses embedding similarity against a query. Unlike SKILL.md files (human-readable instructions) or ACE skills (natural language strategies), Voyager skills are programs that execute directly in the game environment.

This variant demonstrates the generalizable pattern: a persistent store, a retrieval mechanism, and a feedback loop that populates the store from successful executions.

## Triggering and Retrieval

How an agent decides which skills to load is a critical design decision with no universal answer.

**Semantic description matching:** The Anthropic approach. The agent reads all Tier 1 descriptions and selects skills whose descriptions match the current task. Simple, portable, fragile. Complex triggering conditions (e.g., "trigger when code imports `anthropic` but not `openai`") must be re-implemented inside the skill body after triggering, because the trigger layer itself is just text comparison. This produces undertriggering — skills that would help but whose descriptions don't quite match the user's phrasing.

**Embedding similarity (top-k retrieval):** The ACE approach for per-task skill injection. The query embeds against all skill embeddings; top-k skills load. More reliable for large SkillBooks, requires embedding infrastructure, and retrieval quality depends on embedding model alignment with skill content. ACE's `retrieve_top_k()` in `ace/implementations/skill_rendering.py` implements this directly.

**Tool search tools:** Emerging pattern in large-scale deployments. A dedicated "tool search" capability lets the agent query a registry programmatically, reducing context overhead by up to 85% versus loading all tool descriptions. Applies the SkillBook concept recursively: the agent uses a skill to find other skills.

**Programmatic matchers:** File pattern matching, import detection, environment variable presence. Not yet standardized; the Anthropic `allowed-tools` field is adjacent but serves permission rather than routing.

## Populating the SkillBook

A SkillBook is only as useful as its contents. Population strategies vary by implementation:

**Human authorship:** The Anthropic marketplace model. Humans write SKILL.md files following the progressive disclosure pattern, bundle them, and distribute them. The `skill-creator` meta-skill provides tooling: it interviews you about the skill, writes a draft SKILL.md, runs eval prompts with-skill vs. without-skill, grades outputs, and iterates on the description to optimize trigger rates. The eval loop costs approximately $3.85 and 20 minutes for a full E2E run.

**Execution trace reflection:** The ACE model. After each task, a Reflector LLM analyzes what went right and wrong, extracts learnings as atomic insight statements, and a SkillManager decides which mutations to apply to the SkillBook. Skills emerge from experience rather than explicit authorship. Provenance traces to specific task executions via `InsightSource` records.

**Reinforcement learning (SAGE):** Skills learn during RL training via sequential rollout — agents train across task chains where earlier skills become available for reuse. Results on AppWorld: 72.0% task goal completion, 26% fewer interaction steps, 59% fewer generated tokens versus baseline. Skills are encoded in model weights, not external files, making them automatic but opaque.

**Autonomous discovery (SEAgent):** Agents explore novel environments, construct a world state model, and generate skills for previously unseen software. On OSWorld: 34.5% success on five novel environments vs. 11.3% baseline. Again, weight-encoded rather than externalizable.

The gap between human-authored (transparent, auditable, portable) and machine-learned (automatic, opaque) skills is the field's most important open problem. ACE attempts to bridge it by externalizing machine-learned strategies into an inspectable JSON store, but SAGE and SEAgent-style learning still lives in weights.

## Skill Composition

Individual skills are most powerful when sequenced. [gstack](https://github.com/garrytan/gstack)'s sprint architecture demonstrates this: 23+ specialist skills execute in a defined order (Think → Plan → Build → Review → Test → Ship → Reflect), each skill's output feeding the next skill's context through shared filesystem artifacts and session state.

This "sprint-as-DAG" pattern is not formally enforced — skills compose through implicit context sharing rather than declared dependencies. Contrast with systems like [LangGraph](../projects/langgraph.md) that make dataflow explicit. gstack's approach is simpler but loses checkpoint/resume capabilities and dependency validation.

[Compositional Skill Synthesis](../concepts/composable-skills.md) attempts formal composition: specialized agents select and combine modular reasoning skills dynamically. On AIME 2025, a 30B parameter solver achieved 91.6% using compositional synthesis — exceeding what any individual skill achieves independently.

A critical scaling failure: phase transitions. As SkillBook size grows past some threshold, the agent's ability to select the correct skill degrades sharply. Flat registries do not scale. Hierarchical organization (categories, meta-skills for routing) is necessary before the transition point, not after.

## Security

The [Agent Skills](../concepts/agent-skills.md) survey analyzed 42,447 community-contributed skills and found 26.1% contain at least one vulnerability. Skills with executable scripts are 2.12x more vulnerable than instruction-only skills. 5.2% exhibit high-severity patterns. 54.1% of confirmed malicious cases trace to a single automated actor.

The attack surface is specific: once a skill's Tier 2 instructions load into context, they are treated as authoritative context by the LLM. Prompt injection via SKILL.md is straightforward. Malicious skills can exfiltrate data (13.3% of vulnerable skills), escalate privileges (11.8%), or simply corrupt the agent's reasoning.

Mitigation requires a trust hierarchy before a skill reaches production: static analysis of SKILL.md content, semantic classification for policy violations, capability review for sensitive permissions, and formal security audit before script execution is permitted. No major platform has deployed this governance pipeline in production as of this writing.

## Relationship to Other Concepts

**[Procedural Memory](../concepts/procedural-memory.md):** A SkillBook is the primary implementation mechanism for procedural memory in deployed agents. Where procedural memory describes the cognitive category, SkillBook describes the data structure and access patterns.

**[Agent Memory](../concepts/agent-memory.md):** SkillBook is one of several memory stores an agent maintains. Episodic memory stores past events; semantic memory stores facts; SkillBook stores procedures. ACE's `InsightSource` provenance tracking connects skill acquisition to episodic records.

**[Context Engineering](../concepts/context-engineering.md):** The three-tier progressive disclosure pattern is a specific context engineering technique. The question "what goes in context and when" is the central SkillBook design problem.

**[Tool Registry](../concepts/tool-registry.md):** A Tool Registry catalogs callable APIs (function signatures, parameters, return types). A SkillBook catalogs procedures (instructions, workflows, decision rules). Tools are atomic; skills are composite. A skill often instructs an agent to use specific tools from the registry. [Model Context Protocol](../concepts/model-context-protocol.md) serves as the connectivity layer that skills reference for tool access.

**[CLAUDE.md](../concepts/claude-md.md):** CLAUDE.md is a project-level configuration file that declares persistent context for Claude sessions. It can reference or include skill configurations, making it a natural mount point for SkillBook integration. Skills are a more structured, modular extension of what CLAUDE.md provides.

**[Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md):** RAG retrieves documents; SkillBook retrieves procedures. The retrieval mechanisms overlap (embedding similarity, BM25), but the content type differs. RAG answers "what is X?"; SkillBook answers "how do I do X?".

## Failure Modes

**Undertriggering:** Skills that should activate do not, because the user's phrasing doesn't match the description well enough. The Anthropic skill-creator documentation explicitly warns about this and recommends "aggressive" description writing. No systematic solution exists beyond better descriptions and human evaluation.

**Phase transition in selection accuracy:** Beyond a critical SkillBook size (undetermined, varies by model and description quality), routing accuracy collapses. Flat registries cannot scale indefinitely. Build hierarchical organization from the start.

**Documentation drift:** If skill instructions reference tool APIs, command flags, or system behaviors that change, the instructions silently become wrong. The gstack SKILL.md.tmpl template system mitigates this by generating skill content from source code metadata, with CI checks for freshness. Instruction-only skills have no equivalent protection.

**Context budget exhaustion:** Loading multiple complex skills simultaneously can exhaust context budgets. No cross-skill token budgeting mechanism exists in any current implementation. Mitigation: keep Tier 2 instructions under ~5,000 tokens and defer reference material to Tier 3.

**Skill proliferation (ACE-specific):** Machine-learned SkillBooks grow monotonically. Deduplication via embedding similarity catches obvious duplicates, but near-similar-but-distinct skills accumulate. The `SimilarityDecision` persistence prevents re-evaluating settled pairs, but capacity limits and pruning remain unsolved.

**Static skills in dynamic environments:** Skills capture knowledge at authorship time. The environment changes; skills do not (without explicit update mechanisms). Confidence decay (ACE implements 1 point per 30 days for inferred learnings) helps, but does not handle sudden API changes or deprecated tooling.

## When Not to Use a SkillBook

**Single-session, narrow tasks:** If an agent handles exactly one workflow type with a fixed set of instructions, a SkillBook adds indirection without benefit. Put the instructions in the system prompt.

**Frequent skill invalidation:** If the procedures change faster than skills can be updated and evaluated, skill content will be wrong more often than helpful. High-velocity environments need a different approach — perhaps tool-use with programmatic documentation fetching rather than cached procedural instructions.

**Teams requiring cross-agent skill sharing:** Current SkillBook implementations are per-agent or per-project. Multi-developer teams hitting the same SkillBook concurrently need locking, versioning, and merge strategies that none of the existing implementations provide.

**Security-sensitive deployments without governance:** 26.1% vulnerability rate in community skills makes untrusted SkillBooks a liability. Without the infrastructure to vet skills before deployment (static analysis, capability review, audit for scripts), community-sourced SkillBooks represent an unacceptable attack surface.

## Unresolved Questions

**Portability across models:** A SKILL.md written for Claude relies on Claude-specific interpretation of instruction prose. Whether the same skill produces equivalent behavior on GPT-4 or Gemini is untested. True portability would require either a universal skill runtime or cross-platform benchmarks neither of which exists.

**Skill version management:** When a skill is updated, sessions in progress with the old version loaded face undefined behavior. Version pinning, graceful upgrade, and rollback are not addressed in any current specification.

**Conflict resolution between skills:** Two loaded skills may give contradictory instructions. No arbitration mechanism exists. The agent resolves conflicts implicitly through its own reasoning, with unpredictable results.

**Governance at ecosystem scale:** Marketplace-distributed skills require vetting pipelines. The proposed four-tier governance framework (static analysis → semantic classification → capability review → security audit) from the Agent Skills survey is a reasonable design but has not been deployed at scale. Who runs the audit? Who has revocation authority? What happens to deployed agents when a skill is revoked?

**Cost at scale:** The skill-creator's full eval loop (20 queries × 3 runs × 5 iterations = 300 LLM calls) makes systematic quality assurance expensive. Ongoing trigger monitoring in production adds further cost. At 1,000 skills in an enterprise SkillBook, maintaining quality becomes a significant operational line item.

## Related Concepts and Projects

- [Agent Skills](../concepts/agent-skills.md) — the formal specification layer
- [Procedural Memory](../concepts/procedural-memory.md) — the cognitive memory category SkillBook implements
- [Context Engineering](../concepts/context-engineering.md) — the broader discipline governing what loads into context
- [Progressive Disclosure](../concepts/progressive-disclosure.md) — the three-tier loading pattern
- [Tool Registry](../concepts/tool-registry.md) — catalogs tools; SkillBook catalogs procedures that use those tools
- [Model Context Protocol](../concepts/model-context-protocol.md) — connectivity layer that skills reference for tool access
- [CLAUDE.md](../concepts/claude-md.md) — project configuration that integrates with skill loading
- [Voyager](../projects/voyager.md) — earliest prominent SkillBook implementation (JavaScript function library)
- [Agent Workflow Memory](../projects/agent-workflow-memory.md) — workflow-level memory adjacent to skill storage
- [Self-Improving Agents](../concepts/self-improving-agents.md) — SkillBook is the write target for self-improvement loops
- [Compositional Skill Synthesis](../concepts/composable-skills.md) — formal composition of skills
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — document retrieval analog; SkillBook is the procedural variant
- [Reflexion](../concepts/reflexion.md) — reflection-based learning that populates SkillBooks in ACE-style systems
