---
entity_id: skill-md
type: concept
bucket: agent-memory
abstract: >-
  skill.md is a Markdown file convention for storing reusable agent procedures
  that LLMs can read, trigger from context, and execute on demand —
  distinguished by progressive disclosure loading that keeps idle skill
  knowledge out of the context window.
sources:
  - tweets/akshay-pachaar-how-to-setup-your-claude-code-project-tl-dr-mos.md
  - repos/alirezarezvani-claude-skills.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - deep/repos/garrytan-gstack.md
  - deep/repos/anthropics-skills.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
related:
  - claude-code
  - claude
  - cursor
last_compiled: '2026-04-06T02:04:55.802Z'
---
# skill.md

**Type:** Convention / File Format
**Bucket:** Agent Memory → Procedural Memory
**Implements:** [Claude Code](../projects/claude-code.md), [Claude](../projects/claude.md), [Cursor](../projects/cursor.md)

---

## What It Is

A `SKILL.md` file is a Markdown document that packages procedural knowledge — instructions, context, and references — into a self-contained unit that an agent can load and execute on demand. The file lives in a named folder (`skill-name/SKILL.md`), uses YAML frontmatter for a `name` and `description`, and contains the full how-to instructions in its body.

The format is a convention, not a runtime specification. There is no interpreter, no type system, no execution engine. The agent reads the file, follows the instructions, and uses any bundled scripts or reference documents as directed. The "skill" is the structured prose, not compiled code.

This distinguishes SKILL.md from tool calls (which execute functions and return outputs) and from system prompts (which are always loaded). A skill is loaded conditionally, only when the agent decides it is relevant.

---

## Why It Matters

LLM agents face a hard tradeoff: rich procedural knowledge costs context tokens, but agents need that knowledge to perform specialized tasks well. Baking all domain knowledge into a system prompt wastes context on irrelevant procedures. Leaving it out produces worse task execution.

SKILL.md resolves this through **conditional loading**: the agent carries only a tiny description of each skill in its available context, loads the full instructions only when triggered, and fetches bundled resources on demand within execution. A system with 200 skills pays maybe a few hundred tokens for the full registry but only loads the 1-2 skill bodies actually needed per conversation.

[Anthropic's canonical implementation](../raw/deep/repos/anthropics-skills.md) formalizes this as three-tier progressive disclosure:

- **Tier 1 (always resident, ~100 tokens):** The `name` and `description` frontmatter fields
- **Tier 2 (loaded on trigger, <5000 tokens / ~500 lines):** The SKILL.md body with full procedural instructions
- **Tier 3 (fetched on demand, unlimited):** Bundled scripts, reference files, templates, assets

This is the same insight behind [Progressive Disclosure](../concepts/progressive-disclosure.md) in UI design applied to context management: defer expensive information until the user (or agent) actually needs it.

---

## How It Works

### The File Structure

A minimal skill looks like this:

```markdown
---
name: code-review
description: Conducts a structured code review focusing on correctness, 
security, and maintainability. Trigger when reviewing diffs or PRs.
---

## Review Process

1. Check for N+1 queries, trust boundary violations, and retry logic flaws
2. Run security scan against OWASP Top 10
3. Verify test coverage matches changed paths
4. Output findings as structured JSON with severity scores

## Reference
See `./security-checklist.md` for full OWASP criteria.
```

The `name` must match the parent directory name. The `description` is the triggering mechanism — it is the only thing the agent reads before deciding whether to load the rest.

### Triggering

Triggering is semantic, not programmatic. The agent reads all skill descriptions and decides whether a given user request warrants loading a skill's full body. This makes description quality the single most important factor in whether a skill actually gets used.

Effective descriptions are specific about when to trigger. [Anthropic's claude-api skill](../raw/deep/repos/anthropics-skills.md) demonstrates this pattern:

```
TRIGGER when: code imports `anthropic`/`@anthropic-ai/sdk`
DO NOT TRIGGER when: code imports `openai` or other AI SDK
```

Vague descriptions cause undertriggering. The agent simply does not invoke skills it cannot confidently match to the task at hand.

### Bundled Resources

Skills can include scripts, reference documents, and assets in the same directory. The SKILL.md body tells the agent when to invoke each resource. Critically, bundled scripts execute without entering the context window — only their outputs are loaded. This is a significant optimization for deterministic operations like file conversion, validation, or schema checking.

Anthropic's PDF skill bundles eight Python scripts (form extraction, fill, validate, convert) and tells Claude when to call each. The scripts never appear in context; only the results do.

### The Frontmatter Schema

Per the agentskills.io specification:
- `name` — required, 1-64 chars, lowercase + hyphens, must match parent directory
- `description` — required, 1-1024 chars, the triggering text
- `license` — optional
- `compatibility` — optional, environment requirements
- `metadata` — optional, arbitrary key-value map
- `allowed-tools` — optional, experimental; pre-approved tool list (e.g., `Bash(git:*) Read`)

The `allowed-tools` field is nascent governance infrastructure: skills can declare which tools they are permitted to use, letting the runtime enforce least-privilege execution. Support varies across agent implementations.

---

## Who Implements It

**[Claude](../projects/claude.md) and [Claude Code](../projects/claude-code.md):** [Anthropic's skills repository](../raw/deep/repos/anthropics-skills.md) is the canonical reference implementation. Skills install via `claude /plugin marketplace add anthropics/skills`. Claude.ai supports custom skill upload for paid plans. The API supports skills via a dedicated endpoint.

**[Cursor](../projects/cursor.md):** Supports SKILL.md files in the `.cursor/skills/` directory as part of its rules and context system. Skills trigger based on description matching during conversations.

**gstack (Garry Tan's Claude Code setup):** The most developed SKILL.md system in the wild. [gstack](../raw/deep/repos/garrytan-gstack.md) encodes 23+ specialist roles (CEO, Staff Engineer, QA Lead, Chief Security Officer, Release Engineer) as SKILL.md files, sequenced into a `Think > Plan > Build > Review > Test > Ship > Reflect` sprint pipeline. Each skill's output feeds the next skill's context via shared filesystem artifacts.

gstack adds two patterns not in the canonical spec:

1. **SKILL.md.tmpl templates** — human-authored prose with machine-filled placeholders (`{{COMMAND_REFERENCE}}`, `{{PREAMBLE}}`, `{{QA_METHODOLOGY}}`). Generated files are committed to git; CI validates freshness. This prevents documentation drift between skill instructions and the tools they reference.

2. **The preamble injection** — every skill starts with a `{{PREAMBLE}}` block that injects update checks, session tracking, operational self-improvement hooks, and a search-before-building directive. This turns the preamble into cross-cutting infrastructure rather than per-skill boilerplate.

---

## Relationship to Other Memory Types

SKILL.md is [Procedural Memory](../concepts/procedural-memory.md) made explicit and portable. It externalizes "how to do X" from model weights into readable, versionable files.

Compared to adjacent patterns:

- **[claude.md](../concepts/claude-md.md):** Always-loaded configuration (persona, preferences, project context). SKILL.md loads conditionally. The two are complementary — `CLAUDE.md` sets the stage, skills provide specialized procedures.
- **[Episodic Memory](../concepts/episodic-memory.md):** Stores what happened in past sessions. SKILL.md stores how to do things. gstack's `/learn` skill bridges these by writing operational learnings from past sessions into a JSONL store that future sessions read.
- **[Semantic Memory](../concepts/semantic-memory.md):** Stores domain facts. SKILL.md stores procedures. A skill might reference semantic memory (documentation, schemas) but is itself procedural.
- **[RAG](../concepts/rag.md):** Retrieves relevant documents from a corpus. Skill triggering is similar — matching a query to a skill description — but skills load complete procedural packages, not document fragments.

---

## Practical Implications

### For Skill Authors

Description quality is the highest-leverage decision. A skill with imprecise instructions but a clear description will be invoked and attempt the task. A skill with perfect instructions but a vague description will never run.

Keep SKILL.md bodies under 500 lines (roughly 5000 tokens). Beyond this, context pressure from multiple simultaneously active skills becomes problematic. Move reference material to bundled files and tell the skill body when to fetch them.

Use scripts for deterministic operations. If a task is algorithmic — format conversion, validation, schema checking — write a script. The script executes without consuming context tokens for its code.

### For System Designers

Skill registry size has a phase transition. [Research from the agent skills survey](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md) documents that beyond some critical library size, routing accuracy degrades sharply. Flat registries do not scale. Plan for hierarchical organization (categories, sub-categories, meta-skills for routing) before the registry grows large.

The 26.1% vulnerability rate in community-contributed skills (from analysis of 42,447 skills across major marketplaces) means open skill ecosystems need security gates. Skills with executable scripts are 2.12x more vulnerable than instruction-only skills. The proposed four-tier trust governance model gates dangerous capabilities behind verification before allowing script execution.

### The Composition Problem

SKILL.md has no formal composition mechanism. Skills cannot declare dependencies on other skills, inherit from parent skills, or pass structured outputs to downstream skills. gstack works around this through implicit filesystem coupling — one skill writes artifacts that the next skill reads — but this is convention, not specification.

Agents like [Voyager](../projects/voyager.md) and systems like [Agent Workflow Memory](../projects/agent-workflow-memory.md) demonstrate skill composition through code generation (skills that produce new skills) rather than static file linking. This closes the loop on skill evolution but produces opaque, weight-internal skills that cannot be audited.

---

## Strengths

**Portable and inspectable.** A SKILL.md file is a text file. It git-blames cleanly, diffs cleanly, and any team member can read it. Learned agent behaviors in model weights cannot be audited this way.

**Context-efficient at scale.** Progressive disclosure lets agents "know about" hundreds of skills at metadata cost while paying full context only for active skills. This scales in a way that monolithic system prompts cannot.

**Multi-surface.** The same SKILL.md works across Claude Code, Claude.ai, the API, and third-party agents that implement the spec. gstack extends this to eight different agent hosts via typed config files in `hosts/`.

**Self-improving with the right architecture.** Anthropic's `skill-creator` meta-skill runs a full eval-driven development loop: draft, test with subagents, grade via LLM-as-judge, iterate on description for trigger reliability. This is skill authoring as software engineering, with measurement.

---

## Critical Limitations

**Undertriggering is the default failure mode.** When skills fail, they usually fail silently — the agent simply does not invoke the skill, handles the task without specialized knowledge, and produces mediocre output. There is no monitoring primitive for trigger rates. You do not know a skill is failing to trigger until you audit outputs.

**No runtime evolution.** Skills are static files. An agent cannot modify a SKILL.md based on what it learned mid-session. gstack's `/learn` skill captures operational learnings to a JSONL store for future sessions, but the skill instructions themselves cannot update. Compare this to [Self-Improving Agents](../concepts/self-improving-agents.md) where the agent rewrites its own procedures.

**Unspoken infrastructure assumption: a reliable filesystem.** The entire pattern assumes the agent can read files from a predictable location. This holds for local development (Claude Code, Cursor) but breaks in stateless serverless deployments, sandboxed execution environments, or multi-machine agent clusters where the filesystem is not shared. gstack explicitly warns that its multi-machine scaling limitation stems from agents on different machines operating in filesystem silos.

---

## When NOT to Use It

**Stateless or sandboxed deployments.** If your agent runtime does not have persistent filesystem access, SKILL.md cannot load its bundled resources. The pattern degrades to prompt injection without the resource layer.

**Tasks requiring skill evolution.** If the agent needs to improve its own procedures based on task outcomes, SKILL.md's static nature is a hard constraint. Use [Reflexion](../concepts/reflexion.md)-style loops or weight-updating approaches instead.

**High-velocity skill registries without governance.** If you plan to open skill contributions to a community, the 26.1% vulnerability rate means you need security infrastructure before launch, not after. Building the trust model retroactively is much harder.

**Team-scale deployments without shared memory.** Multiple agents on multiple machines each reading their local skill files will diverge. Without a shared semantic layer ([Graphiti](../projects/graphiti.md), [Zep](../projects/zep.md), or similar), skills provide local procedural consistency but not cross-agent coordination.

---

## Unresolved Questions

**Trigger rate monitoring in production.** No current implementation exposes metrics for how often each skill triggers, how often it should have triggered but did not, or whether description changes improved trigger rates. The skill-creator's description optimizer runs during development, not continuously.

**Skill conflict resolution.** When two skills have overlapping descriptions and both trigger for the same query, there is no specified resolution mechanism. Implementations handle this ad-hoc or by loading both.

**Team-scale governance.** The spec defines a trust model (four tiers: community, verified, certified, trusted) but no implementation ships it. Who runs the verification gates? What is the appeals process? How are revoked skills handled in running sessions?

**Cost at scale.** Skill loading costs tokens. For agents that run hundreds of tasks per day, the aggregate context cost of loading skill bodies (even with progressive disclosure) is non-trivial. There is no published cost analysis for large skill ecosystems.

---

## Alternatives

- **[claude.md](../concepts/claude-md.md):** Use when knowledge should always be in context, not conditionally loaded. Good for project conventions, persona, and persistent preferences.
- **[MCP (Model Context Protocol)](../concepts/mcp.md):** Use when you need tool connectivity (external APIs, databases, services) rather than procedural instructions. Skills and MCP compose well together.
- **[Agent Workflow Memory](../projects/agent-workflow-memory.md):** Use when you want workflows extracted automatically from successful agent trajectories rather than authored by hand.
- **[Voyager](../projects/voyager.md):** Use when skills need to be generated and composed programmatically in a code execution environment rather than authored as Markdown.
- **[DSPy](../projects/dspy.md):** Use when you want prompt optimization (including skill-like modules) driven by metrics rather than human authoring.

---

## Related Concepts

- [Procedural Memory](../concepts/procedural-memory.md)
- [Agent Memory](../concepts/agent-memory.md)
- [Progressive Disclosure](../concepts/progressive-disclosure.md)
- [Context Engineering](../concepts/context-engineering.md)
- [Self-Improving Agents](../concepts/self-improving-agents.md)
- [claude.md](../concepts/claude-md.md)
- [Model Context Protocol](../concepts/mcp.md)
