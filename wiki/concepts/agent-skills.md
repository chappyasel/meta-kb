---
entity_id: agent-skills
type: concept
bucket: agent-memory
abstract: >-
  Agent Skills: reusable capability units stored as SKILL.md files that agents
  load on demand, solving the tension between rich domain knowledge and finite
  context windows through progressive disclosure.
sources:
  - tweets/pawelhuryn-your-claude-md-is-doing-jobs-that-rules-hooks-an.md
  - repos/memodb-io-acontext.md
  - repos/alirezarezvani-claude-skills.md
  - repos/anthropics-skills.md
  - repos/kayba-ai-agentic-context-engine.md
  - repos/kepano-obsidian-skills.md
  - repos/letta-ai-letta.md
  - papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
  - articles/agent-skills-overview.md
  - >-
    articles/google-cloud-community-why-i-stopped-installing-agent-skills-and-built-a.md
  - articles/martinfowler-com-context-engineering-for-coding-agents.md
  - deep/repos/anthropics-skills.md
  - deep/repos/kayba-ai-agentic-context-engine.md
  - deep/repos/othmanadi-planning-with-files.md
  - deep/repos/kepano-obsidian-skills.md
  - deep/repos/memento-teams-memento-skills.md
  - deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
related:
  - Claude Code
  - Anthropic
  - Claude
  - Cursor
  - OpenCode
  - OpenAI Codex
  - Google Gemini
  - skill.md
  - Procedural Memory
  - Progressive Disclosure
  - GPT-4
  - GitHub Copilot
  - Voyager
  - Compositional Skill Synthesis
last_compiled: '2026-04-05T20:26:34.240Z'
---
# Agent Skills

## What They Are

Agent Skills are discrete, portable capability units that LLM agents can acquire, store, and retrieve. Each skill encodes domain-specific knowledge — how to produce a valid JSON Canvas file, how to call an API across eight programming languages, how to plan a multi-step coding task — as a structured markdown file that any compatible agent runtime can load into context when relevant.

The format is minimal by design. A skill is a directory containing a `SKILL.md` file with YAML frontmatter plus instructional prose. The frontmatter carries only two required fields: `name` (1–64 lowercase characters matching the directory name) and `description` (1–1024 characters explaining what the skill does and when to use it). Everything else — scripts, reference docs, assets — is optional.

```
my-skill/
  SKILL.md          # required: frontmatter + instructions
  scripts/          # optional: executable helpers
  references/       # optional: detailed docs loaded on demand
  assets/           # optional: templates, resources
```

The [agentskills.io](../concepts/agent-skills.md) specification, published by Anthropic in December 2025, defines this format. Claude Code, Codex CLI, GitHub Copilot, Gemini CLI, OpenCode, and Cursor have all converged on it — a rare cross-vendor standard in the AI tooling space.

## The Core Problem They Solve

LLM agents face a fundamental tension: rich domain knowledge requires many tokens, but context windows are finite. Before agent skills, the workaround was monolithic system prompts that loaded all knowledge upfront, or RAG pipelines that retrieved raw documentation chunks without guaranteeing coverage of the specific patterns an agent needs.

Skills solve this through **progressive disclosure** — loading knowledge in layers based on what the current task actually requires:

1. **Metadata tier (~100 tokens, always in context)**: Every installed skill's `name` and `description` are permanently resident. The agent reads these to decide whether a skill is relevant.
2. **Instruction tier (<5000 tokens, loaded on activation)**: The full `SKILL.md` body loads when the description matches the task.
3. **Resource tier (loaded on demand, no fixed limit)**: Scripts, reference files, and assets load only when the instructions specifically call for them.

A skill like the `claude-api` reference implementation can bundle 20+ reference files across 8 programming languages while keeping per-task token cost to the single relevant language's documentation. The [anthropics/skills repository](../projects/anthropic-skills.md) demonstrates this pattern across document production, creative, meta, and workflow skill categories.

## How Triggering Works

Triggering is purely semantic. The agent runtime matches the user's task against skill descriptions using natural language understanding. There are no programmatic triggers, no file-pattern matchers, no keyword rules at the trigger layer.

This makes description quality the single largest variable in whether a skill gets used. Vague descriptions produce undertriggering — the most common failure mode. Descriptions that name specific contexts, file extensions, and use cases work better. The `claude-api` skill demonstrates precise trigger specification inside the instruction body (after activation):

```
TRIGGER when: code imports `anthropic`/`@anthropic-ai/sdk`
DO NOT TRIGGER when: code imports `openai`/other AI SDK
```

The description activates the skill broadly; conditional logic inside the skill handles precision.

## Implementations

### Anthropic's Official Skills Repo

The reference implementation at [anthropics/skills](../projects/anthropic-skills.md) serves three roles: canonical spec host, curated skill marketplace, and production source for Claude's document capabilities (DOCX, XLSX, PPTX, PDF).

Its most architecturally significant skill is `skill-creator` — a meta-skill that teaches Claude how to build, evaluate, and iterate on other skills. It closes the quality loop through a full eval-driven development cycle: interview to capture intent, draft SKILL.md, generate test prompts, run with-skill vs. baseline comparisons via subagents, grade outputs with LLM-as-judge, aggregate benchmarks with variance analysis, and iterate up to five times. The description optimizer runs 3× per query, uses a 60/40 train/test split to avoid overfitting, and measures trigger rates empirically.

The bundled-scripts pattern from this repo is worth noting separately. Deterministic operations — form extraction, spreadsheet recalculation, PDF conversion — live as Python scripts in the skill directory. The `SKILL.md` tells the agent when to invoke them; the script code never enters the context window. This is a clean separation: instructions for judgment calls, scripts for deterministic operations.

### Kayba ACE (Agentic Context Engine)

[ACE](../projects/kayba-ace.md) implements the deepest form of skill evolution. Rather than treating skills as static files, it runs a three-role feedback loop — Agent, Reflector, SkillManager — that can rewrite skill content, update utility scores, and create new skills from failure patterns.

The Skillbook (`ace/core/skillbook.py`) persists `Skill` objects with full provenance: every skill carries `InsightSource` records tracking which epoch, trace UID, and sample question generated it. The `_append_unique_sources()` function deduplicates by JSON-serialized signature. Mutations batch into `UpdateBatch` objects that include the SkillManager's reasoning alongside operations — creating an audit trail for every change.

Skills inject into agent prompts via either TOON (compressed tab-delimited) or XML format:
```xml
<strategy id="general-00042" section="general">
When a customer requests a flight change, verify booking status first...
</strategy>
```

Per-task retrieval via `retrieve_top_k()` uses embedding similarity to select relevant skills rather than injecting the entire library — critical once the Skillbook grows beyond a few dozen entries.

### Planning-with-Files

[Planning-with-files](../projects/planning-with-files.md) applies the skill concept to working memory management rather than domain knowledge. It defines three persistent markdown files (`task_plan.md`, `findings.md`, `progress.md`) and enforces their use through lifecycle hooks that fire at tool-call boundaries.

The `PreToolUse` hook is the central mechanism:
```yaml
PreToolUse:
  - matcher: "Write|Edit|Bash|Read|Glob|Grep"
    hooks:
      - type: command
        command: "cat task_plan.md 2>/dev/null | head -30 || true"
```

This re-injects the first 30 lines of the task plan before every tool call — the computational equivalent of re-reading your todo list before each action. It counteracts the "lost in the middle" effect where agents drift from original goals after 50+ tool calls, a phenomenon documented in Manus AI's context engineering work.

Evaluation using Anthropic's skill-creator framework showed a 90-percentage-point improvement in task completion (96.7% vs. 6.7% pass rate on 30 assertions). The improvement comes from process discipline, not additional domain knowledge.

### Obsidian Skills

[obsidian-skills](../projects/obsidian-skills.md), authored by Obsidian CEO Steph Ango, demonstrates skills as a vendor distribution channel. The five-skill package teaches agents to produce valid Obsidian Markdown, Bases (`.base`), and JSON Canvas (`.canvas`) files — entirely through structured documentation with zero executable code.

This pattern has broad implications: any vendor with a proprietary file format or API can create an official skill package rather than building custom integrations per AI platform. The format portability across six major runtimes makes this a viable alternative to MCP tools for knowledge-heavy domains where typed function signatures add little value.

The Obsidian Bases skill illustrates the anti-pattern documentation technique: the `Duration` type's lack of `.round()` support (requiring `.days.round(0)` instead) is documented three times across the skill files, because it is the most common LLM-generated error. Repetition-for-emphasis is a deliberate strategy for LLM-consumed documentation.

### Memento-Skills

[Memento-Skills](../projects/memento-skills.md) provides the most complete implementation of case-based reasoning for LLM agents. Model parameters stay frozen; all adaptation happens in external skill memory through a Read-Execute-Reflect-Write loop. The Reflection phase uses five decision outcomes — CONTINUE, IN_PROGRESS, REPLAN, FINALIZE, ASK_USER — with hard budget overrides (max 5 ReAct iterations per step, max 2 replans per run) to prevent infinite retry loops.

The system distinguishes `KNOWLEDGE` mode skills (SKILL.md provides context, agent uses built-in tools) from `PLAYBOOK` mode skills (directory contains executable scripts), inferred automatically from directory contents. Retrieval uses BM25 + semantic vector hybrid search with local-first reranking.

Evaluation on HLE and GAIA benchmarks shows performance improving over self-evolution rounds as the skill library grows from atomic capabilities into learned composite skills.

## The SKILL.md Format: Full Specification

Beyond the two required frontmatter fields, the spec supports:

| Field | Description |
|-------|-------------|
| `license` | License name or reference |
| `compatibility` | Environment requirements (OS, packages, network) |
| `metadata` | Arbitrary key-value map (author, version, etc.) |
| `allowed-tools` | Space-delimited pre-approved tool list (experimental) |

The `allowed-tools` field (`Bash(git:*) Read Write`) is the spec's nascent governance mechanism — skills can declare which tools they need pre-approved, reducing per-invocation permission prompts. Support varies across runtimes.

Naming rules are strict: lowercase letters, numbers, and hyphens only; directory name must exactly match the `name` field; 1–64 characters. Validation via `skills-ref validate ./my-skill`.

## Relationship to Memory Architecture

Skills map cleanly onto [procedural memory](../concepts/procedural-memory.md) in cognitive architectures — stored procedures for how to accomplish tasks, distinct from episodic memory (conversation history) and semantic memory (factual knowledge).

The ACE implementation extends this into genuine learning: each execution creates an episode, reflection extracts a procedure, the SkillManager encodes it as a reusable skill. This mirrors the hippocampal-to-neocortical consolidation model in neuroscience, with the Reflector acting as the consolidation process that distills episodic traces into generalized procedures.

[Progressive disclosure](../concepts/progressive-disclosure.md) across the three tiers (metadata → instructions → resources) corresponds to different memory access patterns: always-available indices, on-demand retrieval of full procedures, and lazy loading of reference material.

## Genuine Strengths

**Token efficiency at scale**: A skill library of 50+ skills remains tractable because only metadata lives permanently in context. The claude-api skill demonstrates this — 20+ reference files, single-digit token cost for the common case.

**Portability without lock-in**: The same SKILL.md works across six major agent runtimes. Vendors write once, agents everywhere read it.

**Composability with deterministic operations**: The bundled-scripts pattern separates judgment (instructions) from computation (scripts), keeping context clean while enabling complex multi-step operations.

**Measurable improvement loops**: The skill-creator framework and ACE's Reflector both provide evaluation infrastructure. Skills can be improved empirically, not just intuitively.

## Critical Limitations

**Undertriggering is the primary failure mode**: Description-only triggering is elegant but fragile. Complex trigger conditions (detect Python imports, check file extensions, verify project type) cannot be expressed at the trigger layer — they must be re-implemented as conditional logic inside the skill body after activation. This means a skill may load when it should not or fail to load when it should.

**Unspoken infrastructure assumption**: The hook-based lifecycle mechanisms (PreToolUse, PostToolUse, Stop) only work in runtimes that implement the hooks specification. A skill relying on hooks for its core behavior silently degrades to documentation-only mode in runtimes that do not support them, with no warning to the user.

**Context budget exhaustion under concurrency**: When multiple skills are relevant to a complex task, loading several simultaneously can consume 20K+ tokens before any actual work begins. There is no mechanism for inter-skill priority negotiation or selective unloading.

**Static skills cannot learn from runtime failures**: The Anthropic reference implementation provides development-time improvement loops but no runtime evolution. A skill that fails in production stays failed until a human runs the eval loop and updates the file. Only ACE and Memento-Skills address this, at the cost of significant additional infrastructure.

## When Not to Use Agent Skills

**Real-time requirements**: The three-tier loading pattern adds latency. For sub-second response requirements, loading skill files on activation is too slow.

**Highly dynamic domains**: Skills encode knowledge as of their last update. Domains where the correct approach changes weekly (live API specifications, rapidly evolving frameworks) require either frequent skill updates or a RAG pipeline over current documentation.

**Simple, well-defined tasks**: The planning-with-files benchmarks showed that simple queries ("read this PDF") do not trigger skills because the base model handles them directly. Skills provide value on complex, multi-step, specialized tasks. For straightforward tasks, skill infrastructure adds overhead with no benefit.

**Teams without skill maintenance capacity**: A skill library that grows through automated evolution (ACE, Memento-Skills) or that never gets updated becomes a liability. Stale skills that trigger on current tasks inject outdated instructions. Skills require ongoing curation.

## Unresolved Questions

**Governance at scale**: The marketplace model enables distribution but provides no mechanism for version pinning, security review, or trust attestation. A skill downloaded from a cloud catalogue executes in the agent's context — the attack surface for indirect prompt injection through skill content is not formally addressed in any current implementation.

**Inter-skill communication**: Skills cannot share state, read each other's outputs, or trigger each other. Complex workflows that require multiple skills operating on shared data must either flatten everything into one skill (violating the separation principle) or rely on the agent to manually coordinate outputs between sequential skill activations.

**Cost of systematic description optimization**: The skill-creator's full description optimization loop (20 queries × 3 runs × 5 iterations = 300 LLM calls) makes trigger reliability expensive to measure. There is no lightweight monitoring mechanism for detecting trigger drift in production as task distributions shift.

**Skill versioning and rollback**: The spec includes an optional `metadata` field where version can be stored, but there is no standardized version management, dependency declaration between skills, or rollback mechanism when a skill update degrades performance.

## Alternatives

**MCP (Model Context Protocol)**: Use when you need typed function schemas, structured I/O validation, and bidirectional communication. MCP tools enforce correctness through types; skills rely on LLM comprehension. Skills are simpler to author; MCP is more reliable for complex integrations.

**RAG over documentation**: Use when the knowledge domain updates faster than you can maintain skill files, or when coverage breadth matters more than precision. RAG handles arbitrary knowledge; skills encode curated procedures. Skills produce more consistent agent behavior; RAG provides fresher information.

**Fine-tuning**: Use when you need capability improvements that persist across all tasks without any runtime overhead, and when you have sufficient training data. Fine-tuning bakes knowledge into parameters permanently; skills provide it at inference time. Skills are cheaper to update and require no training infrastructure.

**System prompt injection**: Use for small teams with a single agent runtime, simple knowledge requirements, and no need for portability. System prompts are simpler to manage than a skill library; skills are necessary when knowledge scope exceeds what fits in a monolithic prompt or when multiple runtimes share the same knowledge.


## Related

- [Claude Code](../projects/claude-code.md) — implements (0.7)
- [Anthropic](../projects/anthropic.md) — implements (0.6)
- [Claude](../projects/claude.md) — implements (0.6)
- [Cursor](../projects/cursor.md) — implements (0.5)
- [OpenCode](../projects/opencode.md) — implements (0.5)
- [OpenAI Codex](../projects/codex.md) — implements (0.5)
- [Google Gemini](../projects/gemini.md) — implements (0.4)
- [skill.md](../concepts/skill-md.md) — implements (0.9)
- [Procedural Memory](../concepts/procedural-memory.md) — implements (0.7)
- [Progressive Disclosure](../concepts/progressive-disclosure.md) — implements (0.6)
- [GPT-4](../projects/gpt-4.md) — implements (0.4)
- [GitHub Copilot](../projects/github-copilot.md) — implements (0.4)
- [Voyager](../projects/voyager.md) — implements (0.8)
- [Compositional Skill Synthesis](../concepts/compositional-skill-synthesis.md) — implements (0.8)
