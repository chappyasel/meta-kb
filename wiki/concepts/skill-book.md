---
entity_id: skill-book
type: concept
bucket: agent-architecture
abstract: >-
  A SkillBook is a structured registry of agent capabilities stored as named,
  described skill definitions that an LLM agent loads on demand — differentiated
  from tool registries by providing procedural knowledge and context rather than
  function signatures.
sources:
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/repos/anthropics-skills.md
  - deep/repos/garrytan-gstack.md
  - deep/repos/kayba-ai-agentic-context-engine.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - repos/kayba-ai-agentic-context-engine.md
related:
  - claude-md
  - agent-skills
last_compiled: '2026-04-08T23:16:45.222Z'
---
# SkillBook

## What It Is

A SkillBook is a persistent, structured registry of agent capabilities — each entry combining metadata, procedural instructions, and optionally executable resources. Where a [Tool Registry](../concepts/tool-registry.md) stores function signatures and API endpoints, a SkillBook stores *how to think and act*: domain knowledge, workflow sequences, heuristics, and strategies that reshape an agent's behavior before it executes.

The distinction is practical. A tool call tells the agent *what it can do* (call this function, get this output). A skill tells the agent *how to do it well* (when approaching a PDF extraction task, first check whether the document is form-based, invoke `form_extract.py` for structured forms, fall back to layout analysis for unstructured text, validate against schema X). Skills carry the tacit expertise that would otherwise need to be rebuilt from scratch or baked permanently into model weights.

SkillBook systems appear across multiple contexts in agent infrastructure:

- **File-based registries**: The `anthropics/skills` repo stores each skill as a folder with a `SKILL.md` file and bundled resources, organized under a flat namespace. [Claude Code](../projects/claude-code.md) loads these on demand.
- **In-memory stores**: [ACE](../projects/ace.md)'s `Skillbook` class (`ace/core/skillbook.py`) maintains a thread-safe dictionary of `Skill` objects that persist across sessions via JSON serialization.
- **Process-layer SkillBooks**: [gstack](../projects/gstack.md) implements 30+ skills as SKILL.md files, organized around a sprint DAG (Think → Plan → Build → Review → Test → Ship → Reflect).
- **Learned SkillBooks**: SAGE and SEAgent produce skill libraries through reinforcement learning and autonomous discovery, though these exist in model weights rather than as inspectable artifacts.

## How It Works

### The Three-Level Progressive Disclosure Pattern

The canonical architecture for file-based SkillBooks solves one problem above all others: you cannot afford to load the full text of every skill into every conversation, but you need the agent to know which skills exist and when to use them.

The solution, formalized in the [SKILL.md](../concepts/claude-md.md) specification and documented in the Xu & Yan survey, stages information across three levels:

**Level 1 — Metadata (~100 tokens, always loaded)**: The skill's `name` and `description` fields, permanently resident in the agent's available capabilities list. This is the *only* information the agent uses to decide whether a skill is relevant. The agent reads all Level 1 entries, matches against the current request, and decides which skills to load.

**Level 2 — Instructions (loaded on trigger, target <5,000 tokens / ~500 lines)**: The full procedural knowledge for executing the skill. Workflow sequences, decision rules, warnings, and references to bundled resources. Injected into conversation context when the skill triggers.

**Level 3 — Resources (loaded on demand, unbounded)**: Scripts, API documentation, schema references, templates, reference files. These can be executed or read selectively without fully entering the context window — a Python helper script, for instance, runs without its source appearing in the prompt at all.

This architecture scales to hundreds of skills at Level 1 cost (~dozen tokens each) while only paying full context cost for the 1–2 skills actively in use. The ACE implementation (`ace/core/skillbook.py`) takes a different path for in-memory SkillBooks: it exposes a `retrieve_top_k()` function that uses cosine similarity against the current query's embedding to select only the most relevant skills, then renders them as XML `<strategy>` elements injected into the agent prompt.

### Triggering Mechanisms

**Semantic triggering** (Anthropic's approach): The agent reads the description field and decides whether the skill applies. This is elegant and requires no code, but description quality directly determines trigger reliability. The `skill-creator` meta-skill explicitly warns about "undertriggering" and recommends descriptions that are "a little bit pushy" — naming specific contexts, edge cases, and explicit trigger conditions.

**Embedding-based retrieval** (ACE's approach): Skills are embedded at write time. At query time, the system computes cosine similarity between the incoming request and skill embeddings, returning the top-k most relevant skills. This is more precise but adds latency and embedding infrastructure requirements.

**Explicit invocation** (gstack's approach): Skills map directly to slash commands (`/review`, `/ship`, `/qa`). No automatic triggering — the user or a meta-skill explicitly calls the right skill at the right sprint stage. This trades discoverability for control.

### Skill Schema and Metadata

The SKILL.md specification requires only two fields:

```yaml
---
name: pdf  # 1-64 chars, lowercase + hyphens, must match directory name
description: >  # 1-1024 chars — the triggering mechanism
  Use when working with PDF files...
---
```

Optional fields include `license`, `compatibility` (environment requirements, 1-500 chars), `metadata` (arbitrary key-value map), and `allowed-tools` (experimental, space-delimited pre-approved tool list like `Bash(git:*) Read`).

ACE's `Skill` dataclass adds: `id` (auto-generated as `{section_prefix}-{counter:05d}`), `section`, `content`, `justification`, `evidence`, `sources` (provenance tracking via `InsightSource` objects), `embedding`, and `status` (`active` or `invalid` for soft-delete).

### SkillManager Systems

A SkillManager is the component responsible for adding, updating, removing, and organizing skills in the SkillBook. The sophistication of the SkillManager determines whether the SkillBook is a static file collection or a living knowledge system.

**Static SkillManagers** (Anthropic's marketplace, gstack): Skills are authored by humans, committed to git, and distributed via plugin systems. The `marketplace.json` manifest organizes skills into installable bundles. The `gen-skill-docs.ts` script generates SKILL.md files from templates with source-code-derived placeholders, preventing documentation drift via CI freshness checks.

**LLM-driven SkillManagers** (ACE's `SkillManagerLike` protocol): After each task execution, the SkillManager role receives the Reflector's analysis and the current SkillBook rendered as prompt context, then outputs an `UpdateBatch` containing mutation operations (ADD, UPDATE, REMOVE). Every mutation carries an explanation (`reasoning`) alongside the operation itself, providing an audit trail. The `SkillManagerOutput._accept_flat_shape` validator handles both nested and flat JSON shapes from the LLM — defensive parsing that prevents brittle failures when the model produces slightly different structures.

**RL-learned SkillManagers** (SAGE, SEAgent): Skills emerge from reinforcement learning across task sequences, where earlier skills become available for reuse in later tasks. SAGE achieved 72.0% task completion on AppWorld (+8.9 percentage points over baseline), 26% fewer interaction steps, and 59% fewer generated tokens. SEAgent achieved 34.5% success on novel OSWorld environments versus 11.3% for the baseline. The tradeoff: these skills exist in model weights, not as inspectable artifacts.

### Skill Acquisition Patterns

Beyond static authorship, several acquisition patterns populate SkillBooks:

**Eval-driven iteration** (Anthropic's `skill-creator`): A meta-skill that interviews the user about intent, generates a SKILL.md draft, runs test prompts via subagents, grades with assertions (programmatic + LLM-as-judge), and iterates based on feedback. The description optimizer runs 3x per query for reliable trigger rates, splits 60/40 train/test to avoid overfitting, and iterates up to 5 times. Full loop cost: roughly 300 LLM calls.

**Reflection-based accumulation** (ACE): Each task execution feeds a three-role pipeline — Agent (executes using current skills) → Reflector (analyzes what went right/wrong) → SkillManager (mutates the SkillBook). Skills compound across sessions. New skills carry `InsightSource` provenance records (epoch, trace UID, sample question) enabling full audit trails.

**Compositional synthesis**: Specialized agents select and compose modular reasoning skills dynamically. On AIME 2025, a 30B parameter solver achieved 91.6% using compositional skill synthesis, exceeding what individual skills provide independently.

### Deduplication and Quality Control

As SkillBooks grow, near-duplicate skills accumulate. ACE's `DeduplicateStep` uses a `SimilarityDetector` to compute pairwise skill embeddings and merge pairs above a similarity threshold. `SimilarityDecision` objects (KEEP or MERGE, with reasoning and similarity score) are persisted to prevent re-evaluating the same pair across epochs.

gstack's learnings store applies confidence decay: each learned pattern starts at a confidence score (1–10) and decays 1 point per 30 days for observed/inferred learnings, preventing stale patterns from persisting indefinitely. There is no equivalent decay mechanism in the SKILL.md file-based approach.

## Relationship to Adjacent Concepts

A SkillBook occupies a specific niche relative to adjacent infrastructure:

**vs. [Tool Registry](../concepts/tool-registry.md)**: Tools provide function signatures and return values. Skills provide procedural knowledge and context. A skill might instruct an agent *which* tools to use and *how to interpret their outputs*, while the tool registry handles the actual connectivity. These are complementary.

**vs. [Procedural Memory](../concepts/procedural-memory.md)**: SkillBooks are one concrete implementation of procedural memory — "how to do things" — in agent systems. Procedural memory is the broader cognitive concept; SkillBook is the engineering pattern.

**vs. [CLAUDE.md](../concepts/claude-md.md)**: CLAUDE.md is a project-level instruction file that shapes agent behavior for a specific codebase. SkillBooks are portable, reusable across projects. CLAUDE.md implements some SkillBook-like patterns (persistent instructions, task guidance), but it's not a registry.

**vs. [Model Context Protocol](../concepts/model-context-protocol.md)**: MCP handles tool connectivity (how to connect to servers, what data to access). Skills handle procedural knowledge (what to do with that data). The Xu & Yan survey is explicit: these are complementary, not competing. A skill might instruct an agent which MCP server to use and how to interpret its outputs.

**vs. [Agent Workflow Memory](../projects/agent-workflow-memory.md)**: Workflow memory captures successful execution traces and reuses them as templates. SkillBooks capture generalized strategies and principles. The distinction is between "replay this pattern" (workflow memory) and "apply this knowledge" (SkillBook).

**vs. [Semantic Memory](../concepts/semantic-memory.md)**: Semantic memory stores facts about the world. A SkillBook stores procedural strategies. In practice, well-designed SkillBook entries sometimes blur this line — a skill about Claude API usage contains both "how to use it" (procedural) and "what it supports" (semantic).

## Who Implements It

**Anthropic** defines the canonical SKILL.md specification at agentskills.io and maintains the reference implementation at `anthropics/skills`. The `skill-creator` meta-skill closes the loop on skill quality via eval-driven iteration.

**Garry Tan / gstack**: 30+ skills organized as a sprint DAG, implemented as SKILL.md files. Introduced the sprint-as-DAG pattern, the SKILL.md.tmpl template system for documentation freshness, and the parallel Review Army (7 specialist subagents running simultaneously).

**Kayba.ai / ACE**: Python implementation with a full three-role learning pipeline, embedding-based retrieval, provenance tracking, and MCP integration for external skill access. The most complete reference for *self-improving* SkillBooks.

**SAGE (research)**: RL-based skill learning via sequential rollout on AppWorld. The strongest published result for autonomous skill acquisition.

**SEAgent**: Autonomous skill discovery for previously unseen software via world state model and curriculum generator. 34.5% on OSWorld vs 11.3% baseline.

## Failure Modes

**Phase transition in routing**: As SkillBook size grows past a critical threshold, the agent's ability to select the right skill degrades sharply. Flat registries do not scale. Hierarchical organization (categories, sub-categories, meta-skills for routing) is necessary but absent from most current implementations.

**Security: 26.1% vulnerability rate in community skills**: Xu & Yan analyzed 42,447 skills from major marketplaces. 26.1% contain at least one vulnerability. Skills with executable scripts are 2.12x more vulnerable than instruction-only skills (p<0.001). 5.2% show high-severity patterns suggesting malicious intent; 54.1% of confirmed malicious cases trace back to a single industrialized actor. The four-tier trust governance framework proposed in the paper is sensible but undeployed — any production SkillBook drawing from community contributions needs its own security gates.

**Undertriggering**: Description-based triggering fails silently. If the description doesn't match the user's phrasing, the skill never loads, and the agent proceeds without it. No error, no warning, just degraded behavior.

**Skill explosion and context budget exhaustion**: Without capacity limits and active deduplication, SkillBooks accumulate near-duplicate entries. The `as_prompt()` rendering eventually exceeds context window limits. ACE's `retrieve_top_k()` mitigates this but requires embedding infrastructure.

**Opaque learned skills**: SAGE and SEAgent produce effective skills but only in model weights. They cannot be inspected, audited, shared, or governed. There is currently no mechanism for externalizing learned skills as auditable SKILL.md-like artifacts.

**Static skills cannot evolve at runtime**: File-based SKILL.md skills are authored once and deployed. They do not update based on execution outcomes. ACE's reflection loop addresses this, but the SKILL.md standard has no equivalent mechanism.

**The cold start problem**: A new SkillBook is empty. Early epochs have no strategies to leverage. There is no standard mechanism for skill transfer or seeding from another SkillBook.

## When Not to Use It

**When tasks are narrow and well-defined**: If your agent does one thing (extract entities from invoices, answer FAQ questions), a SkillBook adds overhead without benefit. A well-crafted system prompt suffices.

**When the trigger surface is too broad**: Semantic triggering works when skill descriptions are precise. For agents handling many heterogeneous tasks, descriptions become ambiguous and triggering unreliable. Consider explicit invocation patterns instead.

**When you need millisecond latency**: Loading skills from disk, embedding queries, and injecting context all add latency. For real-time applications with tight latency budgets, skills need to be pre-loaded or embedded at model fine-tuning time.

**When operating in adversarial skill ecosystems without security gates**: The 26.1% vulnerability rate is not hypothetical. Do not plug community-contributed skills into production agents without static analysis and semantic classification at minimum.

## Unresolved Questions

**Cross-platform portability**: A skill authored for Claude implicitly depends on Claude-specific capabilities. True portability requires either universal skill runtimes or cross-platform compilation. Neither exists.

**Skill composition**: When two loaded skills conflict (different approaches to the same task), which wins? There is no standardized conflict resolution mechanism. gstack avoids this by explicit sequential invocation. ACE avoids it by keeping skills as independent strategies. Neither resolves the general case.

**Governance at scale**: The `allowed-tools` field in SKILL.md is experimental and support varies across agent implementations. Capability-based permission models for skills are proposed but undeployed.

**Evaluating skill quality**: Current benchmarks assess task completion, not skill qualities (reusability, composability, maintainability). There are no standardized testing frameworks for skills despite rapid adoption.

**Externalizing learned skills**: The gap between human-authored (transparent, portable) and machine-learned (automatic, opaque) skills is the most important open problem. Systems that can learn skills and externalize them as auditable artifacts would unify both paradigms.

## Alternatives

- **[CLAUDE.md](../concepts/claude-md.md)**: Use for project-specific instructions that don't need to be portable or reusable across codebases. Lower overhead, no registry management.
- **[Tool Registry](../concepts/tool-registry.md)**: Use when you need to extend *what* the agent can do (new APIs, new data sources) rather than *how* it reasons and acts.
- **[Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)**: Use when the knowledge is factual and document-based rather than procedural. RAG retrieves facts; SkillBooks retrieve strategies.
- **[Agent Workflow Memory](../projects/agent-workflow-memory.md)**: Use when you want to reuse specific successful execution traces rather than generalized strategies.
- **Fine-tuning**: Use when the procedural knowledge is stable, well-understood, and high-frequency enough to justify the training cost. SkillBooks are better for evolving, low-frequency, or domain-specific expertise.

## Sources

- [Anthropic Skills Repository Deep Analysis](../raw/deep/repos/anthropics-skills.md)
- [Xu & Yan: Agent Skills for LLMs (deep analysis)](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md)
- [ACE: Agentic Context Engine Deep Analysis](../raw/deep/repos/kayba-ai-agentic-context-engine.md)
- [gstack Deep Analysis](../raw/deep/repos/garrytan-gstack.md)
- [Xu & Yan: Agent Skills for LLMs (paper)](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md)

## Related

- [Agent Skills](../concepts/agent-skills.md)
- [Procedural Memory](../concepts/procedural-memory.md)
- [Tool Registry](../concepts/tool-registry.md)
- [CLAUDE.md](../concepts/claude-md.md)
- [Model Context Protocol](../concepts/model-context-protocol.md)
- [Context Engineering](../concepts/context-engineering.md)
- [Progressive Disclosure](../concepts/progressive-disclosure.md)
- [Self-Improving Agents](../concepts/self-improving-agents.md)
- [Multi-Agent Systems](../concepts/multi-agent-systems.md)
- [Voyager](../projects/voyager.md)
- [ACE](../projects/ace.md)
- [Composable Skills](../concepts/composable-skills.md)
